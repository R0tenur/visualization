//  ---------------------------------------------------------------------------------------------------------------------------------
// File: CommonTestFunctions.js
// Contents: common functions used in various tests in the test suite for mssql node.js driver
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
'use strict'

const sql = require('../')
const assert = require('assert')
const supp = require('../samples/typescript/demo-support')
const util = require('util')

// Need to change this to false when parameters are supported
const SKIP_BINDPARAM_TEST_CASES = true

// Need to change this to false to verify failing/haning tests are fixed
const SKIP_FAILING_HANGING_TEST_CASES = true

// To print extended debugging information regarding what test cases are doing, set this parameter to 'true', else false
const writeDebugComments = false

// Here are some commonly used phrases that can be shared to prevent unnecessary duplication of comments
const dataComparisonFailed = 'Results do not match expected values'

function dataComparisonFailedMessage (testname, expected, actual, done) {
  errorComments(`
TEST FAILED, ${dataComparisonFailed}, Test Case: 
'${testname}' 
`)
  errorComments(`
Expected: 
${util.inspect(expected)}`)
  errorComments(`
Received: 
${util.inspect(actual)}`)
  done(new Error(`
xxxTEST FAILED, ${dataComparisonFailed}, Test Case: 
'${testname}' 
`))
}

//   non-optional message
function errorComments (Message) {
  console.log(Message)
}

//   optional debugging information
function debugComments (Message) {
  if (writeDebugComments === true) {
    errorComments(Message)
  }
}

// For datetime types, the tests need to know the current offset (in hours) this machine's time zone is from GMT:
function getTimezoneOffsetInHours (year, month, day) {
  const jsDateExpectedTemp = new Date(year, month - 1, day, 0, 0, 0, 0)
  return jsDateExpectedTemp.getTimezoneOffset() / 60
}

//    Create table for test data
const createTable = (Connection, TableName, ColumnName, TestType, done) => {
  const support = new supp.DemoSupport(sql, '')
  const async = new support.Async()

  const actions = [
    asyncDone => {
      // console.log("in item 1");
      const tsql = `if exists (SELECT * FROM sys.tables WHERE name = '${TableName}') DROP TABLE ${TableName}`
      debugComments(`
test note createTable1_CommonTestFunctions.js ... executing: 
${tsql}`)
      // console.log(tsql);
      Connection.queryRaw(tsql, e => {
        // console.log("....createTable run 1");
        assert.ifError(e)
        asyncDone()
      })
    },
    asyncDone => {
      // console.log("in item 2");
      const tsql = `CREATE TABLE ${TableName} (id int identity, ${ColumnName} ${TestType})`
      debugComments(`
test note createTable2_CommonTestFunctions.js ... executing: 
${tsql}`)
      // console.log(tsql);
      Connection.queryRaw(tsql, e => {
        // console.log("....createTable run 2");
        assert.ifError(e)
        asyncDone()
      })
    },
    asyncDone => {
      // console.log("in item 3");
      const tsql = `CREATE CLUSTERED INDEX IX_${TableName}_id  ON ${TableName}  (id) `
      debugComments(`
test note createTable2_CommonTestFunctions.js ... executing: 
${tsql}`)
      Connection.queryRaw(tsql, e => {
        // console.log("....createTable run 3");
        assert.ifError(e)
        asyncDone()
      })
    }]

  async.series(actions,
    () => {
      // console.log("all done .... finish each loop.");
      done()
    })

  debugComments(`
test note createTable3_CommonTestFunctions.js ... returning 
`)
}

//    insert test data via parameters
const insertDataBP = (Connection, TableName, ColumnName, TestData, done) => {
  if (SKIP_BINDPARAM_TEST_CASES === true) {
    done()
  } else {
    const tsql = `INSERT INTO ${TableName} (${ColumnName}) VALUES (?)`
    debugComments(`
test note insertDataBP_CommonTestFunctions.js ... executing: 
${tsql}`)
    Connection.queryRaw(tsql, [TestData], e => {
      assert.ifError(e)
      done()
    })
  }
}

//    insert test data via TSQL
const insertDataTSQL = (Connection, TableName, ColumnName, TestData, done) => {
  const tsql = `INSERT INTO ${TableName} (${ColumnName}) VALUES (${TestData})`
  // console.log(tsql);
  debugComments(`
test note insertDataTSQL_CommonTestFunctions.js ... executing: 
${tsql}`)
  try {
    Connection.queryRaw(tsql, e => {
      if (e) {
        console.log(e)
      }
      // console.log("query done");
      assert.ifError(e)
      done()
    })
  } catch (assert) {
    console.log('error ' + assert)
    done(new Error(`
TEST FAILED, Insert into table failed (insertDataTSQL_CommonTestFunctions.js) with this error message:
${assert.toString()}`))
  }
}

