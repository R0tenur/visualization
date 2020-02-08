'use strict'

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const GlobalConn = (() => {
  const connStr = 'set global connection here'

  function getSqlLocalDbPipe (done) {
    const childProcess = require('child_process')
    const oldSpawn = childProcess.spawn

    function mySpawn () {
      //  console.log('spawn called');
      // console.log(arguments);
      return oldSpawn.apply(this, arguments)
    }

    childProcess.spawn = mySpawn

    const extract = a => {
      a = a.trim()
      const idx = a.indexOf('np:')
      if (idx > 0) {
        a = a.substr(idx)
      }
      return a
    }

    const child = childProcess.spawn('sqllocaldb', ['info', 'node'])
    child.stdout.on('data', data => {
      const str = data.toString()
      const arr = str.split('\r')
      arr.forEach(a => {
        const idx = a.indexOf('np:')
        if (idx > 0) {
          const pipe = extract(a)
          setImmediate(() => {
            done(pipe)
          })
        }
      })
      //  Here is where the output goes
    })
    child.stderr.on('data', data => {
      console.log('stderr: ' + data)
      //  Here is where the error output goes
    })
    child.on('close', () => {
      //  console.log('closing code: ' + code);
      //  Here you can get the exit code of the script
    })
    child.on('error', code => {
      console.log('closing code: ' + code)
      process.exit()
      //  Here you can get the exit code of the script
    })
  }

  const driver = 'SQL Server Native Client 11.0'
  const database = 'scratch'

  function getLocalConnStr (done) {
    getSqlLocalDbPipe(pipe => {
      const conn = `Driver={${driver}}; Server=${pipe}; Database={${database}}; Trusted_Connection=Yes;`
      done(conn)
    })
  }

  function init (sql, done, candidateConnStr) {
    const ds = new DemoSupport()

    if (!candidateConnStr) {
      getLocalConnStr(cs => {
        const ret = {
          driver: driver,
          database: database,
          conn_str: cs,
          support: new DemoSupport(sql, cs),
          async: new ds.Async(),
          helper: new ds.EmployeeHelper(sql, cs)
        }
        done(ret)
      })
    } else {
      const ret = {
        driver: driver,
        database: database,
        conn_str: candidateConnStr,
        support: new DemoSupport(sql, candidateConnStr),
        async: new ds.Async(),
        helper: new ds.EmployeeHelper(sql, candidateConnStr)
      }
      done(ret)
    }
  }

  function getConnStr () {
    return connStr
  }

  return {
    init: init,
    getConnStr: getConnStr
  }
})()

