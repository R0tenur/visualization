'use strict'

const metaModule = (() => {
  const fs = require('fs')
  const path = require('path')

  function FileReader (file) {
    let resolvedSql

    function readFile (f) {
      return new Promise((resolve, reject) => {
        fs.readFile(f, 'utf8', (err, contents) => {
          if (err) {
            reject(err)
          } else {
            resolve(contents)
          }
        })
      })
    }

    function resolve () {
      return new Promise((resolve, reject) => {
        if (!resolvedSql) {
          const p = path.join(__dirname, 'queries', file)
          readFile(p).then(sql => {
            resolvedSql = sql
            resolve(resolvedSql)
          }).catch(e => {
            reject(e)
          })
        } else {
          resolve(resolvedSql)
        }
      })
    }

    function query (conn, mapFn) {
      const inst = this
      return new Promise((resolve, reject) => {
        inst.resolve().then(sql => {
          sql = mapFn ? mapFn(sql) : sql
          conn.query(sql, (err, results) => {
            if (err) {
              reject(err)
            } else {
              resolve(results)
            }
          })
        }).catch(e => {
          reject(e)
        })
      })
    }

    return {
      resolve: resolve,
      query: query
    }
  }

  function Meta () {
    const describeProc = new FileReader('proc_describe.sql')
    const describeServerVersion = new FileReader('server_version.sql')
    const describeTableType = new FileReader('user_type.sql')
    const describeTable = new FileReader('table_describe.sql')
    const describeTable2014 = new FileReader('table_describe.2014.sql')

    function getUserType (conn, userTypeName, mapFn) {
      return new Promise((resolve, reject) => {
        describeTableType.query(conn, mapFn).then(typeResults => {
          typeResults.forEach(col => {
            col.type = {
              declaration: col.declaration,
              length: col.length
            }
          })
          resolve(typeResults)
        }).catch(err => {
          reject(err)
        })
      })
    }

    function getProcedureDefinition (conn, procedureName, mapFn) {
      return describeProc.query(conn, mapFn)
    }

    function getServerVersionRes (conn) {
      return describeServerVersion.query(conn)
    }

    function getTableDefinition (conn, majorVersion, mapFn) {
      const target = majorVersion <= 2014 ? describeTable2014 : describeTable
      return target.query(conn, mapFn)
    }

    return {
      getUserType: getUserType,
      getProcedureDefinition: getProcedureDefinition,
      getTableDefinition: getTableDefinition,
      getServerVersionRes: getServerVersionRes
    }
  }

  return {
    Meta: Meta
  }
})()

/*
    provide support to fetch table and procedure meta data, injected into procedure manager and tableManager
  */

exports.metaModule = metaModule
