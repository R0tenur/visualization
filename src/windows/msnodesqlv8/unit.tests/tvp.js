'use strict'
/* global suite teardown teardown test setup */

const supp = require('../samples/typescript/demo-support')
const assert = require('assert')

suite('tvp', function () {
  let theConnection
  this.timeout(20000)
  let connStr
  let async
  let helper

  const sql = global.native_sql

  setup(testDone => {
    supp.GlobalConn.init(sql, co => {
      connStr = global.conn_str || co.conn_str
      async = co.async
      helper = co.helper
      helper.setVerbose(false)
      sql.open(connStr, (err, newConn) => {
        assert(err === false)
        theConnection = newConn
        testDone()
      })
    }, global.conn_str)
  })

  teardown(done => {
    theConnection.close(err => {
      assert.ifError(err)
      done()
    })
  })

  function setupSimpleType (tableName, done) {
    let schemaName = 'dbo'
    let unqualifiedTableName = tableName
    const schemaIndex = tableName.indexOf('.')
    if (schemaIndex > 0) {
      schemaName = tableName.substr(0, schemaIndex)
      unqualifiedTableName = tableName.substr(schemaIndex + 1)
    }
    const createSchemaSql = `IF NOT EXISTS (
SELECT schema_name
FROM  information_schema.schemata
WHERE schema_name = '${schemaName}')
BEGIN
 EXEC sp_executesql N'CREATE SCHEMA ${schemaName}'
END`

    const tableTypeName = `${tableName}Type`
    const insertProcedureTypeName = `${schemaName}.Insert${unqualifiedTableName}`
    let table

    const dropTableSql = `IF OBJECT_ID('${tableName}', 'U') IS NOT NULL 
  DROP TABLE ${tableName};`

    const dropProcedureSql = `IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('${insertProcedureTypeName}'))
 begin drop PROCEDURE ${insertProcedureTypeName} end `

    const createTableSql = `create TABLE ${tableName}(
\tusername nvarchar(30), 
\tage int, 
\tsalary real
)`

    const dropTypeSql = `IF TYPE_ID(N'${tableTypeName}') IS not NULL drop type ${tableTypeName}`

    const createTypeSql = `CREATE TYPE ${tableTypeName} AS TABLE (username nvarchar(30), age int, salary real)`

    const insertProcedureSql = `create PROCEDURE ${insertProcedureTypeName}
@tvp ${tableTypeName} READONLY
AS
BEGIN
 set nocount on
 INSERT INTO ${tableName}
(
   [username],
   [age],
   [salary]
 )
 SELECT 
 [username],
 [age],
 [salary]
n FROM @tvp tvp
END`

    const fns = [

      asyncDone => {
        theConnection.query(createSchemaSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(dropProcedureSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(dropTableSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(createTableSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(dropTypeSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(createTypeSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(insertProcedureSql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.getUserTypeTable(tableTypeName, (err, t) => {
          assert.ifError(err)
          table = t
          assert(table.columns.length === 3)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done(table)
    })
  }

  const vec = [
    {
      username: 'santa',
      age: 1000,
      salary: 0
    },
    {
      username: 'md',
      age: 28,
      salary: 100000
    }
  ]

  test('use tvp to select from table type complex object Employee type', testDone => {
    const tableName = 'Employee'
    let bulkMgr

    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        const tm = theConnection.tableMgr()
        tm.bind(tableName, bulk => {
          bulkMgr = bulk
          asyncDone()
        })
      },

      asyncDone => {
        let sql = 'IF TYPE_ID(N\'EmployeeType\') IS not NULL'
        sql += ' drop type EmployeeType'
        theConnection.query(sql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        const sql = bulkMgr.asUserType()
        theConnection.query(sql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        const parsedJSON = helper.getJSON()
        // construct a table type based on a table definition.
        const table = bulkMgr.asTableType()
        // convert a set of objects to rows
        table.addRowsFromObjects(parsedJSON)
        // use a type the native driver can understand, using column based bulk binding.
        const tp = sql.TvpFromTable(table)
        theConnection.query('select * from ?;', [tp], (err, res) => {
          assert.ifError(err)
          helper.compareEmployee(res, parsedJSON)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('employee use tm to get a table value type representing table and create that user table type', testDone => {
    const tableName = 'Employee'
    let bulkMgr

    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        const tm = theConnection.tableMgr()
        tm.bind(tableName, bulk => {
          bulkMgr = bulk
          asyncDone()
        })
      },

      asyncDone => {
        let sql = 'IF TYPE_ID(N\'EmployeeType\') IS not NULL'
        sql += ' drop type EmployeeType'
        theConnection.query(sql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        const sql = bulkMgr.asUserType()
        theConnection.query(sql, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.getUserTypeTable('EmployeeType', (err, def) => {
          assert.ifError(err)
          const summary = bulkMgr.getSummary()
          assert(def.columns.length = summary.columns.length)
          const t = bulkMgr.asTableType()
          assert(t.columns.length === summary.columns.length)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('use tvp simple test type insert test using pm', testDone => {
    const tableName = 'TestTvp'
    let table
    let procedure

    const fns = [

      asyncDone => {
        setupSimpleType(tableName, t => {
          table = t
          table.addRowsFromObjects(vec)
          asyncDone()
        })
      },

      asyncDone => {
        const pm = theConnection.procedureMgr()
        pm.get('insertTestTvp', p => {
          assert(p)
          procedure = p
          asyncDone()
        })
      },

      asyncDone => {
        const tp = sql.TvpFromTable(table)
        table.rows = []
        procedure.call([tp], err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(`select * from ${tableName}`, (err, res) => {
          assert.ifError(err)
          assert.deepStrictEqual(vec, res)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('non dbo schema use tvp simple test type select test', testDone => {
    const tableName = 'TestSchema.TestTvp'
    let table

    const fns = [

      asyncDone => {
        setupSimpleType(tableName, t => {
          table = t
          table.addRowsFromObjects(vec)
          asyncDone()
        })
      },

      asyncDone => {
        const tp = sql.TvpFromTable(table)
        table.rows = []
        theConnection.query('select * from ?;', [tp], (err, res) => {
          assert.ifError(err)
          assert.deepStrictEqual(res, vec)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('use tvp simple test type select test', testDone => {
    const tableName = 'TestTvp'
    let table

    const fns = [

      asyncDone => {
        setupSimpleType(tableName, t => {
          table = t
          table.addRowsFromObjects(vec)
          asyncDone()
        })
      },

      asyncDone => {
        const tp = sql.TvpFromTable(table)
        table.rows = []
        theConnection.query('select * from ?;', [tp], (err, res) => {
          assert.ifError(err)
          assert.deepStrictEqual(res, vec)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('use tvp simple test type insert test', testDone => {
    const tableName = 'TestTvp'
    let table

    const fns = [

      asyncDone => {
        setupSimpleType(tableName, t => {
          table = t
          table.addRowsFromObjects(vec)
          asyncDone()
        })
      },

      asyncDone => {
        const tp = sql.TvpFromTable(table)
        table.rows = []
        theConnection.query('exec insertTestTvp @tvp = ?;', [tp], err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(`select * from ${tableName}`, (err, res) => {
          assert.ifError(err)
          assert.deepStrictEqual(vec, res)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })
})