function DemoSupport (native) {
  const sql = native

  function Assert () {
    function ifError (err) {
      if (err) {
        console.log('error whilst executing msnodelsqlv8 demo - error is ' + err)
        process.exit()
      }
    }

    function check (test, err) {
      if (!test) {
        console.log('check condition fails in msnodelsqlv8 demo - error is ' + err)
        process.exit()
      }
    }

    this.ifError = ifError
    this.check = check
  }

  function Async () {
    function series (suite, done) {
      let i = 0
      next()

      function next () {
        const fn = suite[i]
        fn(function () {
          iterate()
        })
      }

      function iterate () {
        ++i
        if (i === suite.length) {
          done()
        } else next()
      }
    }

    this.series = series
  }

  function ProcedureHelper (conn) {
    let connStr = conn
    const async = new Async()
    const assert = new Assert()
    let verbose = true

    function createProcedure (procedureName, procedureSql, doneFunction) {
      procedureSql = procedureSql.replace(/<name>/g, procedureName)

      const sequence = [
        asyncDone => {
          let createSql = `IF NOT EXISTS (SELECT *  FROM sys.objects WHERE type = 'P' AND name = '${procedureName}')`
          createSql += ` EXEC ('CREATE PROCEDURE ${procedureName} AS BEGIN SET nocount ON; END')`
          if (verbose) console.log(createSql)
          sql.query(connStr, createSql, () => {
            asyncDone()
          })
        },

        asyncDone => {
          sql.query(connStr, procedureSql,
            function (e) {
              assert.ifError(e, 'Error creating procedure.')
              asyncDone()
            })
        }
      ]

      async.series(sequence,
        () => {
          doneFunction()
        })
    }

    function setVerbose (v) {
      verbose = v
    }

    this.createProcedure = createProcedure
    this.setVerbose = setVerbose
  }

  function EmployeeHelper (native, cstr) {
    const connStr = cstr
    const sql = native
    let verbose = true

    function setVerbose (v) {
      verbose = v
    }

    function extractKey (parsedJSON, key) {
      const keys = []
      parsedJSON.forEach(emp => {
        const obj = {}
        obj[key] = emp[key]
        keys.push(obj)
      })
      return keys
    }

    function dropCreateTable (params, doneFunction) {
      const async = new Async()
      const tableName = params.tableName
      const rootPath = params.rootPath || '../../unit.tests'
      const columnName = params.columnName || 'col1'
      const type = params.type
      const theConnection = params.theConnection
      let insert = false
      if (params.hasOwnProperty('insert')) {
        insert = params.insert
      }
      const assert = new Assert()
      let conn

      function readFile (f, done) {
        if (verbose) console.log('reading ' + f)
        fs.readFile(f, 'utf8', (err, data) => {
          if (err) {
            done(err)
          } else {
            done(data)
          }
        })
      }

      const sequence = [

        function (asyncDone) {
          if (theConnection) {
            conn = theConnection
            asyncDone()
          } else {
            sql.open(connStr, function (err, newConn) {
              assert.ifError(err)
              conn = newConn
              asyncDone()
            })
          }
        },

        function (asyncDone) {
          const dropSql = 'DROP TABLE ' + tableName
          if (verbose) console.log(dropSql)
          conn.query(dropSql, function () {
            asyncDone()
          })
        },

        function (asyncDone) {
          const folder = path.join(__dirname, rootPath)
          let fileName = tableName
          if (fileName.charAt(0) === '#') {
            fileName = fileName.substr(1)
          }
          let file = folder + '/sql/' + fileName
          file += '.sql'

          function inChunks (arr, callback) {
            let i = 0
            if (verbose) console.log(arr[i])
            conn.query(arr[i], next)

            function next (err, res) {
              assert.ifError(err)
              assert.check(res.length === 0)
              ++i
              if (i < arr.length) {
                if (verbose) console.log(arr[i])
                conn.query(arr[i], (err, res) => {
                  next(err, res)
                })
              } else {
                callback()
              }
            }
          }

          // submit the SQL one chunk at a time to create table with constraints.
          readFile(file, createSql => {
            createSql = createSql.replace(/<name>/g, tableName)
            createSql = createSql.replace(/<type>/g, type)
            createSql = createSql.replace(/<col_name>/g, columnName)
            const arr = createSql.split('GO')
            for (let i = 0; i < arr.length; ++i) {
              arr[i] = arr[i].replace(/^\s+|\s+$/g, '')
            }
            inChunks(arr, () => {
              asyncDone()
            })
          })
        },

        asyncDone => {
          if (!insert) {
            asyncDone()
          }
        },

        asyncDone => {
          if (theConnection) {
            asyncDone()
          } else {
            conn.close(() => {
              asyncDone()
            })
          }
        }
      ]

      async.series(sequence,
        () => {
          doneFunction()
        })
    }

    function compareEmployee (res, parsedJSON) {
      assert.strictEqual(res.length, parsedJSON.length)
      for (let i = 0; i < res.length; ++i) {
        let lhs = res[i]
        let rhs = parsedJSON[i]
        rhs.ModifiedDate.nanosecondsDelta = 0
        rhs.BirthDate.nanosecondsDelta = 0
        rhs.HireDate.nanosecondsDelta = 0
        assert.strictEqual(lhs.BusinessEntityID, rhs.BusinessEntityID)
        assert.strictEqual(lhs.NationalIDNumber, rhs.NationalIDNumber)
        assert.strictEqual(lhs.LoginID, rhs.LoginID)
        assert.strictEqual(lhs.OrganizationNode.length, rhs.OrganizationNode.length)
        for (let j = 0; i < lhs.OrganizationNode.length; ++j) {
          assert.strictEqual(lhs.OrganizationNode[j], rhs.OrganizationNode[j])
        }
        assert.strictEqual(lhs.OrganizationLevel, rhs.OrganizationLevel)
        assert.strictEqual(lhs.JobTitle, rhs.JobTitle)
        assert.strictEqual(lhs.MaritalStatus, rhs.MaritalStatus)
        assert.strictEqual(lhs.Gender, rhs.Gender)
        assert.strictEqual(lhs.SalariedFlag, rhs.SalariedFlag)
        assert.strictEqual(lhs.VacationHours, rhs.VacationHours)
        assert.strictEqual(lhs.SickLeaveHours, rhs.SickLeaveHours)
        assert.strictEqual(lhs.CurrentFlag, rhs.CurrentFlag)
        assert.deepStrictEqual(lhs.ModifiedDate, rhs.ModifiedDate)
        assert.deepStrictEqual(lhs.BirthDate, rhs.BirthDate)
        assert.deepStrictEqual(lhs.HireDate, rhs.HireDate)
        assert.strictEqual(lhs.rowguid, rhs.rowguid)
      }
    }

    function getJSON (stem) {
      const p = stem || '../../unit.tests/json'
      const folder = path.join(__dirname, p)
      const fs = require('fs')

      const parsedJSON = JSON.parse(fs.readFileSync(folder + '/employee.json', 'utf8'))

      for (let i = 0; i < parsedJSON.length; ++i) {
        const rec = parsedJSON[i]
        rec.OrganizationNode = Buffer.from(rec.OrganizationNode.data, 'utf8')
        rec.BirthDate = new Date(rec.BirthDate)
        rec.BirthDate.nanosecondsDelta = 0
        rec.HireDate = new Date(rec.HireDate)
        rec.HireDate.nanosecondsDelta = 0
        rec.ModifiedDate = new Date(rec.ModifiedDate)
        rec.ModifiedDate.nanosecondsDelta = 0
      }
      return parsedJSON
    }

    this.compareEmployee = compareEmployee
    this.getJSON = getJSON
    this.dropCreateTable = dropCreateTable
    this.extractKey = extractKey
    this.setVerbose = setVerbose

    return this
  }

  this.Async = Async
  this.Assert = Assert
  this.EmployeeHelper = EmployeeHelper
  this.ProcedureHelper = ProcedureHelper
}

exports.DemoSupport = DemoSupport
module.exports.GlobalConn = GlobalConn
