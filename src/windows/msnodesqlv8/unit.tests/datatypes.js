// ---------------------------------------------------------------------------------------------------------------------------------
// File: datatypes.js
// Contents: test suite for verifying the driver can use SQL Server Datatypes
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
// ---------------------------------------------------------------------------------------------------------------------------------`

'use strict'

const assert = require('assert')
const commonTestFns = require('./CommonTestFunctions')
const supp = require('../samples/typescript/demo-support')
const fs = require('fs')

/* global suite teardown teardown test setup */

suite('datatypes', function () {
  const tablename = 'types_table'
  let testname = 'not set yet'

  let theConnection
  this.timeout(20000)
  let connStr
  let async
  let helper
  let driver

  const sql = global.native_sql

  setup(testDone => {
    supp.GlobalConn.init(sql, co => {
      connStr = global.conn_str || co.conn_str
      driver = co.driver
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
    theConnection.close(() => {
      done()
    })
  })

  testname = 'test 023a - fetch large varbinary in chunks \'varbinary(max)\', fetch as binary'
  test(testname, done => {
    const testcolumntype = ' varbinary(' + 'max' + ')'
    const testcolumnname = 'col1'

    const buffer = []
    let i
    for (i = 0; i < 2 * 1024 * 1024; ++i) {
      buffer[buffer.length] = i % 255
    }

    const binaryBuffer = Buffer.from(buffer)

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        const s = `insert into ${tablename} (${testcolumnname} )  values ( ? )`
        theConnection.query(s, [binaryBuffer], (err, res) => {
          assert.ifError(err)
          assert(res)
          assert(res.length === 0)
          asyncDone()
        })
      },
      asyncDone => {
        const s = `select ${testcolumnname} from ${tablename}`
        theConnection.query(s, [binaryBuffer], (err, res) => {
          assert.ifError(err)
          const b = res[0].col1
          assert.deepStrictEqual(b, binaryBuffer)
          asyncDone()
        })
      },
      function () {
        done()
      }
    ]) // end of async.series()
    // end of test():
  })

  test('write / read an image column', done => {
    const testcolumntype = ' Image'
    const testcolumnname = 'col1'
    const path = require('path')
    let binaryBuffer

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

    function readAsBinary (file) {
      return new Promise((resolve, reject) => {
        const p = path.join(__dirname, 'data', file)
        readFile(p).then(d => {
          resolve(Buffer.from(d))
        }).catch(e => {
          reject(e)
        })
      })
    }

    async.series([
      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        readAsBinary('SampleJPGImage_50kbmb.jpg').then(x => {
          binaryBuffer = x
          asyncDone()
        })
      },
      asyncDone => {
        const s = `insert into ${tablename} (${testcolumnname} )  values ( ? )`
        theConnection.query(s, [sql.LongVarBinary(binaryBuffer)], (err, res) => {
          assert.ifError(err)
          assert(res)
          assert(res.length === 0)
          asyncDone()
        })
      },
      asyncDone => {
        const s = `select ${testcolumnname} from ${tablename}`
        theConnection.query(s, [], (err, res) => {
          assert.ifError(err)
          const b = res[0].col1
          assert.deepStrictEqual(b, binaryBuffer)
          asyncDone()
        })
      },
      function () {
        done()
      }
    ]) // end of async.series()
  })

  testname = 'test 001 - verify functionality of data type \'smalldatetime\', fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 16
    const testcolumntype = ' smalldatetime'
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const rowWithNullData = 1
    // test date = 1955-12-13 12:43:00
    const year = 1955
    const month = 12
    const day = 13
    const hour = 12
    const minute = 43
    const second = 0
    const nanosecond = 0
    const testdata2Expected = `${year}-${month}-${day} ${hour}:${minute}:${second}`
    const testdata2TsqlInsert = `'${testdata2Expected}'`
    // Month in JS is 0-based, so expected will be month minus 1
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)

    const actions =
      [
        asyncDone => {
          // console.log("createTable");
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, () => {
            // console.log("run");
            asyncDone()
          })
        },
        asyncDone => {
          // console.log("insertDataTSQL");
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, null, () => {
            // console.log("run");
            asyncDone()
          })
        },
        asyncDone => {
          // console.log("insertDataTSQL");
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, () => {
            // console.log("run");
            asyncDone()
          })
        },
        asyncDone => {
          // console.log("verifyData_Datetime");
          commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
            // console.log("run");
            asyncDone()
          })
        }
      ]

    async.series(actions,
      () => {
        // console.log("all done ... end each");
        done()
      })
  })

  testname = 'test 002 - verify functionality of data type \'datetime\', fetch as date'
  test(testname, done => {
    // var testcolumnsize = 23
    const testcolumntype = ' datetime'
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const rowWithNullData = 2
    // test date = 2007-05-08 12:35:29.123
    const year = 2007
    const month = 5
    const day = 8
    const hour = 12
    const minute = 35
    const second = 29.123
    const nanosecond = 0
    const testdata2Expected = `${year}-${month}-${day} ${hour}:${minute}:${second}`
    const testdata2TsqlInsert = `'${testdata2Expected}'`
    // Month in JS is 0-based, so expected will be month minus 1
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)

    const fns = [
      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, () => {
          asyncDone()
        })
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, () => {
          asyncDone()
        })
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, null, () => {
          asyncDone()
        })
      },
      asyncDone => {
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    }) // end of async.series()
  }) // end of test(

  testname = 'test 003_a - insert valid data into time(7) via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 16
    const testdatetimescale = 7
    const testcolumntype = ` time(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = <default date> 12:10:05.1234567
    const year = 1900
    const month = 1
    const day = 1
    const hour = 12
    const minute = 10
    const second = 5
    const nanosecond = 0
    // Month in JS is 0-based, so expected will be month minus 1
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)
    const testdata2Expected = '12:10:05.1234567'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

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
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  }) // end of test()

  testname = 'test 003_b - insert valid data into time(0) via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 16
    const testdatetimescale = 0
    const testcolumntype = ` time(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = <default date> 12:10:05
    const year = 1900
    const month = 1
    const day = 1
    const hour = 12
    const minute = 10
    const second = 5
    const nanosecond = 0
    // Month in JS is 0-based, so expected will be month minus 1
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)
    const testdata2Expected = '12:10:05.1234567'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

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
          commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
            asyncDone()
          })
        }
      ]

    async.series(fns, () => {
      done()
    }) // end of async.series()
  }) // end of test()

  testname = 'test 004_a - insert valid data into datetime2(7) via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 27
    const testdatetimescale = 7
    const testcolumntype = ` datetime2(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = 2001-04-10 10:12:59.1234567
    const year = 2001
    const month = 4
    const day = 10
    const hour = 10
    const minute = 12
    const second = 59.1234567
    const nanosecond = 0
    // Month in JS is 0-based, so expected will be month minus 1
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)
    const testdata2Expected = '2001-04-10 10:12:59.1234567'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

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
          commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
            asyncDone()
          })
        }
      ]

    async.series(fns, () => {
      done()
    }) // end of async.series()
  })

  testname = 'test 004_b - insert valid data into datetime2(0) via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 19
    const testdatetimescale = 0
    const testcolumntype = ` datetime2(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = 2001-04-10 10:12:59.1234567
    const year = 2001
    const month = 4
    const day = 10
    const hour = 10
    const minute = 12
    const second = 59
    const nanosecond = 0
    // Month in JS is 0-based, so expected will be month minus 1
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)
    const testdata2Expected = '2001-04-10 10:12:59.1234567'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

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
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  }) // end of test()

  testname = 'test 005_a - insert valid data into datetimeoffset(7) via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 34
    const testdatetimescale = 7
    const testcolumntype = ` datetimeoffset(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = 2001-04-10 10:12:59.1234567 +13:30
    const year = 2001
    const month = 4
    const day = 10
    const hour = 10
    const minute = 12
    const second = 59.1234567
    const nanosecond = 0
    const offsetHours = 13
    const offsetMinutes = 30
    // Month in JS is 0-based, so expected will be month minus 1

    const jsDateExpected = new Date(year, month - 1, day, hour, minute, second, nanosecond)
    jsDateExpected.setHours(jsDateExpected.getHours() - commonTestFns.getTimezoneOffsetInHours(year, month, day))
    jsDateExpected.setHours(jsDateExpected.getHours() - offsetHours)
    jsDateExpected.setMinutes(jsDateExpected.getMinutes() - offsetMinutes)

    const testdata2Expected = `2001-04-10 10:12:59.1234567 +${offsetHours}:${offsetMinutes}`
    const testdata2TsqlInsert = `'${testdata2Expected}'`

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
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  }) // end of test()

  testname = 'test 005_b - insert valid data into datetimeoffset(0) via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 26
    const testdatetimescale = 0
    const testcolumntype = ` datetimeoffset(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = 2001-04-10 10:12:59 +13:30
    const year = 2001
    const month = 4
    const day = 10
    const hour = 10
    const minute = 12
    const second = 59
    const nanosecond = 0
    const offsetHours = 13
    const offsetMinutes = 30
    // Month in JS is 0-based, so expected will be month minus 1

    const jsDateExpected = new Date(year, month - 1, day, hour, minute, second, nanosecond)
    jsDateExpected.setHours(jsDateExpected.getHours() - commonTestFns.getTimezoneOffsetInHours(year, month, day))
    jsDateExpected.setHours(jsDateExpected.getHours() - offsetHours)
    jsDateExpected.setMinutes(jsDateExpected.getMinutes() - offsetMinutes)

    const testdata2Expected = `2001-04-10 10:12:59.1234567 +${offsetHours}:${offsetMinutes}`
    const testdata2TsqlInsert = `'${testdata2Expected}'`

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
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  }) // end of test()

  testname = 'test 006_a - insert valid data into datetimeoffset(7) via TSQL, fetch as date UTC'
  test(testname, done => {
    //  var testcolumnsize = 34
    const testdatetimescale = 7
    const testcolumntype = ` datetimeoffset(${testdatetimescale})`
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = 2001-04-10 10:12:59 +13:30
    const year = 2001
    const month = 4
    const day = 10
    const hour = 10
    const minute = 12
    const second = 59
    const nanosecond = 0
    const offsetHours = 13
    const offsetMinutes = 30
    // Month in JS is 0-based, so expected will be month minus 1

    const jsDateExpected = new Date(Date.UTC(year, month - 1, day, hour, minute, second, nanosecond))
    jsDateExpected.setHours(jsDateExpected.getHours() - offsetHours)
    jsDateExpected.setMinutes(jsDateExpected.getMinutes() - offsetMinutes)

    const testdata2Expected = `2001-04-10 10:12:59.1234567 +${offsetHours}:${offsetMinutes}`
    const testdata2TsqlInsert = '\'' + testdata2Expected + '\''

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
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  }) // end of test()

  testname = 'test 007 - insert valid data into date via TSQL, fetch as date'
  test(testname, done => {
    //  var testcolumnsize = 10
    //  var testdatetimescale = 0
    const testcolumntype = ' date'
    //  var testcolumnclienttype = 'date'
    const testcolumnname = 'col2'
    const testdata1 = null
    const rowWithNullData = 1
    // test date = 2005-12-21
    const year = 2005
    const month = 12
    const day = 21
    const hour = 0
    const minute = 0
    const second = 0
    const nanosecond = 0
    const testdata2Expected = '2005-12-21'
    const testdata2TsqlInsert = `'${testdata2Expected}'`
    const jsDateExpected = new Date(year, month - 1, day, hour - commonTestFns.getTimezoneOffsetInHours(year, month, day), minute, second, nanosecond)

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
        commonTestFns.verifyData_Datetime(theConnection, tablename, testcolumnname, rowWithNullData, jsDateExpected, testname, () => {
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      done()
    })
  }) // end of test()

  testname = 'test 008 - insert null into varchar(max) via TSQL, fetch as text'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' varchar(max)'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'varchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'string data row 2'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  // currently, buffer size is 2048 characters, so a 2048 char string should not call 'more' in the OdbcConnection.cpp, but fetch entire result set at once.
  testname = 'test 008_bndryCheck_VC - insert 2048 char string into varchar(max) via TSQL, fetch as text'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' varchar(max)'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'varchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const A100CharacterString = '0234567890123456789022345678903234567890423456789052345678906234567890723456789082345678909234567890'
    const A2000CharacterString = A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString
    const testdata2Expected = 'AStringWith2048Characters_aaaa5aaa10aaa15aaa20aa' + A2000CharacterString
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  // currently, buffer size is 2048 characters, so a 2049 char string should call 'more' in the OdbcConnection.cpp and concatenate to correctly return larger data
  testname = 'test 008_bndryCheck_NVC - insert 2049 char string into nvarchar(max) via TSQL, fetch as text'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' nvarchar(max)'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'nvarchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const A100CharacterString = '0234567890123456789022345678903234567890423456789052345678906234567890723456789082345678909234567890'
    const A2000CharacterString = A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString + A100CharacterString
    const testdata2Expected = `AStringWith2049Characters_aaaa5aaa10aaa15aaa20aaa${A2000CharacterString}`
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 009 - verify functionality of data type \'guid\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 36
    const testcolumntype = ' uniqueidentifier'
    const testcolumnclienttype = 'text'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = '0E984725-C51C-4BF4-9960-E1C80E27ABA0'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    if (commonTestFns.SKIP_FAILING_TEST_ISSUE_34 === true) {
      done()
    } else {
      async.series([
        asyncDone => {
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
        },
        () => {
          commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
        }
      ]) // end of async.series()
    }
    // end of test():
  })

  testname = 'test 010 - verify functionality of data type \'tinyint\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 3
    const testcolumntype = ' tinyint'
    const testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 255
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 011 - verify functionality of data type \'smallint\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 5
    const testcolumntype = ' smallint'
    const testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 32767
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 012 - verify functionality of data type \'int\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 10
    const testcolumntype = ' int'
    const testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = -2147483648
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 013 - verify functionality of data type \'bigint\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 19
    const testcolumntype = ' bigint'
    const testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = -9223372036854775808
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    if (commonTestFns.SKIP_FAILING_HANGING_TEST_CASES === true) {
      done()
    } else {
      async.series([

        asyncDone => {
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
        },
        () => {
          commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
        }
      ]) // end of async.series()
    }
    // end of test():
  })

  testname = 'test 014 - verify functionality of data type \'smallmoney\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 10
    const testcolumntype = ' smallmoney'
    const testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 214748.3647
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 015 - verify functionality of data type \'money\', fetch as number'
  test(testname, done => {
    //  var testcolumnsize = 19
    const testcolumntype = ' money'
    //  var testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2TsqlInsert = -922337203685477.5808

    const tsql = 'SELECT * FROM types_table ORDER BY id'
    const expectedError = `[Microsoft][${driver}][SQL Server]Arithmetic overflow`

    if (commonTestFns.SKIP_FAILING_HANGING_TEST_CASES === true) {
      done()
    } else {
      async.series([
        asyncDone => {
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
        },
        () => {
          commonTestFns.invalidQueryTSQL(theConnection, tsql, expectedError, testname, done)
          //                commonTestFns.verifyData(c, tablename, testcolumnname, expected, testname, done);
        }
      ]) // end of async.series()
    }
    // end of test():
  })

  testname = 'test 016 - verify functionality of data type \'numeric(7,3)\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 7
    const testcolumntype = ' numeric(7,3)'
    const testcolumnclienttype = 'number'
    const testcolumnsqltype = 'numeric'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 1234.567
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 017 - verify functionality of data type \'decimal(7,3)\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 7
    const testcolumntype = ' decimal(7,3)'
    const testcolumnclienttype = 'number'
    const testcolumnsqltype = 'decimal'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 1234.567
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 018 - verify functionality of data type \'bit\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 1
    const testcolumntype = ' bit'
    const testcolumnclienttype = 'boolean'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2TsqlInsert = 1

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, true]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 019 - verify functionality of data type \'float(53)\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 53
    const testcolumntype = ' float(53)'
    const testcolumnclienttype = 'number'
    const testcolumnsqltype = 'float'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = '1.79E+308'
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 020 - verify functionality of data type \'real\', fetch as number'
  test(testname, done => {
    const testcolumnsize = 24
    const testcolumntype = ' real'
    const testcolumnclienttype = 'number'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = '44.44000244140625'
    const testdata2TsqlInsert = testdata2Expected

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 021 - verify functionality of data type \'binary(n)\', fetch as binary'
  test(testname, done => {
    const testcolumnsize = 10
    const testcolumntype = ` binary(${testcolumnsize})`
    const testcolumnclienttype = 'binary'
    const testcolumnsqltype = 'binary'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2TsqlInsert = 0x0123

    const binaryBuffer = Buffer.from('00000000000000000123', 'hex')

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, binaryBuffer]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 022 - verify functionality of data type \'varbinary(n)\', fetch as binary'
  test(testname, done => {
    const testcolumnsize = 10
    const testcolumntype = ` varbinary(${testcolumnsize})`
    const testcolumnclienttype = 'binary'
    const testcolumnsqltype = 'varbinary'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2TsqlInsert = 0x0123

    const binaryBuffer = Buffer.from('00000123', 'hex')

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, binaryBuffer]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 023 - verify functionality of data type \'varbinary(max)\', fetch as binary'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' varbinary(max)'
    const testcolumnclienttype = 'binary'
    const testcolumnsqltype = 'varbinary'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2TsqlInsert = 'CONVERT(varbinary(max), 0x0123456789AB)'
    const binaryBuffer = Buffer.from('0123456789AB', 'hex')
    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, binaryBuffer]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 024 - verify functionality of data type \'image\', fetch as binary'
  test(testname, done => {
    const testcolumnsize = 2147483647
    const testcolumntype = ' image'
    const testcolumnclienttype = 'binary'
    const testcolumnname = 'col2'
    const testdata1 = null
    //  var testdata2Expected = 0x0123
    const testdata2TsqlInsert = 'CONVERT(varbinary(50), 0x0123456789AB)'
    const binaryBuffer = Buffer.from('0123456789AB', 'hex')

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, binaryBuffer]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 025 - verify functionality of data type \'xml\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' xml'
    const testcolumnclienttype = 'text'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = '<data>zzzzz</data>'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    if (commonTestFns.SKIP_FAILING_TEST_ISSUE_36 === true) {
      done()
    } else {
      async.series([
        asyncDone => {
          commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
        },
        asyncDone => {
          commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
        },
        () => {
          commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
        }
      ]) // end of async.series()
    }
    // end of test():
  })

  testname = 'test 026 - verify functionality of data type \'char\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 10
    const testcolumntype = ` char(${testcolumnsize})`
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'char'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'char data '
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 027 - verify functionality of data type \'varchar(n)\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 20
    const testcolumntype = ` varchar(${testcolumnsize})`
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'varchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'varchar data'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 028 - verify functionality of data type \'varchar(max)\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' varchar(max)'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'varchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'varchar_max data'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 029 - verify functionality of data type \'text\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 2147483647
    const testcolumntype = ' text'
    const testcolumnclienttype = 'text'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'text data'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 030 - verify functionality of data type \'nchar\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 10
    const testcolumntype = ` nchar(${testcolumnsize})`
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'nchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'char data '
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 031 - verify functionality of data type \'nvarchar(n)\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 20
    const testcolumntype = ` nvarchar(${testcolumnsize})`
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'nvarchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'nvarchar data'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 032 - verify functionality of data type \'nvarchar(max)\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 0
    const testcolumntype = ' nvarchar(max)'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'nvarchar'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'nvarchar_max data'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumnsqltype
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 033 - verify functionality of data type \'ntext\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 1073741823
    const testcolumntype = ' ntext'
    const testcolumnclienttype = 'text'
    const testcolumnname = 'col2'
    const testdata1 = null
    const testdata2Expected = 'ntext data'
    const testdata2TsqlInsert = `'${testdata2Expected}'`

    const expected = {
      meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
        {
          name: testcolumnname,
          size: testcolumnsize,
          nullable: true,
          type: testcolumnclienttype,
          sqlType: testcolumntype.trim()
        }],
      rows: [[1, testdata1],
        [2, testdata2Expected]]
    }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ]) // end of async.series()
    // end of test():
  })

  testname = 'test 034 - verify functionality of data type \'sysname\', fetch as text'
  test(testname, done => {
    const testcolumnsize = 128
    const testcolumntype = ' sysname'
    const testcolumnclienttype = 'text'
    const testcolumnsqltype = 'nvarchar'
    const testcolumnname = 'col2'
    const testdata1Expected = ''
    const testdata1TsqlInsert = `'${testdata1Expected}'`
    const testdata2Expected = 'sysname data'
    const testdata2TsqlInsert = '\'' + testdata2Expected + '\''

    const expected =
      {
        meta: [{ name: 'id', size: 10, nullable: false, type: 'number', sqlType: 'int identity' },
          {
            name: testcolumnname,
            size: testcolumnsize,
            nullable: false,
            type: testcolumnclienttype,
            sqlType: testcolumnsqltype
          }],
        rows: [[1, testdata1Expected],
          [2, testdata2Expected]]
      }

    async.series([

      asyncDone => {
        commonTestFns.createTable(theConnection, tablename, testcolumnname, testcolumntype, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata1TsqlInsert, asyncDone)
      },
      asyncDone => {
        commonTestFns.insertDataTSQL(theConnection, tablename, testcolumnname, testdata2TsqlInsert, asyncDone)
      },
      () => {
        commonTestFns.verifyData(theConnection, tablename, testcolumnname, expected, testname, done)
      }
    ])
  })
})
