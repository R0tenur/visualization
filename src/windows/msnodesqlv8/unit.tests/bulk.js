'use strict'
/* global suite teardown teardown test setup */

const supp = require('../samples/typescript/demo-support')
const assert = require('assert')

suite('bulk', function () {
  let theConnection
  this.timeout(100000)
  let tm
  let connStr
  const totalObjectsForInsert = 10
  const test1BatchSize = 1
  const test2BatchSize = 10
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
        assert(err === null || err === false)
        theConnection = newConn
        testDone()
      })
    }, global.conn_str)
  })

  teardown(done => {
    theConnection.close(err => {
      assert(err === null || err === false || err === undefined)
      done()
    })
  })

  test('bulk insert condition failure', testDone => {
    const createTableSql = 'CREATE TABLE Persons (Name varchar(255) NOT NULL)'
    const runQuery = query => {
      return new Promise((resolve, reject) => {
        theConnection.query(query, (err, rows) => {
          if (err) reject(err)
          resolve(rows)
        })
      })
    }
    const fns = [
      asyncDone => {
        theConnection.query('DROP TABLE Persons', () => {
          asyncDone()
        })
      },
      asyncDone => {
        theConnection.query(createTableSql, e => {
          assert.ifError(e)
          asyncDone()
        })
      },
      // normal insert, runs fine
      asyncDone => {
        runQuery(`INSERT INTO [Persons] ([Name]) OUTPUT INSERTED.* VALUES (N'John')`).then(() => {
          asyncDone()
        }).catch((e) => {
          assert.ifError(e)
        })
      },
      // Problematic statement:
      // bulk insert with proper element first, does NOT throw an error
      asyncDone => {
        runQuery(`INSERT INTO [Persons] ([Name]) OUTPUT INSERTED.* VALUES (N'John'), (null)`).then(() => {
          assert(false)
          asyncDone()
        }).catch((e) => {
          assert(e.message.includes('Cannot insert the value NULL into column'), 'Bulk insert should throw an error')
          asyncDone()
        })
      },

      // failing insert, throws proper error
      asyncDone => {
        runQuery(`INSERT INTO [Persons] ([Name]) OUTPUT INSERTED.* VALUES (null)`).then(() => {
          assert(false)
        }).catch((e) => {
          assert(e.message.includes('Cannot insert the value NULL into column'))
          asyncDone()
        })
      },
      // bulk insert, throws proper error
      asyncDone => {
        runQuery(`INSERT INTO [Persons] ([Name]) OUTPUT INSERTED.* VALUES (null), (N'John')`).then(() => {
          assert(false)
        }).catch((e) => {
          assert(e.message.includes('Cannot insert the value NULL into column'))
          asyncDone()
        })
      },
      asyncDone => {
        runQuery(`INSERT INTO [Persons] ([Name]) VALUES (N'John'), (null)`).then(() => {
          assert(false)
        }).catch((e) => {
          assert(e.message.includes('Cannot insert the value NULL into column'))
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('non null varchar write empty string', testDone => {
    const tableName = 'emptyString'
    let boundTable = null
    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName,
          theConnection: theConnection,
          columnName: 'test_field',
          type: 'nvarchar(12)'
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        const tm = theConnection.tableMgr()
        tm.bind(tableName, t => {
          const meta = t.getMeta()
          boundTable = t
          assert(boundTable !== null)
          const select = meta.getSelectSignature()
          assert(select.indexOf('select') >= 0)

          const insert = meta.getInsertSignature()
          assert(insert.indexOf('insert') >= 0)

          const del = meta.getDeleteSignature()
          assert(del.indexOf('delete') >= 0)

          const update = meta.getUpdateSignature()
          assert(update.indexOf('update') >= 0)

          const assignable = meta.getAssignableColumns()
          assert(Array.isArray(assignable))
          assert(assignable.length > 0)

          const updateColumns = meta.getUpdateColumns()
          assert(Array.isArray(updateColumns))
          assert(updateColumns.length > 0)

          const primaryColumns = meta.getPrimaryColumns()
          assert(Array.isArray(primaryColumns))
          assert(primaryColumns.length > 0)

          const whereColumns = meta.getWhereColumns()
          assert(Array.isArray(whereColumns))
          assert(whereColumns.length > 0)

          const byName = meta.getColumnsByName()
          assert(byName !== null)

          asyncDone()
        })
      },

      asyncDone => {
        const vec = [
          {
            pkid: 1,
            test_field: ''
          },
          {
            pkid: 2,
            test_field: ''
          }
        ]
        boundTable.insertRows(vec, (err, res) => {
          assert(err === null || err === false)
          assert(res.length === 0)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.query(`select len(test_field) as len  from [dbo].${tableName}`, (err, res) => {
          assert(err == null)
          assert(Array.isArray(res))
          assert(res.length === 2)
          const expected = [
            {
              len: 0
            },
            {
              len: 0
            }
          ]
          assert.deepStrictEqual(expected, res)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('employee table complex json object test api', testDone => {
    const tableName = 'Employee'

    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName,
          theConnection: theConnection
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        bindInsert(tableName, () => {
          asyncDone()
        })
      },

      asyncDone => {
        const tm = theConnection.tableMgr()
        tm.bind(tableName, t => {
          const meta = t.getMeta()

          const select = meta.getSelectSignature()
          assert(select.indexOf('select') >= 0)

          const insert = meta.getInsertSignature()
          assert(insert.indexOf('insert') >= 0)

          const del = meta.getDeleteSignature()
          assert(del.indexOf('delete') >= 0)

          const update = meta.getUpdateSignature()
          assert(update.indexOf('update') >= 0)

          const assignable = meta.getAssignableColumns()
          assert(Array.isArray(assignable))
          assert(assignable.length > 0)

          const updateColumns = meta.getUpdateColumns()
          assert(Array.isArray(updateColumns))
          assert(updateColumns.length > 0)

          const primaryColumns = meta.getPrimaryColumns()
          assert(Array.isArray(primaryColumns))
          assert(primaryColumns.length > 0)

          const whereColumns = meta.getWhereColumns()
          assert(Array.isArray(whereColumns))
          assert(whereColumns.length > 0)

          const byName = meta.getColumnsByName()
          assert(byName !== null)

          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test(`bulk insert simple multi-column object - default a nullable column ${test2BatchSize}`, testDone => {
    function buildTest (count) {
      const arr = []
      let str = '-'
      for (let i = 0; i < count; ++i) {
        str = str + i
        if (i % 10 === 0) str = '-'
        const inst = {
          pkid: i,
          num1: i * 3,
          num2: i * 4,
          // do not present num3 - an array of nulls should be inserted.
          st: str
        }
        arr.push(inst)
      }
      return arr
    }

    const tableName = 'BulkTest'
    let bulkMgr
    const vec = buildTest(totalObjectsForInsert)

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
        tm.bind(tableName, bm => {
          bulkMgr = bm
          asyncDone()
        })
      },

      asyncDone => {
        bulkMgr.setBatchSize(totalObjectsForInsert)
        bulkMgr.insertRows(vec, (err, res) => {
          assert(err === null || err === false)
          assert(res.length === 0)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('employee tmp table complex json object array bulk operations', testDone => {
    const tableName = '#Employee'

    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName,
          theConnection: theConnection
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        bindInsert(tableName, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test(`bulk insert/update/select int column of signed batchSize ${test2BatchSize}`, testDone => {
    signedTest(test2BatchSize, true, true, () => {
      testDone()
    })
  })

  test(`bulk insert/select varbinary column batchSize ${test1BatchSize}`, testDone => {
    varbinaryTest(test1BatchSize, true, () => {
      testDone()
    })
  })

  test(`bulk insert/select varbinary column batchSize ${test2BatchSize}`, testDone => {
    varbinaryTest(test2BatchSize, true, () => {
      testDone()
    })
  })

  test(`bulk insert/select null column of datetime batchSize ${test2BatchSize}`, testDone => {
    nullTest(test2BatchSize, false, () => {
      testDone()
    })
  })

  test(`bulk insert/select null column of datetime batchSize ${test1BatchSize}`, testDone => {
    nullTest(test1BatchSize, false, () => {
      testDone()
    })
  })

  test('employee complex json object array bulk operations', testDone => {
    const tableName = 'Employee'

    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        bindInsert(tableName, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  function bindInsert (tableName, done) {
    let bulkMgr
    const parsedJSON = helper.getJSON()
    const keys = helper.extractKey(parsedJSON, 'BusinessEntityID')
    let selected

    const fns = [
      asyncDone => {
        const tm = theConnection.tableMgr()
        tm.bind(tableName, bulk => {
          bulkMgr = bulk
          asyncDone()
        })
      },

      asyncDone => {
        bulkMgr.insertRows(parsedJSON, () => {
          asyncDone()
        })
      },

      asyncDone => {
        bulkMgr.selectRows(keys, (err, results) => {
          assert(err === null || err === false)
          assert(results.length === parsedJSON.length)
          assert.deepStrictEqual(results, parsedJSON, 'results didn\'t match')
          selected = results
          asyncDone()
        })
      }
    ]

    async.series(fns, function () {
      done(bulkMgr, selected)
    })
  }

  test('employee insert/select with non primary key', testDone => {
    const tableName = 'Employee'
    let parsedJSON
    const whereCols = [
      {
        name: 'LoginID'
      }
    ]

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
        bindInsert(tableName, (bm, selected) => {
          bulkMgr = bm
          parsedJSON = selected
          asyncDone()
        })
      },

      asyncDone => {
        const keys = helper.extractKey(parsedJSON, 'LoginID')
        bulkMgr.setWhereCols(whereCols)
        bulkMgr.selectRows(keys, (err, results) => {
          assert(err === null || err === false)
          assert(results.length === parsedJSON.length)
          assert.deepStrictEqual(results, parsedJSON, 'results didn\'t match')
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('employee insert - update a single column', testDone => {
    const tableName = 'Employee'
    let parsedJSON
    const updateCols = []

    updateCols.push({
      name: 'ModifiedDate'
    })
    const newDate = new Date('2015-01-01T00:00:00.000Z')
    const modifications = []

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
        bindInsert(tableName, (bm, selected) => {
          bulkMgr = bm
          parsedJSON = selected
          asyncDone()
        })
      },

      asyncDone => {
        parsedJSON.forEach(emp => {
          emp.ModifiedDate = newDate
          modifications.push({
            BusinessEntityID: emp.BusinessEntityID,
            ModifiedDate: newDate
          })
        })
        bulkMgr.setUpdateCols(updateCols)
        bulkMgr.updateRows(modifications, () => {
          asyncDone()
        })
      },

      asyncDone => {
        const keys = helper.extractKey(parsedJSON, 'BusinessEntityID')
        bulkMgr.selectRows(keys, (err, results) => {
          assert(err === null || err === false)
          assert(results.length === parsedJSON.length)
          helper.compareEmployee(results, parsedJSON)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  function bitTestStrictColumn (batchSize, selectAfterInsert, runUpdateFunction, testDone) {
    const params = {
      columnType: 'bit',
      columnName: 'Key',
      buildFunction: i => i % 2 === 0,
      updateFunction: runUpdateFunction ? i => i % 3 === 0 : null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, () => {
      testDone()
    })
  }

  test('bulk insert/update/select bit strict column ' + test2BatchSize, testDone => {
    bitTestStrictColumn(test2BatchSize, true, true, () => {
      testDone()
    })
  })

  test('bulk insert/select bit strict column batchSize ' + test1BatchSize, function (testDone) {
    bitTestStrictColumn(test1BatchSize, true, false, () => {
      testDone()
    })
  })

  test('bulk insert/select bit strict column ' + test2BatchSize, function (testDone) {
    bitTestStrictColumn(test2BatchSize, true, false, () => {
      testDone()
    })
  })

  function nullTest (batchSize, selectAfterInsert, testDone) {
    const params = {
      columnType: 'datetime',
      buildFunction: () => null,
      updateFunction: null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, () => {
      testDone()
    })
  }

  function dateTest (batchSize, selectAfterInsert, testDone) {
    const dt = new Date('2002-02-06T00:00:00.000Z')

    const params = {
      columnType: 'datetime',
      buildFunction: () => {
        dt.setTime(dt.getTime() + 86400000)
        const nt = new Date()
        nt.setTime(dt.getTime())
        return nt
      },
      updateFunction: null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, testDone)
  }

  test(`bulk insert/select datetime column batchSize ${test1BatchSize}`, testDone => {
    dateTest(test1BatchSize, true, function () {
      testDone()
    })
  })

  test(`bulk insert/select datetime column batchSize ${test2BatchSize}`, testDone => {
    dateTest(test2BatchSize, true, function () {
      testDone()
    })
  })

  function signedTest (batchSize, selectAfterInsert, runUpdateFunction, testDone) {
    const params = {
      columnType: 'int',
      buildFunction: i => i % 2 === 0 ? -i : i,
      updateFunction: runUpdateFunction ? i => i % 2 === 0 ? -i * 3 : i * 3 : null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, () => {
      testDone()
    })
  }

  test(`bulk insert/select int column of signed batchSize ${test1BatchSize}`, testDone => {
    signedTest(test1BatchSize, true, false, () => {
      testDone()
    })
  })

  test(`bulk insert/select int column of signed batchSize ${test2BatchSize}`, testDone => {
    signedTest(test2BatchSize, true, false, () => {
      testDone()
    })
  })

  function unsignedTest (batchSize, selectAfterInsert, runUpdateFunction, testDone) {
    const params = {
      columnType: 'int',
      buildFunction: i => i * 2,
      updateFunction: runUpdateFunction ? i => i * 3 : null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, () => {
      testDone()
    })
  }

  test(`bulk insert/select int column of unsigned batchSize ${test1BatchSize}`, testDone => {
    unsignedTest(test1BatchSize, true, false, () => {
      testDone()
    })
  })

  test(`bulk insert/select int column of unsigned batchSize ${test2BatchSize}`, testDone => {
    unsignedTest(test2BatchSize, true, false, () => {
      testDone()
    })
  })

  test(`bulk insert/select/update int column of unsigned batchSize ${test2BatchSize}`, testDone => {
    unsignedTest(test2BatchSize, true, true, () => {
      testDone()
    })
  })

  function bitTest (batchSize, selectAfterInsert, runUpdateFunction, testDone) {
    const params = {
      columnType: 'bit',
      buildFunction: i => i % 2 === 0,
      updateFunction: runUpdateFunction ? i => i % 3 === 0 : null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, () => {
      testDone()
    })
  }

  test(`bulk insert/select bit column batchSize ${test1BatchSize}`, testDone => {
    bitTest(test1BatchSize, true, false, () => {
      testDone()
    })
  })

  test(`bulk insert/select bit column ${test2BatchSize}`, testDone => {
    bitTest(test2BatchSize, true, false, () => {
      testDone()
    })
  })

  test(`bulk insert/update/select bit column ${test2BatchSize}`, testDone => {
    bitTest(test2BatchSize, true, true, () => {
      testDone()
    })
  })

  function decimalTest (batchSize, selectAfterInsert, deleteAfterTest, runUpdateFunction, testDone) {
    const params = {
      columnType: 'decimal(18,4)',
      buildFunction: i => (i * 10) + (i * 0.1),
      updateFunction: runUpdateFunction ? i => (i * 1) + (i * 0.2) : null,
      check: selectAfterInsert,
      deleteAfterTest: deleteAfterTest,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, testDone)
  }

  test(`bulk insert/select decimal column batchSize ${test1BatchSize}`, testDone => {
    decimalTest(test1BatchSize, true, false, false, testDone)
  })

  test(`bulk insert/select decimal column batchSize ${test2BatchSize}`, testDone => {
    decimalTest(test2BatchSize, true, false, false, testDone)
  })

  test(`bulk insert/select/delete decimal column batchSize ${test2BatchSize}`, testDone => {
    decimalTest(test2BatchSize, true, true, false, testDone)
  })

  test(`bulk insert/update/select decimal column batchSize ${test2BatchSize}`, testDone => {
    decimalTest(test2BatchSize, true, false, true, testDone)
  })

  function varcharTest (batchSize, selectAfterInsert, deleteAfterTest, runUpdateFunction, testDone) {
    const arr = []
    let str = ''
    for (let i = 0; i < 10; ++i) {
      str = str + i
      arr.push(str)
    }

    const params = {
      columnType: 'varchar(100)',
      buildFunction: i => {
        const idx = i % 10
        return arr[idx]
      },
      updateFunction: runUpdateFunction ? i => {
        const idx = 9 - (i % 10)
        return arr[idx]
      } : null,
      check: selectAfterInsert,
      deleteAfterTest: deleteAfterTest,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, testDone)
  }

  test(`bulk insert/select varchar column batchSize ${test1BatchSize}`, testDone => {
    varcharTest(test1BatchSize, true, false, false, testDone)
  })

  test(`bulk insert/select varchar column batchSize ${test2BatchSize}`, testDone => {
    varcharTest(test2BatchSize, true, false, false, testDone)
  })

  test(`bulk insert/select/delete varchar column batchSize ${test2BatchSize}`, testDone => {
    varcharTest(test2BatchSize, true, true, false, testDone)
  })

  test(`bulk insert/update/select varchar column batchSize ${test2BatchSize}`, testDone => {
    varcharTest(test2BatchSize, true, false, true, testDone)
  })

  test(`bulk insert/update/select/delete varchar column batchSize ${test2BatchSize}`, testDone => {
    varcharTest(test2BatchSize, true, true, true, testDone)
  })

  test(`bulk insert simple multi-column object in batches ${test2BatchSize}`, testDone => {
    function buildTest (count) {
      const arr = []
      let str = '-'
      for (let i = 0; i < count; ++i) {
        str = str + i
        if (i % 10 === 0) str = '-'
        const inst = {
          pkid: i,
          num1: i * 3,
          num2: i * 4,
          num3: i % 2 === 0 ? null : i * 32,
          st: str
        }
        arr.push(inst)
      }
      return arr
    }

    const tableName = 'BulkTest'

    helper.dropCreateTable({
      tableName: tableName
    }, go)

    function go () {
      const tm = theConnection.tableMgr()
      tm.bind(tableName, test)
    }

    function test (bulkMgr) {
      const batch = totalObjectsForInsert
      const vec = buildTest(batch)
      bulkMgr.insertRows(vec, insertDone)

      function insertDone (err, res) {
        assert.ifError(err)
        assert(res.length === 0)
        const s = 'select count(*) as count from ' + tableName
        theConnection.query(s, (err, results) => {
          const expected = [{
            count: batch
          }]
          assert.ifError(err)
          assert.deepStrictEqual(results, expected, 'results didn\'t match')
          testDone()
        })
      }
    }
  })

  function simpleColumnBulkTest (params, completeFn) {
    const type = params.columnType
    const buildFunction = params.buildFunction
    const updateFunction = params.updateFunction
    const check = params.check
    const batchSize = params.batchSize
    const deleteAfterTest = params.deleteAfterTest
    const tableName = 'bulkColumn'
    const columnName = params.columnName || 'col1'

    function buildTestObjects (batch, functionToRun) {
      const arr = []

      for (let i = 0; i < batch; ++i) {
        const o = {
          pkid: i
        }
        o[columnName] = functionToRun(i)
        arr.push(o)
      }
      return arr
    }

    const batch = totalObjectsForInsert
    let toUpdate
    const toInsert = buildTestObjects(batch, buildFunction)
    if (updateFunction) toUpdate = buildTestObjects(batch, updateFunction)
    let skip = false
    let bulkMgr

    const fns = [

      asyncDone => {
        helper.dropCreateTable({
          tableName: tableName,
          columnName: columnName,
          type: type
        }, () => {
          asyncDone()
        })
      },

      asyncDone => {
        tm = theConnection.tableMgr()
        tm.bind(tableName, bm => {
          bulkMgr = bm
          asyncDone()
        })
      },

      asyncDone => {
        bulkMgr.setBatchSize(batchSize)
        bulkMgr.insertRows(toInsert, err => {
          assert.ifError(err)
          asyncDone()
        })
      },

      asyncDone => {
        const s = `select count(*) as count from ${tableName}`
        theConnection.query(s, (err, results) => {
          const expected = [{
            count: batch
          }]
          assert.ifError(err)
          assert.deepStrictEqual(results, expected, 'results didn\'t match')
          asyncDone()
        })
      },

      asyncDone => {
        if (!updateFunction) {
          skip = true
          asyncDone()
        } else {
          bulkMgr.updateRows(toUpdate, (err, res) => {
            assert.ifError(err)
            assert(res.length === 0)
            asyncDone()
          })
        }
      },

      asyncDone => {
        if (skip) {
          asyncDone()
          return
        }
        if (!check) {
          skip = true
          asyncDone()
          return
        }
        const fetch = []
        for (let i = 0; i < toUpdate.length; ++i) {
          fetch.push({
            pkid: i
          })
        }
        bulkMgr.selectRows(fetch, (err, results) => {
          assert.ifError(err)
          assert.deepEqual(results, toUpdate, 'results didn\'t match')
          asyncDone()
        })
      },

      asyncDone => {
        if (skip) {
          asyncDone()
          return
        }
        if (!deleteAfterTest) {
          skip = true
          asyncDone()
          return
        }
        bulkMgr.deleteRows(toInsert, (err, res) => {
          assert.ifError(err)
          assert(res.length === 0)
          asyncDone()
        })
      },

      asyncDone => {
        if (skip) {
          asyncDone()
          return
        }
        const s = `select count(*) as count from ${tableName}`
        theConnection.query(s, (err, results) => {
          const expected = [{
            count: 0
          }]
          assert.ifError(err)
          assert.deepStrictEqual(results, expected, 'results didn\'t match')
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      completeFn()
    })
  }

  const arr = []

  function varbinaryTest (batchSize, selectAfterInsert, testDone) {
    const strings = [
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten'
    ]

    for (let i = 0; i < 10; ++i) {
      arr.push(Buffer.from(strings[i]))
    }

    const params = {
      columnType: 'varbinary(10)',
      buildFunction: i => {
        const idx = i % 10
        return arr[idx]
      },
      updateFunction: null,
      check: selectAfterInsert,
      deleteAfterTest: false,
      batchSize: batchSize
    }

    simpleColumnBulkTest(params, testDone)
  }
})
