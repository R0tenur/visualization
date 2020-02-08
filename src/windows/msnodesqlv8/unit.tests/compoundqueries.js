// ---------------------------------------------------------------------------------------------------------------------------------
// File: compoundqueries.js
// Contents: test suite for verifying support of batched queries for mssql node.js driver
//
// Copyright Microsoft Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//
// You may obtain a copy of the License at:
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ---------------------------------------------------------------------------------------------------------------------------------

/* global suite test setup teardown */
'use strict'

const assert = require('assert')
const commonTestFns = require('./CommonTestFunctions')
const supp = require('../samples/typescript/demo-support')

suite('compoundqueries', function () {
  let theConnection
  const tablename = 'compoundqueries_table'
  let testname = 'not set yet'
  let connStr
  let async
  let driver
  let helper
  const sql = global.native_sql

  this.timeout(20000)

  setup(testDone => {
    supp.GlobalConn.init(sql, co => {
      connStr = global.conn_str || co.conn_str
      helper = co.helper
      async = co.async
      driver = co.driver
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

  testname = 'test 001 - batched query: SELECT....; INSERT ....; SELECT....;'
  test(testname, done => {
    const testcolumnsize = 100
    const testcolumntype = ' varchar(' + testcolumnsize + ')'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'varchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'string data row 2'
    const testdata2TsqlInsert = '\'' + testdata2Expected + '\''
    const tsql = `SELECT * FROM ${tablename} ORDER BY id;  INSERT INTO ${tablename} (${testcolumnname}) VALUES (${testdata1});SELECT * FROM ${tablename} ORDER BY id;`

    const expected1 = {
      meta: [
        { name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }
      ],
      rows: [
        [1, null],
        [2, testdata2Expected]
      ]
    }

    const expected2 = {
      meta:
        null,
      rowcount:
        -1
    }

    const expected3 = {
      meta: [
        { name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }
      ],
      rows: [[1, null],
        [2, testdata2Expected],
        [3, null]]
    }

    const fns =
      [
        asyncDone => {
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, () => {
            asyncDone()
          })
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, () => {
            asyncDone()
          })
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, () => {
            asyncDone()
          })
        },
        asyncDone => {
          commonTestFns.compoundQueryTSQL(theConnection, tsql, expected1, expected2, expected3, testname, () => {
            asyncDone()
          })
        }
      ]

    async.series(fns, () => {
      done()
    }) // end of async.series()
  }) // end of test()

  test('check row count emission is as expected for compound queries 1 insert', testDone => {
    const expected = [1]
    const received = []

    const cmd = [
      'create table rowsAffectedTest (id int, val int)',
      'insert into rowsAffectedTest values (1, 5)',
      'drop table rowsAffectedTest'
    ]

    const batch = cmd.join(';')
    const q = theConnection.query(batch, err => {
      assert.ifError(err)
    })

    q.on('rowcount', count => {
      received.push(count)
      if (received.length === expected.length) {
        assert.deepStrictEqual(expected, received)
        testDone()
      }
    })
  })

  test('check row count emission is as expected for compound queries 3 inserts, update all', testDone => {
    const expected = [1, 1, 1, 3]
    const received = []

    const cmd = [
      'create table rowsAffectedTest (id int)',
      'insert into rowsAffectedTest values (1)',
      'insert into rowsAffectedTest values (1)',
      'insert into rowsAffectedTest values (1)',
      'update rowsAffectedTest set id = 1',
      'drop table rowsAffectedTest'
    ]

    const batch = cmd.join(';')
    const q = theConnection.query(batch, err => {
      assert.ifError(err)
    })

    q.on('rowcount', count => {
      received.push(count)
      if (received.length === expected.length) {
        assert.deepStrictEqual(expected, received)
        testDone()
      }
    })
  })

  test('check row count emission is as expected for compound queries 4 inserts, 2 updates, 2 updates, update all', testDone => {
    const expected = [1, 1, 1, 1, 2, 2, 4]
    const received = []

    const cmd = [
      'create table rowsAffectedTest (id int, val int)',
      'insert into rowsAffectedTest values (1, 5)',
      'insert into rowsAffectedTest values (2, 10)',
      'insert into rowsAffectedTest values (3, 20)',
      'insert into rowsAffectedTest values (4, 30)',

      'update rowsAffectedTest set val = 100  where id in (1, 2)',
      'update rowsAffectedTest set val = 100  where id in (3, 4)',
      'update rowsAffectedTest set val = 100  where id in (1, 2, 3, 4)',

      'drop table rowsAffectedTest'
    ]

    const batch = cmd.join(';')
    const q = theConnection.query(batch, err => {
      assert.ifError(err)
    })

    q.on('rowcount', count => {
      received.push(count)
      if (received.length === expected.length) {
        assert.deepStrictEqual(expected, received)
        testDone()
      }
    })
  })

  /*
  testname = 'test 002 - batched query: SELECT....; PRINT ....; SELECT....;'
  test(testname, function (done) {
    var testcolumnsize = 100
    var testcolumntype = ' varchar(' + testcolumnsize + ')'
    var testcolumnclienttype = 'text'
    var testcolumnsqltype = 'varchar'
    var testcolumnname = 'col2'
    var testdata1 = null
    var testdata2Expected = 'string data row 2'
    var testdata2TsqlInsert = '\'' + testdata2Expected + '\''
    var tsql = 'SELECT * FROM ' + tablename + ' ORDER BY id;  PRINT \'hello B.O.B.\';SELECT * FROM ' + tablename + ' ORDER BY id;'

    var expected1 = {
      meta: [
        {name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity'},
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }
      ],
      rows: [
        [1, null],
        [2, testdata2Expected]
      ]
    }

    var expected2 = {
      meta:
        null,
      rowcount:
        -1
    }

    var fns = [
      function (asyncDone) {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, function () {
          asyncDone()
        })
      },
      function (asyncDone) {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, function () {
          asyncDone()
        })
      },
      function (asyncDone) {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, function () {
          asyncDone()
        })
      },
      function (asyncDone) {
        commonTestFns.compoundQueryTSQL(theConnection, tsql, expected1, expected2, expected1, testname, function () {
          asyncDone()
        })
      }
    ]

    async.series(fns, function () {
      done()
    })  // end of async.series()
  }) // end of test()
*/

  testname = 'test 003 - batched query: SELECT....; SELECT (with no results) ....; SELECT....;'
  test(testname, done => {
    const testcolumnsize = 100
    const testcolumntype = ` varchar(${testcolumnsize})`
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'varchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'string data row 2'
    const testdata2TsqlInsert = `'${testdata2Expected}'`
    const tsql = `SELECT * FROM ${tablename} ORDER BY id;  SELECT * FROM ${tablename} WHERE 1=2; SELECT * FROM ${tablename} ORDER BY id;`

    const expected1 = {
      meta: [
        { name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }
      ],
      rows: [
        [1, null],
        [2, testdata2Expected]
      ]
    }

    const expected2 = {
      meta: [
        { name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }
      ],
      rows:
        []
    }

    const fns = [

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, () => {
          asyncDone()
        })
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, () => {
          asyncDone()
        })
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, () => {
          asyncDone()
        })
      },
      asyncDone => {
        commonTestFns.compoundQueryTSQL(theConnection, tsql, expected1, expected2, expected1, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    }) // end of async.series()
  }) // end of test()

  testname = 'test 004 - batched query: SELECT....; INSERT (invalid...should fail) ....; SELECT....;'
  test(testname, done => {
    const invalidtablename = `invalid${tablename}`
    const testcolumnsize = 100
    const testcolumntype = ` varchar(${testcolumnsize})`
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'string data row 2'
    const testdata2TsqlInsert = `'${testdata2Expected}'`
    const tsql = `SELECT * FROM ${tablename} ORDER BY id;  INSERT INTO ${invalidtablename} (${testcolumnname}) VALUES (${testdata1});SELECT * FROM ${tablename} ORDER BY id;`

    const expectedError = new Error('[Microsoft][' + driver + '][SQL Server]Invalid object name \'' + invalidtablename + '\'.')
    expectedError.sqlstate = '42S02'
    expectedError.code = 208

    const fns =
      [
        asyncDone => {
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, () => {
            asyncDone()
          })
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, () => {
            asyncDone()
          })
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, () => {
            asyncDone()
          })
        },
        asyncDone => {
          commonTestFns.invalidQueryTSQL(theConnection, tsql, expectedError, testname, () => {
            asyncDone()
          })
        }
      ]

    async.series(fns, () => {
      done()
    }) // end of async.series()
  }) // end of test()
})
