/**
 * Created by Stephen on 9/27/2015.
 */

'use strict'

const procedureModule = ((() => {
  function BoundProcedure (connectionDriverMgr, procedureNotifier, theConnection, procedureMeta, procedureName, pollingEnabled, procedureTimeout) {
    const conn = theConnection
    const driverMgr = connectionDriverMgr
    const notifier = procedureNotifier
    const meta = procedureMeta
    const name = procedureName
    let timeout = procedureTimeout
    let polling = pollingEnabled

    function setTimeout (t) {
      timeout = t
    }

    function setPolling (b) {
      polling = b
    }

    function getMeta () {
      return meta
    }

    function getName () {
      return name
    }

    function callStoredProcedure (notify, signature, paramsOrCallback, callback) {
      const queryOb = {
        query_str: signature,
        query_timeout: timeout,
        query_polling: polling
      }

      notifier.validateParameters(
        [
          {
            type: 'string',
            value: queryOb.query_str,
            name: 'query string'
          }
        ],
        'callproc'
      )

      notify.setQueryObj(queryOb)
      const chunky = notifier.getChunkyArgs(paramsOrCallback, callback)

      function onProcedureRaw (err, results, outputParams, more) {
        if (chunky.callback) {
          if (err) {
            chunky.callback(err)
          } else {
            chunky.callback(err, driverMgr.objectify(results), more, outputParams)
          }
        }
      }

      if (callback) {
        driverMgr.realAllProc(notify, queryOb, chunky.params, onProcedureRaw)
      } else {
        driverMgr.realAllProc(notify, queryOb, chunky.params)
      }

      return notify
    }

    function paramsArray (params) {
      if (Array.isArray(params)) {
        return params
      }
      return meta.params.reduce((agg, latest) => {
        const name = latest.name.slice(1)
        if (latest.is_output) return agg
        const v = Object.prototype.hasOwnProperty.call(params, name) ? params[name] : null
        agg.push(v)
        return agg
      }, [])
    }

    function bindParams (meta, params) {
      const vec = []
      let j = 0

      for (let i = 0; i < meta.params.length; i += 1) {
        vec[vec.length] = {
          is_output: meta.params[i].is_output,
          type_id: meta.params[i].type_id,
          max_length: meta.params[i].max_length,
          is_user_defined: meta.params[i].is_user_defined,
          val: null
        }
      }

      for (let i = 0; i < params.length; i += 1) {
        while (j < meta.params.length && meta.params[j].is_output === true) {
          j += 1
        }

        if (meta.params[j].is_user_defined) {
          vec[j] = params[i]
        } else {
          vec[j].val = params[i]
        }
        j += 1
      }
      return vec
    }

    function privateCall (notify, params, cb) {
      const paramVec = bindParams(meta, params)
      if (cb) {
        callStoredProcedure(notify, meta.signature, paramVec, (err, results, output) => {
          cb(err, results, output)
        })
      } else {
        callStoredProcedure(notify, meta.signature, paramVec)
      }
    }

    function callNotify (paramsOrCb, fn, notify) {
      let vec
      let cb
      if (Array.isArray(paramsOrCb)) {
        vec = paramsOrCb
        cb = fn
      } else {
        vec = []
        cb = paramsOrCb
      }

      notify.setConn(conn)
      privateCall(notify, vec, cb)
    }

    function call (paramsOrCb, fn) {
      const notify = new notifier.StreamEvents()
      callNotify(paramsOrCb, fn, notify)

      return notify
    }

    return {
      paramsArray: paramsArray,
      call: call,
      callNotify: callNotify,
      setTimeout: setTimeout,
      setPolling: setPolling,
      getMeta: getMeta,
      getName: getName
    }
  }

  function ProcedureMgr (procedureConnection, procedureNotifier, procedureDriverMgr, metaResolver) {
    const cache = {}
    const conn = procedureConnection
    let timeout = 0
    let polling = false
    const driverMgr = procedureDriverMgr
    const notifier = procedureNotifier

    function describeProcedure (procedureName, callback) {
      const ret = {
        is_output: true,
        name: '@returns',
        type_id: 'int',
        max_length: 4,
        order: 0,
        collation: null
      }

      function mapFn (sql) {
        let schemaName = 'dbo'
        let unqualifiedTableName = procedureName
        const schemaIndex = procedureName.indexOf('.')
        if (schemaIndex > 0) {
          schemaName = procedureName.substr(0, schemaIndex)
          unqualifiedTableName = procedureName.substr(schemaIndex + 1)
        }
        sql = sql.replace(/<escaped_procedure_name>/g, unqualifiedTableName)
        sql = sql.replace(/<schema_name>/g, schemaName)
        return sql
      }

      metaResolver.getProcedureDefinition(conn, procedureName, mapFn).then(results => {
        results.unshift(ret)
        callback(null, results)
      }).catch(err => {
        callback(err, null)
      })
    }

    function descp (p) {
      let s = ''
      s += `${p.name} [ ${p.type_id}${p.is_output
        ? ' out '
        : ' in '} ] `
      return s
    }

    function summarise (name, pv) {
      let s = `${descp(pv[0])} ${name}( `
      for (let i = 1; i < pv.length; i += 1) {
        s += descp(pv[i])
        if (i < pv.length - 1) {
          s += ', '
        }
      }
      s += ' ) '
      return s
    }

    function build (pv, name) {
      let q = '{ '
      const len = pv.length
      q += `? = call ${name}(`
      for (let r = 1; r < len; r += 1) {
        q += ' ?'
        if (r < len - 1) {
          q += ', '
        }
      }
      q += ') }'

      return q
    }

    function asSelect (pv, procedure) {
      const params = []
      const parameters = []
      pv.forEach(param => {
        if (param.name !== '@returns') {
          parameters.push(param)
        }
      })

      parameters.forEach(param => {
        if (param.is_output) {
          const s = `${param.name} ${param.type_id}`
          params.push(s)
        }
      })

      let cmdParam = ['@___return___ int'].concat(params).join(', ')
      let cmd = `declare ${cmdParam};`
      cmd += `exec @___return___ = ${procedure} `

      const spp = []
      parameters.forEach(param => {
        if (param.is_output) {
          // output parameter
          cmdParam = `${param.name}=${param.name} output`
          spp.push(cmdParam)
        } else {
          // input parameter
          cmdParam = param.name + '=?'
          spp.push(cmdParam)
        }
      })

      const params2 = []
      parameters.forEach(param => {
        if (param.is_output) {
          let paramName = param.name
          if (paramName[0] === '@') {
            paramName = paramName.substring(1)
          }
          cmdParam = `${param.name} as ${paramName}`
          params2.push(cmdParam)
        }
      })

      const sppJoined = spp.join(', ')
      cmd += sppJoined + ';'
      const selectCmd = `select ${['@___return___ as \'___return___\''].concat(params2).join(', ')}`
      cmd += selectCmd + ';'

      return cmd
    }

    function createProcedure (name, cb) {
      let procedure = cache[name]
      if (!procedure) {
        describeProcedure(name, (err, pv) => {
          if (!err) {
            const signature = build(pv, name)
            const select = asSelect(pv, name)
            const summary = summarise(name, pv)
            const meta = {
              select: select,
              signature: signature,
              summary: summary,
              params: pv
            }

            procedure = new BoundProcedure(driverMgr, notifier, conn, meta, name, polling, timeout)
            cache[name] = procedure
            cb(procedure)
          } else {
            cb(err)
          }
        })
      } else {
        cb(procedure)
      }
    }

    function describe (name, cb) {
      createProcedure(name, p => {
        if (p) {
          cb(p)
        } else {
          cb(new Error(`could not get definition of ${name}`))
        }
      })
    }

    function get (name, cb) {
      createProcedure(name, p => {
        cb(p)
      })
    }

    function callproc (name, paramsOrCb, cb) {
      const notify = new notifier.StreamEvents()
      createProcedure(name, p => {
        p.callNotify(paramsOrCb, cb, notify)
      })
      return notify
    }

    function setTimeout (t) {
      timeout = t
    }

    function clear () {
      Object.keys(cache).forEach(k => {
        delete cache[k]
      })
    }

    function setPolling (b) {
      polling = b
    }

    function getCount () {
      return Object.keys(cache).length
    }

    return {
      setTimeout: setTimeout,
      setPolling: setPolling,
      callproc: callproc,
      describe: describe,
      getCount: getCount,
      clear: clear,
      get: get
    }
  }

  return {
    ProcedureMgr: ProcedureMgr
  }
})())

exports.procedureModule = procedureModule
