/**
 * Created by Stephen on 9/28/2015.
 */

'use strict'

const connectionModule = ((() => {
  // private

  const cppDriver = require('./bootstrap')
  const driverModule = require('./driver').driverModule
  const procedureModule = require('./procedure').procedureModule
  const notifyModule = require('./notifier').notifyModule
  const tableModule = require('./table').tableModule
  const userModule = require('./user').userModule
  const metaModule = require('./meta').metaModule

  const sqlMeta = new metaModule.Meta()
  const userTypes = new userModule.SqlTypes()

  function ConnectionWrapper (driver, defCb, name) {
    const defaultCallback = defCb
    const id = name
    const driverMgr = driver
    const inst = this
    const notifier = new notifyModule.NotifyFactory()
    // var filterNonCriticalErrors = false
    let dead = false
    let useUTC = true

    function getUserTypeTable (name, callback) {
      const mapFn = sql => {
        let schemaName = 'dbo'
        let unqualifiedTableName = name
        const schemaIndex = name.indexOf('.')
        if (schemaIndex > 0) {
          schemaName = name.substr(0, schemaIndex)
          unqualifiedTableName = name.substr(schemaIndex + 1)
        }
        sql = sql.replace(/<user_type_name>/g, unqualifiedTableName)
        sql = sql.replace(/<schema_name>/g, schemaName)
        return sql
      }

      sqlMeta.getUserType(this, name, mapFn).then(res => {
        callback(null, new userTypes.Table(name, res))
      }).catch(err => {
        callback(err, null)
      })
    }

    function tableMgr () {
      return t
    }

    function setUseUTC (utc) {
      useUTC = utc
      driverMgr.setUseUTC(utc)
    }

    function procedureMgr () {
      return p
    }

    function close (immediately, callback) {
      if (dead) {
        return
      }

      // require only callback
      if (typeof immediately === 'function') {
        callback = immediately
      } else if (typeof immediately !== 'boolean' && immediately !== undefined) {
        throw new Error('[msnodesql] Invalid parameters passed to close.')
      }

      callback = callback || defaultCallback

      dead = true
      driverMgr.close(err => {
        setImmediate(() => {
          driverMgr.emptyQueue()
          callback(err)
        })
      })
    }

    function queryRawNotify (notify, queryOrObj, chunky) {
      const queryObj = notifier.validateQuery(queryOrObj, useUTC, 'queryRaw')
      driverMgr.readAllQuery(notify, queryObj, chunky.params, chunky.callback)
    }

    function queryNotify (notify, queryOrObj, chunky) {
      notifier.validateQuery(queryOrObj, useUTC, 'query')

      const onQueryRaw = (err, results, more) => {
        if (chunky.callback) {
          if (err) {
            chunky.callback(err, null, more)
          } else {
            chunky.callback(err, driverMgr.objectify(results), more)
          }
        }
      }

      if (chunky.callback) {
        return queryRawNotify(notify, queryOrObj, notifier.getChunkyArgs(chunky.params, (err, results, more) => {
          setImmediate(() => {
            onQueryRaw(err, results, more)
          })
        }))
      } else {
        queryRawNotify(notify, queryOrObj, chunky)
      }
    }

    function queryRaw (queryOrObj, paramsOrCallback, callback) {
      if (dead) {
        throw new Error('[msnodesql] Connection is closed.')
      }

      const notify = new notifier.StreamEvents()
      notify.setConn(this)
      notify.setQueryObj(queryOrObj)
      const chunky = notifier.getChunkyArgs(paramsOrCallback, callback)
      if (!chunky.callback) {
        queryRawNotify(notify, queryOrObj, chunky)
      } else {
        queryRawNotify(notify, queryOrObj, notifier.getChunkyArgs(chunky.params, (err, results, more) => {
          setImmediate(() => {
            chunky.callback(err, results, more)
          })
        }))
      }
      return notify
    }

    function query (queryOrObj, paramsOrCallback, callback) {
      if (dead) {
        throw new Error('[msnodesql] Connection is closed.')
      }

      const notify = new notifier.StreamEvents()
      notify.setConn(this)
      notify.setQueryObj(queryOrObj)
      const chunky = notifier.getChunkyArgs(paramsOrCallback, callback)
      queryNotify(notify, queryOrObj, chunky)
      return notify
    }

    function beginTransaction (callback) {
      if (dead) {
        throw new Error('[msnodesql] Connection is closed.')
      }
      callback = callback || defaultCallback

      driverMgr.beginTransaction(callback)
    }

    function cancelQuery (notify, callback) {
      if (dead) {
        throw new Error('[msnodesql] Connection is closed.')
      }
      const qid = notify.getQueryId()
      const qo = notify.getQueryObj()
      const polling = qo.query_polling || false
      callback = callback || defaultCallback
      const paused = notify.isPaused()
      const canCancel = paused || polling
      if (!canCancel) {
        setImmediate(() => {
          callback(new Error('Error: [msnodesql] cancel only supported for statements where polling is enabled.'))
        })
      } else {
        driverMgr.cancel(qid, (e) => {
          notify.emit('done')
          callback(e)
        })
      }
    }

    function commit (callback) {
      if (dead) {
        throw new Error('[msnodesql] Connection is closed.')
      }

      callback = callback || defaultCallback

      driverMgr.commit(callback)
    }

    function rollback (callback) {
      if (dead) {
        throw new Error('[msnodesql] Connection is closed.')
      }

      callback = callback || defaultCallback

      driverMgr.rollback(callback)
    }

    // inform driver to prepare the sql statement and reserve it for repeated use with parameters.

    function PreparedStatement (preparedSignature, connection, preparedNotifier, preparedMeta) {
      const meta = preparedMeta
      const notify = preparedNotifier
      const cw = connection
      let active = true
      const signature = preparedSignature

      function getMeta () {
        return meta
      }

      function getSignature () {
        return signature
      }

      function getId () {
        return notify.getQueryId()
      }

      function preparedQuery (paramsOrCallback, callback) {
        if (!active) {
          if (callback) {
            callback(new Error('error; prepared statement has been released.'))
          }
        }
        const chunky = notifier.getChunkyArgs(paramsOrCallback, callback)

        const onPreparedQuery = (err, results, more) => {
          if (chunky.callback) {
            if (err) {
              chunky.callback(err)
            } else {
              chunky.callback(err, driverMgr.objectify(results), more)
            }
          }
        }

        if (chunky.callback) {
          driverMgr.readAllPrepared(notify, {}, chunky.params, onPreparedQuery)
        } else {
          driverMgr.readAllPrepared(notify, {}, chunky.params)
        }

        return notify
      }

      const free = callback => {
        driverMgr.freeStatement(notify.getQueryId(), err => {
          active = false
          if (callback) {
            callback(err)
          }
        })
      }

      return {
        preparedQuery: preparedQuery,
        meta: meta,
        connection: cw,
        free: free,
        getMeta: getMeta,
        getSignature: getSignature,
        getId: getId
      }
    }

    function prepare (queryOrObj, callback) {
      const notify = new notifier.StreamEvents()
      notify.setConn(this)
      notify.setQueryObj(queryOrObj)
      const chunky = notifier.getChunkyArgs(callback)
      queryOrObj = notifier.validateQuery(queryOrObj, useUTC, 'prepare')

      const onPrepare = (err, meta) => {
        const prepared = new PreparedStatement(queryOrObj.query_str, inst, notify, meta)
        chunky.callback(err, prepared)
      }

      driverMgr.prepare(notify, queryOrObj, onPrepare)

      return notify
    }

    const publicApi = {
      id: id,
      getUserTypeTable: getUserTypeTable,
      cancelQuery: cancelQuery,
      queryNotify: queryNotify,
      queryRawNotify: queryRawNotify,
      close: close,
      queryRaw: queryRaw,
      query: query,
      beginTransaction: beginTransaction,
      commit: commit,
      rollback: rollback,
      tableMgr: tableMgr,
      procedureMgr: procedureMgr,
      prepare: prepare,
      setUseUTC: setUseUTC
    }

    const t = new tableModule.TableMgr(publicApi, sqlMeta, userTypes)
    const p = new procedureModule.ProcedureMgr(publicApi, notifier, driverMgr, sqlMeta)

    return publicApi
  }

  let nextID = 0

  function getConnectObject (p) {
    return typeof (p) === 'string'
      ? {
        conn_str: p,
        connect_timeout: 0
      }
      : p
  }

  function openFrom (parentFn, params, callback) {
    function PrivateConnection (p, cb, id) {
      const defaultCallback = err => {
        if (err) {
          throw new Error(err)
        }
      }

      let callback2 = cb
      const native = new cppDriver.Connection()
      const driverMgr = new driverModule.DriverMgr(native)
      const nf = new notifyModule.NotifyFactory()
      const connection = new ConnectionWrapper(driverMgr, defaultCallback, id)
      connection.setUseUTC(true)
      const connectObj = p

      const open = () => {
        nf.validateParameters(
          [
            {
              type: 'string',
              value: connectObj.conn_str,
              name: 'connection string'
            },
            {
              type: 'function',
              value: callback,
              name: 'callback'
            }
          ],
          parentFn
        )

        callback2 = callback2 || defaultCallback

        const queueCb = err => {
          setImmediate(() => {
            if (Array.isArray(err) && err.length === 1) {
              callback2(err[0], connection)
            } else {
              callback2(err, connection)
            }
          })
        }

        native.open(connectObj, queueCb)
      }

      this.id = connection.id
      this.connection = connection
      this.open = open

      return this
    }

    const c = new PrivateConnection(getConnectObject(params), callback, nextID)
    nextID += 1
    c.open()

    return c.connection
  }

  function queryCloseOnDone (fn, action, connectDetails, queryOrObj, paramsOrCallback, callback) {
    let thisConn
    const nf = new notifyModule.NotifyFactory()
    const args = nf.getChunkyArgs(paramsOrCallback, callback)
    const notify = new nf.StreamEvents()

    const complete = (err, res, more) => {
      if (!more && thisConn !== null) {
        thisConn.close(() => {
          notify.emit('closed', notify.getQueryId())
          if (args.callback !== null) {
            args.callback(err, res, more)
          }
        })
      } else {
        if (args.callback !== null) {
          args.callback(err, res, more)
        }
      }
    }

    const args2 = {
      params: args.params,
      callback: complete
    }

    const go = (err, conn) => {
      notify.setConn(conn)
      notify.setQueryObj(queryOrObj)
      thisConn = conn
      notify.emit('open', notify.getQueryId())
      if (err) {
        args2.callback(err, null)
      } else {
        action(conn, notify, args2)
      }
    }

    nf.validateQuery(queryOrObj, true, fn)
    openFrom(fn, connectDetails, go)
    return notify
  }

  function query (connectDetails, queryOrObj, paramsOrCallback, callback) {
    return queryCloseOnDone('query', (conn, notify, args) => conn.queryNotify(notify, queryOrObj, args), connectDetails, queryOrObj, paramsOrCallback, callback)
  }

  function queryRaw (connectDetails, queryOrObj, paramsOrCallback, callback) {
    return queryCloseOnDone('queryRaw', (conn, notify, args) => conn.queryRawNotify(notify, queryOrObj, args), connectDetails, queryOrObj, paramsOrCallback, callback)
  }

  function open (params, callback) {
    return openFrom('open', params, callback)
  }

  return {
    meta: sqlMeta,
    userTypes: userTypes,
    query: query,
    queryRaw: queryRaw,
    open: open
  }
})())

exports.connectionModule = connectionModule
