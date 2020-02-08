//  ---------------------------------------------------------------------------------------------------------------------------------
// File: prepared.js
// Contents: test suite for queries
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
//  ---------------------------------------------------------------------------------------------------------------------------------

/* global suite teardown teardown test setup */
'use strict'

const supp = require('../samples/typescript/demo-support')
const assert = require('assert')

function empSelectSQL () {
  return 'SELECT [BusinessEntityID] ' +
     ',[NationalIDNumber] ' +
     ',[LoginID] ' +
     ',[OrganizationNode] ' +
     ',[OrganizationLevel] ' +
     ',[JobTitle] ' +
     ',[BirthDate] ' +
     ',[MaritalStatus] ' +
     ',[Gender] ' +
     ',[HireDate] ' +
     ',[SalariedFlag] ' +
     ',[VacationHours] ' +
     ',[SickLeaveHours] ' +
     ',[CurrentFlag] ' +
     ',[rowguid] ' +
     ',[ModifiedDate] ' +
     'FROM [dbo].[Employee] ' +
     ' WHERE BusinessEntityID = ? '
}

function empDeleteSQL () {
  return 'DELETE FROM [dbo].[Employee] ' +
        'WHERE BusinessEntityID = ?'
}

function empNoParamsSQL () {
  return 'SELECT [BusinessEntityID] ' +
     ',[NationalIDNumber] ' +
     ',[LoginID] ' +
     ',[OrganizationNode] ' +
     ',[OrganizationLevel] ' +
     ',[JobTitle] ' +
     ',[BirthDate] ' +
     ',[MaritalStatus] ' +
     ',[Gender] ' +
     ',[HireDate] ' +
     ',[SalariedFlag] ' +
     ',[VacationHours] ' +
     ',[SickLeaveHours] ' +
     ',[CurrentFlag] ' +
     ',[rowguid] ' +
     ',[ModifiedDate] ' +
     'FROM [dbo].[Employee]'
}

suite('prepared', function () {
  const tableName = 'Employee'
  let connStr
  let theConnection
  let support
  let async
  let helper
  let procedureHelper
  let prepared
  let parsedJSON
  const sql = global.native_sql
  this.timeout(10000)

  const actions = [
    // open a connection.
    asyncDone => {
      sql.open(connStr, (err, newConn) => {
        assert(err === null || err === false)
        theConnection = newConn
        asyncDone()
      })
    },

    // drop / create an Employee table.
    asyncDone => {
      helper.dropCreateTable({
        tableName: tableName
      }, () => {
        asyncDone()
      })
    },

    // insert test set using bulk insert
    asyncDone => {
      const tm = theConnection.tableMgr()
      tm.bind(tableName, bulkMgr => {
        bulkMgr.insertRows(parsedJSON, () => {
          asyncDone()
        })
      })
    },

    // prepare a select statement.
    asyncDone => {
      employeePrepare(empSelectSQL(), ps => {
        prepared.select = ps
        asyncDone()
      })
    },

    // prepare a select all statement.
    asyncDone => {
      employeePrepare(empNoParamsSQL(), ps => {
        prepared.scan = ps
        asyncDone()
      })
    },

    // prepare a delete statement.
    asyncDone => {
      employeePrepare(empDeleteSQL(), ps => {
        prepared.delete = ps
        asyncDone()
      })
    }
  ]

  setup(testDone => {
    prepared = {
      select: null,
      delete: null,
      scan: null
    }

    supp.GlobalConn.init(sql, co => {
      connStr = global.conn_str || co.conn_str
      support = co.support
      procedureHelper = new support.ProcedureHelper(connStr)
      procedureHelper.setVerbose(false)
      async = co.async
      helper = co.helper
      helper.setVerbose(false)
      parsedJSON = helper.getJSON()
      async.series(actions,
        () => {
          testDone()
        })
    }, global.conn_str)
  })

  teardown(done => {
    const fns = [
      asyncDone => {
        prepared.select.free(() => {
          asyncDone()
        })
      },
      asyncDone => {
        prepared.delete.free(() => {
          asyncDone()
        })
      },
      asyncDone => {
        theConnection.close((err) => {
          assert.ifError(err)
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  })

  function employeePrepare (query, done) {
    theConnection.prepare(query, (err, ps) => {
      assert(err === null || err === false)
      done(ps)
    })
  }

  test('use prepared to reserve and read multiple rows.', testDone => {
    const sql = 'select * from master..syscomments'
    theConnection.prepare(sql, (err, preparedQuery) => {
      assert(err === null || err === false)
      preparedQuery.preparedQuery([], (err, res) => {
        assert(res != null)
        assert(res.length > 0)
        assert.ifError(err)
      })
      preparedQuery.free(() => {
        testDone()
      })
    })
  })

  test('use prepared statement twice with no parameters.', testDone => {
    const select = prepared.scan
    const meta = select.getMeta()
    assert(meta.length > 0)
    select.preparedQuery((err, res1) => {
      assert.ifError(err)
      assert.deepStrictEqual(parsedJSON, res1, 'results didn\'t match')
      select.preparedQuery((err, res2) => {
        assert.ifError(err)
        assert.deepStrictEqual(parsedJSON, res2, 'results didn\'t match')
        testDone()
      })
    })
  })

  test('use prepared statements to select a row, then delete it over each row.', testDone => {
    const select = prepared.select
    const meta = select.getMeta()
    assert(meta.length > 0)
    const remove = prepared.delete
    const max = parsedJSON[parsedJSON.length - 1].BusinessEntityID
    let businessId = 1
    next(businessId, iterate)

    function iterate () {
      businessId++
      if (businessId > max) check()
      else next(businessId, iterate)
    }

    function check () {
      theConnection.query('select count(*) as rows from Employee', (err, res) => {
        assert.ifError(err)
        assert(res[0].rows === 0)
        testDone()
      })
    }

    function next (businessId, done) {
      select.preparedQuery([businessId], (err, res1) => {
        assert.ifError(err)
        const fetched = parsedJSON[businessId - 1]
        assert.deepStrictEqual(fetched, res1[0], 'results didn\'t match')
        remove.preparedQuery([businessId], (err) => {
          assert.ifError(err)
          done()
        })
      })
    }
  })

  test('stress test prepared statement with 500 invocations cycling through primary key', testDone => {
    const select = prepared.select
    const meta = select.getMeta()
    assert(meta.length > 0)
    let businessId = 1
    let iteration = 0
    const totalIterations = 500
    const max = parsedJSON[parsedJSON.length - 1].BusinessEntityID
    next(businessId, iterate)

    function iterate () {
      businessId++
      if (businessId > max) businessId = 1
      ++iteration
      if (iteration < totalIterations) {
        next(businessId, iterate)
      } else {
        testDone()
      }
    }

    function next (businessId, done) {
      select.preparedQuery([businessId],
        (err, res1) => {
          assert.ifError(err)
          assert(res1[0].BusinessEntityID === businessId)
          done()
        })
    }
  })

  test('use prepared statement twice with different params.', testDone => {
    const select = prepared.select
    const meta = select.getMeta()
    const id1 = 2
    const id2 = 3
    assert(meta.length > 0)
    select.preparedQuery([id1], (err, res1) => {
      assert.ifError(err)
      select.preparedQuery([id2], (err, res2) => {
        assert.ifError(err)
        const o1 = parsedJSON[id1 - 1]
        assert.deepStrictEqual(o1, res1[0], 'results didn\'t match')

        const o2 = parsedJSON[id2 - 1]
        assert.deepStrictEqual(o2, res2[0], 'results didn\'t match')
        testDone()
      })
    })
  })
})
