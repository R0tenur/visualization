/* global: bindQuery */

'use strict'

const driverModule = ((() => {
  const readerModule = require('./reader').readerModule
  const queueModule = require('./queue').queueModule

  function DriverMgr (sql) {
    const driverCommandEnum = {
      CANCEL: 10,
      COMMIT: 11,
      ROLLBACK: 12,
      BEGIN_TRANSACTION: 13,
      PREPARE: 14,
      FREE_STATEMENT: 15,
      QUERY: 16,
      CLOSE: 17,
      UNBIND: 18
    }

    const cppDriver = sql
    const workQueue = new queueModule.WorkQueue()
    const reader = new readerModule.DriverRead(cppDriver, workQueue)

    function setUseUTC (utc) {
      reader.setUseUTC(utc)
    }

    function emptyQueue () {
      workQueue.emptyQueue()
    }

    function close (callback) {
      workQueue.enqueue(driverCommandEnum.CLOSE, () => {
        cppDriver.close(() => {
          callback()
        })
      }, [])
    }

    function execCancel (qid, queueItem, callback) {
      // send cancel directly to driver.
      const args = queueItem.args
      const cb = args[3]
      const peek = workQueue.peek()
      if (queueItem.operationId === peek.operationId) {
        cppDriver.pollingMode(qid, true, () => {
          cppDriver.cancelQuery(qid, err => {
            setImmediate(() => {
              if (err && err.length > 0) {
                callback(err[0])
              } else {
                callback(null)
              }
            })
          })
        })
      } else {
        workQueue.dropItem(queueItem)
        setImmediate(() => {
          // make a callback on the cancel request with no error.
          callback(null)
          // invoke the listener as if this has come from driver so user query callback can be invoked.
          cb(new Error('Error: [msnodesql] (query removed from q) Operation canceled'))
        })
      }
      return true
    }

    // if this relates to the active query being executed then immediately send
    // the cancel, else the query can be removed from the queue and never submitted to the driver.

    function cancel (qid, callback) {
      if (workQueue.length() === 0) {
        setImmediate(() => {
          callback(new Error(`Error: [msnodesql] cannot cancel query (empty queue) id ${qid}`))
        })
        return
      }

      const first = workQueue.first((idx, currentItem) => {
        if (currentItem.commandType !== driverCommandEnum.QUERY) {
          return false
        }
        const args = currentItem.args
        const notify = args[0]
        const currentQueryId = notify.getQueryId()
        return qid === currentQueryId
      })

      if (first) {
        if (first.paused) {
          freeStatement(qid, () => {
            workQueue.dropItem(first)
            callback(null)
          })
        } else {
          execCancel(qid, first, callback)
        }
      } else {
        setImmediate(() => {
          callback(new Error(`Error: [msnodesql] cannot cancel query (not found) id ${qid}`))
        })
      }
    }

    function objectify (results) {
      const names = {}

      const lim = results.meta
        ? results.meta.length
        : 0

      for (let idx = 0; idx < lim; idx += 1) {
        const meta = results.meta[idx]
        const name = meta.name
        if (name !== '' && !names[name]) {
          names[name] = idx
        } else {
          let extra = 0
          let candidate = `Column${idx}`
          while (names[candidate]) {
            candidate = `Column${idx}_${extra}`
            extra += 1
          }
          names[candidate] = idx
        }
      }

      const rows = []
      if (results.rows) {
        results.rows.forEach(row => {
          const value = {}
          Object.keys(names).forEach(name => {
            if (Object.prototype.hasOwnProperty.call(names, name)) {
              value[name] = row[names[name]]
            }
          })
          rows.push(value)
        })
      }

      return rows
    }

    function freeStatement (queryId, callback) {
      workQueue.enqueue(driverCommandEnum.FREE_STATEMENT, () => {
        cppDriver.freeStatement(queryId, () => {
          callback(queryId)
          workQueue.nextOp()
        })
      }, [])
    }

    function onStatementComplete (queryId, outputParams, callback, results, more) {
      if (!more) {
        freeStatement(queryId, () => {
          if (callback) {
            callback(null, results, more, outputParams)
          }
        })
      } else {
        if (callback) {
          callback(null, results, more, outputParams)
        }
      }
    }

    // for a stored procedure, the out parameters / return value can
    // only be unbound when rest of query completes. The output params
    // will now be ready to fetch out of the statement.

    function beginTransaction (callback) {
      workQueue.enqueue(driverCommandEnum.BEGIN_TRANSACTION, () => {
        cppDriver.beginTransaction(err => {
          callback(err)
          workQueue.nextOp()
        })
      }, [])
    }

    function rollback (callback) {
      workQueue.enqueue(driverCommandEnum.ROLLBACK, () => {
        cppDriver.rollback(err => {
          callback(err)
          workQueue.nextOp()
        })
      }, [])
    }

    function commit (callback) {
      workQueue.enqueue(driverCommandEnum.COMMIT, () => {
        cppDriver.commit(err => {
          callback(err)
          workQueue.nextOp()
        })
      }, [])
    }

    function prepare (notify, queryOrObj, callback) {
      workQueue.enqueue(driverCommandEnum.PREPARE, () => {
        cppDriver.prepare(notify.getQueryId(), queryOrObj, (err, meta) => {
          callback(err, meta)
          workQueue.nextOp()
        })
      }, [])
    }

    function readAllPrepared (notify, queryObj, params, cb) {
      notify.setOperation(workQueue.enqueue(driverCommandEnum.QUERY,
        (notify, query, params, callback) => {
          setImmediate(() => {
            const q = reader.getQuery(notify, query, params, {
              begin: (queryId, query, params, callback) => {
                cppDriver.bindQuery(queryId, params, (err, meta) => {
                  if (callback) {
                    callback(err, meta)
                  }
                })
              },
              end: (queryId, outputParams, callback, results, more) => {
                if (callback) {
                  callback(null, results, more, outputParams)
                }
              }
            }, callback)
            notify.setQueryWorker(q)
            q.begin()
          })
        }, [notify, queryObj, params, cb]))
    }

    function read (notify, queryObj, params, cb) {
      notify.setOperation(workQueue.enqueue(driverCommandEnum.QUERY, (notify, query, params, callback) => {
        setImmediate(() => {
          const q = reader.getQuery(notify, query, params, {
            begin: (queryId, query, params, callback) => cppDriver.query(queryId, query, params, (err, results, more) => {
              if (callback) {
                callback(err, results, more)
              }
            }),
            end: onStatementComplete
          }, callback)
          notify.setQueryWorker(q)
          q.begin()
        })
      }, [notify, queryObj, params, cb]))
    }

    function readAllQuery (notify, queryObj, params, cb) {
      // if paused at head of q then kill this statement to allow driver to set up this one
      const peek = workQueue.peek()
      if (peek && peek.paused) {
        const pausedNotify = peek.args[0]
        freeStatement(pausedNotify.getQueryId(), () => {
          workQueue.dropItem(peek)
          read(notify, queryObj, params, cb)
        })
      } else {
        read(notify, queryObj, params, cb)
      }
    }

    function realAllProc (notify, queryObj, params, cb) {
      notify.setOperation(workQueue.enqueue(driverCommandEnum.QUERY,
        (notify, query, params, callback) => {
          setImmediate(() => {
            const q = reader.getQuery(notify, query, params, {
              begin: (queryId, procedure, params, callback) => cppDriver.callProcedure(queryId, procedure, params, (err, results, params) => {
                if (callback) {
                  callback(err, results, params)
                }
              }),
              // for a stored procedure with multiple statements, only unbind after all
              // statements are completed
              end: (queryId, outputParams, callback, results, endMore) => {
                if (!endMore) {
                  workQueue.enqueue(driverCommandEnum.UNBIND, (a) => {
                    cppDriver.unbind(queryId, (err, outputVector) => {
                      if (err && callback) {
                        callback(err, results)
                      }
                      onStatementComplete(queryId, outputVector, callback, results, a)
                      if (!a) {
                        workQueue.nextOp()
                      }
                    })
                  }, [endMore])
                } else {
                  onStatementComplete(queryId, null, callback, results, endMore)
                }
              }
            }, callback)
            notify.setQueryWorker(q)
            q.begin()
          })
        }, [notify, queryObj, params, cb]))
    }

    return {
      setUseUTC: setUseUTC,
      cancel: cancel,
      commit: commit,
      rollback: rollback,
      beginTransaction: beginTransaction,
      prepare: prepare,
      objectify: objectify,
      freeStatement: freeStatement,
      readAllQuery: readAllQuery,
      realAllProc: realAllProc,
      readAllPrepared: readAllPrepared,
      emptyQueue: emptyQueue,
      close: close
    }
  }

  return {
    DriverMgr: DriverMgr
  }
})())

exports.driverModule = driverModule