//    batched query comprised of (currently) 3 TSQL queries
const compoundQueryTSQL = (Connection, tsql, ExpectedData1, ExpectedData2, ExpectedData3, testname, done) => {
  debugComments(`
test note compoundQueryTSQL_CommonTestFunctions.js ... executing: 
${tsql}`)
  let called = 0
  let NewExpectedData = ExpectedData1
  Connection.queryRaw(tsql, [], (e, r, more) => {
    ++called
    assert.ifError(e)
    if (called === 3) {
      NewExpectedData = ExpectedData3
    } else if (called === 2) {
      NewExpectedData = ExpectedData2
    }

    if (more) {
      try {
        debugComments('\ntest note compoundQueryTSQL01_CommonTestFunctions.js ... now in try{ } \n')
        assert.deepStrictEqual(r, NewExpectedData, dataComparisonFailed)
      } catch (assert) {
        debugComments('\ntest note compoundQueryTSQL02_CommonTestFunctions.js ... now in catch (assert): \n')
        dataComparisonFailedMessage(testname, NewExpectedData, r, done)
        return
      }
    } else {
      try {
        debugComments('\ntest note compoundQueryTSQL03_CommonTestFunctions.js ... now in try{ } \n')
        assert.deepStrictEqual(r, NewExpectedData, dataComparisonFailed)
      } catch (assert) {
        debugComments('\ntest note compoundQueryTSQL04_CommonTestFunctions.js ... now in catch (assert): \n')
        dataComparisonFailedMessage(testname, NewExpectedData, r, done)
        return
      }
    }
    if (!more) {
      done()
    }
  })
}

//    batched query comprised of (currently) 3 TSQL queries
const compoundQueryTSQLNewConnection = (ConnectionString, tsql, ExpectedData1, ExpectedData2, ExpectedData3, testname, done) => {
  debugComments(`
test note compoundQueryTSQL_CommonTestFunctions.js ... executing: 
${tsql}`)
  let called = 0
  let NewExpectedData = ExpectedData1
  sql.queryRaw(ConnectionString, tsql, [], (e, r, more) => {
    assert.ifError(e)

    ++called
    if (called === 3) {
      NewExpectedData = ExpectedData3
    } else if (called === 2) {
      NewExpectedData = ExpectedData2
    }
    if (more) {
      try {
        debugComments(`
test note compoundQueryTSQLNewConnection01_CommonTestFunctions.js ... now in try{ } 
`)
        assert.deepStrictEqual(r, NewExpectedData, dataComparisonFailed)
      } catch (assert) {
        debugComments(`
test note compoundQueryTSQLNewConnection02_CommonTestFunctions.js ... now in catch (assert): 
`)
        dataComparisonFailedMessage(testname, NewExpectedData, r, done)
        return
      }
    } else {
      try {
        debugComments(`
test note compoundQueryTSQLNewConnection03_CommonTestFunctions.js ... now in try{ } 
`)
        assert.deepStrictEqual(r, NewExpectedData, dataComparisonFailed)
      } catch (assert) {
        debugComments(`
test note compoundQueryTSQLNewConnection04_CommonTestFunctions.js ... now in catch (assert): 
`)
        dataComparisonFailedMessage(testname, NewExpectedData, r, done)
        return
      }
    }
    if (!more) {
      done()
    }
  })
}

//  'tsql' contains an invalid and should fail with the error 'ExpectedError'
const invalidQueryTSQL = (Connection, tsql, ExpectedError, testname, done) => {
  debugComments(`
test note invalidQueryTSQL_CommonTestFunctions.js ... executing: 
${tsql}`)
  Connection.queryRaw(tsql, [], e => {
    if (e) {
      debugComments(`
invalid query failed as expected 
`)
      done()
      e = null
    }
  })
}

// compare fetched results from an ordered SELECT stmt against expected results. If comparison fails,
// increment 'test failed' counter without causing tests to not respond via unhandled assert.
const verifyData = (Connection, TableName, ColumnName, ExpectedData, testname, done) => {
  const tsql = `SELECT * FROM ${TableName} ORDER BY id`
  debugComments(`
test note verifyData_CommonTestFunctions.js ... executing: 
${tsql}`)
  try {
    Connection.queryRaw(tsql, (e, r) => {
      if (e) {
        done(new Error(`
TEST FAILED, SELECT FROM table failed (verifyData_CommonTestFunctions.js) with this error message:
${e.toString()}`))
        return
      }
      try {
        debugComments(`
test note verifyData_CommonTestFunctions.js returned results: 
${util.inspect(r.rows[1])}`)
        assert.deepEqual(r, ExpectedData, dataComparisonFailed)
      } catch (assert) {
        dataComparisonFailedMessage(testname, ExpectedData, r, done)
        return
      }
      done()
    })
  } catch (e) {
    if (e) {
      done(new Error(`
TEST FAILED, SELECT FROM table failed (verifyData_CommonTestFunctions.js) with this error message:
${e.toString()}`))
    }
  }
}

// datetime types specific data verification function...
// compare fetched results from an ordered SELECT stmt against expected results. If comparison fails,
// increment 'test failed' counter without causing tests to not respond via unhandled assert.
const verifyDataDatetime = (Connection, TableName, ColumnName, RowWithNullData, ExpectedData, testname, done) => {
  const tsql = `SELECT col2 FROM ${TableName} ORDER BY id`
  let row = 23
  let numberOfRows = 72
  let numberOfRowsFetched = 0
  debugComments(`
test note verifyData_Datetime_CommonTestFunctions.js ... executing: 
${tsql}`)
  try {
    Connection.queryRaw(tsql, (e, r) => {
      if (e) {
        done(new Error(`
TEST FAILED, SELECT FROM table failed (verifyData_Datetime_CommonTestFunctions.js) with this error message:
${e.toString()}`))
        return
      }
      numberOfRows = r.rows.length
      // debugComments("\ntest note verifyData_Datetime01_CommonTestFunctions.js ...Now examining data ...numberOfRows = '" + numberOfRows + "' \n");
      for (row = 0; row < numberOfRows; row++) {
        numberOfRowsFetched++
        // debugComments("\ntest note verifyData_Datetime01H_CommonTestFunctions.js ...Now examining data 'util.inspect(r.rows[row=" + row + "])' = " + util.inspect(r.rows[row]) + " ... \n");
        if ((util.inspect(r.rows[row]) === util.inspect([null])) === true) {
          // debugComments("\ntest note verifyData_Datetime02_CommonTestFunctions.js ... data in row " + row + " is null \n");
          // convert 1-based row with null data to 0-based index value...
          if (row !== (RowWithNullData - 1)) {
            done(new Error(`
TEST FAILED, SELECT FROM table failed ... null not received as expected:
`))
            return
          }
        } else {
          const re = new Date(r.rows[row])
          try {
            // debugComments("\ntest note verifyData_Datetime03_CommonTestFunctions.js ... data in row " + row + " is not null \n");
            assert.deepEqual(re, ExpectedData, dataComparisonFailed)
          } catch (assert) {
            console.log(`test results re = ${re} ExpectedData = ${ExpectedData}`)
            dataComparisonFailedMessage(testname, ExpectedData, re, done)
            return
          }
        }
      }
      // debugComments("\ntest note verifyData_Datetime01J_CommonTestFunctions.js ...Now examining data 'numberOfRowsFetched = " + numberOfRowsFetched + " ... \n");
      if (row !== numberOfRowsFetched) {
        done(new Error(`
TEST FAILED, incorrect number of rows fetched ... expected ${row} but fetched ${numberOfRowsFetched} rows
`))
        return
      }
      done()
    })
  } catch (e) {
    if (e) {
      done(new Error(`
TEST FAILED, SELECT FROM table failed (verifyData_Datetime_CommonTestFunctions.js) with this error message:
${e.toString()}`))
    }
  }
}

exports.debugComments = debugComments
exports.errorComments = errorComments
exports.getTimezoneOffsetInHours = getTimezoneOffsetInHours
exports.createTable = createTable
exports.insertDataBP = insertDataBP
exports.insertDataTSQL = insertDataTSQL
exports.compoundQueryTSQL = compoundQueryTSQL
exports.compoundQueryTSQLNewConnection = compoundQueryTSQLNewConnection
exports.invalidQueryTSQL = invalidQueryTSQL
exports.verifyData = verifyData
exports.verifyData_Datetime = verifyDataDatetime
exports.SKIP_BINDPARAM_TEST_CASES = SKIP_BINDPARAM_TEST_CASES
exports.SKIP_FAILING_HANGING_TEST_CASES = SKIP_FAILING_HANGING_TEST_CASES
