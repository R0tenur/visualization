// ---------------------------------------------------------------------------------------------------------------------------------
// File: params.js
// Contents: test suite for parameters
//
// Copyright Microsoft Corporation and contributors
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
// --------------------------------------------------------------------------------------------------------------------------------
//

/* global suite teardown teardown test setup */
'use strict'

const assert = require('assert')
const supp = require('../samples/typescript/demo-support')

suite('params', function () {
  const localDate = new Date()
  const utcDate = new Date(Date.UTC(localDate.getUTCFullYear(),
    localDate.getUTCMonth(),
    localDate.getUTCDate(),
    localDate.getUTCHours(),
    localDate.getUTCMinutes(),
    localDate.getUTCSeconds(),
    localDate.getUTCMilliseconds()))

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

  function testBoilerPlate (tableName, tableFields, insertFunction, verifyFunction, doneFunction) {
    let tableFieldsSql = ' (id int identity, '

    for (const field in tableFields) {
      if (Object.prototype.hasOwnProperty.call(tableFields, field)) {
        tableFieldsSql += field + ' ' + tableFields[field] + ','
      }
    }
    tableFieldsSql = tableFieldsSql.substr(0, tableFieldsSql.length - 1)
    tableFieldsSql += ')'

    const sequence = [

      asyncDone => {
        const dropQuery = `DROP TABLE ${tableName}`
        theConnection.query(dropQuery, () => {
          asyncDone()
        })
      },

      asyncDone => {
        const createQuery = `CREATE TABLE ${tableName}${tableFieldsSql}`
        theConnection.query(createQuery,
          e => {
            assert.ifError(e, 'Error creating table')
            asyncDone()
          })
      },

      asyncDone => {
        const clusteredIndexSql = ['CREATE CLUSTERED INDEX IX_', tableName, ' ON ', tableName, ' (id)'].join('')
        theConnection.query(clusteredIndexSql,
          e => {
            assert.ifError(e, 'Error creating index')
            asyncDone()
          })
      },

      asyncDone => {
        insertFunction(asyncDone)
      },

      asyncDone => {
        verifyFunction(() => {
          asyncDone()
        })
      }]

    async.series(sequence,
      () => {
        doneFunction()
      })
  }

  function runTest (columnDef, len, testDone) {
    testBoilerPlate('test_large_insert', { large_insert: columnDef },
      done => {
        const largeText = repeat('A', len)
        theConnection.query('INSERT INTO test_large_insert (large_insert) VALUES (?)', [largeText], e => {
          assert.ifError(e, 'Error inserting large string')
          done()
        })
      },

      done => {
        theConnection.query('SELECT large_insert FROM test_large_insert', (e, r) => {
          assert.ifError(e)
          assert(r[0].large_insert.length === len, 'Incorrect length for large insert')
          done()
        })
      },
      () => {
        testDone()
      })
  }

  test('select a long string using streaming - ensure no fragmentation', testDone => {
    function repeat (a, num) {
      return new Array(num + 1).join(a)
    }

    const longString = repeat('a', 40 * 1024)
    const expected = [
      {
        long_string: longString
      }
    ]
    const res = []
    const colNames = []
    const query = theConnection.query('declare @str nvarchar (MAX);set @str=?;DECLARE @sql NVARCHAR(MAX) = @str; SELECT @str AS long_string', [longString])
    query.on('column', (c, d) => {
      assert(c === 0)
      const obj = {}
      obj[colNames[c]] = d
      res.push(obj)
    })
    query.on('error', e => {
      assert(e)
    })
    query.on('meta', m => {
      colNames.push(m[0].name)
    })
    query.on('done', () => {
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('mssql set @str=?;DECLARE @sql NVARCHAR(MAX) = @str; SELECT @s AS s', testDone => {
    const STR_LEN = 2001
    const str = '1'.repeat(STR_LEN)
    //  [sql.WLongVarChar(str)]
    theConnection.query('declare @str nvarchar (MAX);set @str=?;DECLARE @sql NVARCHAR(MAX) = @str; SELECT @str AS data', [str], (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: str
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  // declare @str nvarchar (MAX);set @str=?;DECLARE @sql NVARCHAR(MAX) = @str; SELECT @s AS s;

  test('insert string 100 in nchar(100)', testDone => {
    runTest('nchar(100)', 100, () => {
      testDone()
    })
  })

  test('insert string 500 in nvarchar(1000)', testDone => {
    runTest('nvarchar(1000)', 500, () => {
      testDone()
    })
  })

  test('insert string 4 x 1024 in varchar(8000)', testDone => {
    runTest('varchar(8000)', 4 * 1024, () => {
      testDone()
    })
  })

  test('insert string 6 x 1024 in varchar(8000)', testDone => {
    runTest('varchar(8000)', 6 * 1024, () => {
      testDone()
    })
  })

  test('insert string 30 x 1024 in varchar(max)', testDone => {
    runTest('varchar(max)', 30 * 1024, () => {
      testDone()
    })
  })

  test('insert string 2 x 1024 * 1024 in varchar(max)', testDone => {
    runTest('varchar(max)', 2 * 1024 * 1024, () => {
      testDone()
    })
  })

  test('insert string 60 x 1024 in varchar(max)', testDone => {
    runTest('varchar(max)', 60 * 1024, () => {
      testDone()
    })
  })

  test('verify empty string is sent as empty string, not null', testDone => {
    theConnection.query('declare @s NVARCHAR(MAX) = ?; select @s as data', [''], (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: ''
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify that non-Buffer object parameter returns an error', testDone => {
    const o = { field1: 'value1', field2: -1 }
    testBoilerPlate('non_buffer_object',
      { object_col: 'varbinary(100)' },
      asyncDone => {
        theConnection.queryRaw('INSERT INTO non_buffer_object (object_col) VALUES (?)', [o], e => {
          const expectedError = new Error('IMNOD: [msnodesql] Parameter 1: Invalid parameter type')
          expectedError.code = -1
          expectedError.sqlstate = 'IMNOD'
          assert.deepStrictEqual(e, expectedError)
          asyncDone()
        })
      },
      done => {
        done()
      },
      () => {
        testDone()
      })
  })

  test('verify Buffer objects as input parameters', testDone => {
    const b = Buffer.from('0102030405060708090a', 'hex')
    testBoilerPlate(
      'buffer_param_test',
      { buffer_param: 'varbinary(100)' },

      done => {
        theConnection.queryRaw('INSERT INTO buffer_param_test (buffer_param) VALUES (?)', [b], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT buffer_param FROM buffer_param_test WHERE buffer_param = ?', [b], (e, r) => {
          assert.ifError(e)
          assert(r.rows.length = 1)
          assert.deepStrictEqual(r.rows[0][0], b)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('insert min and max number values', testDone => {
    testBoilerPlate(
      'minmax_test',
      { f: 'float' },

      done => {
        const fns =
          [
            asyncDone => {
              theConnection.queryRaw('INSERT INTO minmax_test (f) VALUES (?)', [Number.MAX_VALUE],
                e => {
                  assert.ifError(e)
                  asyncDone()
                })
            },

            asyncDone => {
              theConnection.queryRaw('INSERT INTO minmax_test (f) VALUES (?)', [-Number.MAX_VALUE],
                e => {
                  assert.ifError(e)
                  asyncDone()
                })
            }
          ]

        async.series(fns, () => {
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT f FROM minmax_test order by id', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [
              { name: 'f', size: 53, nullable: true, type: 'number', sqlType: 'float' }],
            rows: [
              [1.7976931348623157e+308],
              [-1.7976931348623157e+308]]
          }
          assert.deepStrictEqual(r, expected, 'minmax results don\'t match')
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('select a long string using callback', testDone => {
    function repeat (a, num) {
      return new Array(num + 1).join(a)
    }

    const longString = repeat('a', 50000)
    const expected = [
      {
        long_string: longString
      }
    ]
    theConnection.query('select ? as long_string', [longString], (err, res) => {
      assert.ifError(err)
      assert.deepStrictEqual(res, expected)
      testDone()
    })
  })

  test('select a long buffer using callback', testDone => {
    function repeat (a, num) {
      return new Array(num + 1).join(a)
    }

    const longString = repeat('a', 50000)
    const longBuffer = Buffer.from(longString)
    const expected = [
      {
        long_binary: longBuffer
      }
    ]
    theConnection.query('select ? as long_binary', [longBuffer], (err, res) => {
      assert.ifError(err)
      assert.deepStrictEqual(res, expected)
      testDone()
    })
  })

  test('verify buffer longer than column causes error', testDone => {
    const b = Buffer.from('0102030405060708090a', 'hex')
    testBoilerPlate('buffer_param_test', { buffer_param: 'varbinary(5)' },
      done => {
        theConnection.queryRaw('INSERT INTO buffer_param_test (buffer_param) VALUES (?)', [b], e => {
          const expectedError = new Error('[Microsoft][SQL Server Native Client 11.0][SQL Server]String or binary data would be truncated.')
          expectedError.sqlstate = '22001'
          expectedError.code = 8152
          assert.deepStrictEqual(e, expectedError)
          done()
        })
      },
      done => {
        done()
      },
      () => {
        testDone()
      })
  })

  function repeat (a, num) {
    return new Array(num + 1).join(a)
  }

  test('verify null string is sent as null, not empty string', testDone => {
    theConnection.query('declare @s NVARCHAR(MAX) = ?; select @s as data', [null], (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: null
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify single char string param', testDone => {
    theConnection.query('declare @s NVARCHAR(MAX) = ?; select @s as data', ['p'], (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: 'p'
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify bool (true) to sql_variant', testDone => {
    theConnection.query('select cast(CAST(\'TRUE\' as bit) as sql_variant) as data;', (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: true
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify bool (false) to sql_variant', testDone => {
    theConnection.query('select cast(CAST(\'FALSE\' as bit) as sql_variant) as data;', (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: false
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify varchar to sql_variant', testDone => {
    theConnection.query('select cast(\'hello\' as sql_variant) as data;', (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: 'hello'
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify numeric decimal to sql_variant', testDone => {
    theConnection.query('select cast(11.77 as sql_variant) as data;', (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: 11.77
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('verify int to sql_variant', testDone => {
    theConnection.query('select cast(10000 as sql_variant) as data;', (err, res) => {
      assert.ifError(err)
      const expected = [{
        data: 10000
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  function toUTC (localDate) {
    return new Date(
      Date.UTC(
        localDate.getUTCFullYear(),
        localDate.getUTCMonth(),
        localDate.getUTCDate(),
        localDate.getUTCHours(),
        0,
        0,
        0))
  }

  test('verify getdate (datetime) to sql_variant', testDone => {
    const smalldt = toUTC(new Date())
    theConnection.query('select cast(convert(datetime, ?) as sql_variant) as data', [smalldt], (err, res) => {
      assert.ifError(err)
      let date = res[0].data
      assert(date instanceof Date)
      date = toUTC(date)
      assert(smalldt.getYear() === date.getYear())
      assert(smalldt.getMonth() === date.getMonth())
      assert(smalldt.getDay() === date.getDay())
      testDone()
    })
  })

  test('verify getdate to sql_variant', testDone => {
    theConnection.query('select cast(getdate() as sql_variant) as data;', (err, res) => {
      assert.ifError(err)
      const date = res[0].data
      assert(date instanceof Date)
      testDone()
    })
  })

  test('insert null as parameter', testDone => {
    testBoilerPlate(
      'null_param_test',
      { null_test: 'varchar(1)' },
      done => {
        theConnection.queryRaw('INSERT INTO null_param_test (null_test) VALUES (?)', [null], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT null_test FROM null_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'null_test', size: 1, nullable: true, type: 'text', sqlType: 'varchar' }],
            rows: [[null]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('invalid numbers cause errors', testDone => {
    const sequence = [
      asyncDone => {
        theConnection.queryRaw('INSERT INTO invalid_numbers_test (f) VALUES (?)', [Number.POSITIVE_INFINITY], e => {
          const expectedError = new Error('IMNOD: [msnodesql] Parameter 1: Invalid number parameter')
          expectedError.code = -1
          expectedError.sqlstate = 'IMNOD'
          assert.deepStrictEqual(e, expectedError)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.queryRaw('INSERT INTO invalid_numbers_test (f) VALUES (?)', [Number.NEGATIVE_INFINITY], e => {
          const expectedError = new Error('IMNOD: [msnodesql] Parameter 1: Invalid number parameter')
          expectedError.code = -1
          expectedError.sqlstate = 'IMNOD'

          assert.deepStrictEqual(e, expectedError)
          asyncDone()
        })
      }
    ]

    testBoilerPlate(
      'invalid_numbers_test',
      { f: 'float' },
      done => {
        async.series(sequence, () => {
          done()
        })
      },
      done => {
        done()
      },
      () => {
        testDone()
      }
    )
  })

  test('insert string as parameter', testDone => {
    testBoilerPlate(
      'string_param_test',
      { string_test: 'nvarchar(100)' },
      done => {
        theConnection.queryRaw('INSERT INTO string_param_test (string_test) VALUES (?)', ['This is a test'], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT string_test FROM string_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'string_test', size: 100, nullable: true, type: 'text', sqlType: 'nvarchar' }],
            rows: [['This is a test']]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('insert a bool as a parameter', testDone => {
    testBoilerPlate('bool_param_test',
      { bool_test: 'bit' },

      done => {
        theConnection.queryRaw('INSERT INTO bool_param_test (bool_test) VALUES (?)', [true], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT bool_test FROM bool_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'bool_test', size: 1, nullable: true, type: 'boolean', sqlType: 'bit' }],
            rows: [[true]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },

      () => {
        testDone()
      })
  })

  test('insert largest positive int as parameter', testDone => {
    testBoilerPlate('int_param_test', { int_test: 'int' },
      done => {
        theConnection.queryRaw('INSERT INTO int_param_test (int_test) VALUES (?)', [0x7fffffff], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT int_test FROM int_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'int_test', size: 10, nullable: true, type: 'number', sqlType: 'int' }],
            rows: [[2147483647]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('insert largest negative int as parameter', testDone => {
    testBoilerPlate('int_param_test', { int_test: 'int' },

      done => {
        theConnection.queryRaw('INSERT INTO int_param_test (int_test) VALUES (?)', [-0x80000000], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT int_test FROM int_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'int_test', size: 10, nullable: true, type: 'number', sqlType: 'int' }],
            rows: [[-2147483648]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('insert bigint as parameter', testDone => {
    testBoilerPlate('bigint_param_test', { bigint_test: 'bigint' },
      done => {
        theConnection.queryRaw('INSERT INTO bigint_param_test (bigint_test) VALUES (?)', [0x80000000], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT bigint_test FROM bigint_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'bigint_test', size: 19, nullable: true, type: 'number', sqlType: 'bigint' }],
            rows: [[0x80000000]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },

      () => {
        testDone()
      })
  })

  test('insert largest bigint as parameter', testDone => {
    testBoilerPlate('bigint_param_test', { bigint_test: 'bigint' },
      done => {
        theConnection.queryRaw('INSERT INTO bigint_param_test (bigint_test) VALUES (?)', [0x4fffffffffffffff], e => {
          assert.ifError(e)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT bigint_test FROM bigint_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{ name: 'bigint_test', size: 19, nullable: true, type: 'number', sqlType: 'bigint' }],
            rows: [[0x4fffffffffffffff]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },

      () => {
        testDone()
      })
  })

  test('insert decimal as parameter', testDone => {
    testBoilerPlate('decimal_param_test', { decimal_test: 'decimal(18,7)' },

      done => {
        theConnection.queryRaw('INSERT INTO decimal_param_test (decimal_test) VALUES (?)', [3.141593],
          e => {
            assert.ifError(e)
            done()
          })
      },

      done => {
        theConnection.queryRaw('SELECT decimal_test FROM decimal_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{
              name: 'decimal_test',
              size: 18,
              nullable: true,
              type: 'number',
              sqlType: 'decimal'
            }],
            rows: [[3.141593]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('insert decimal as bigint parameter', testDone => {
    testBoilerPlate('decimal_as_bigint_param_test', { decimal_bigint: 'bigint' },
      done => {
        theConnection.queryRaw('INSERT INTO decimal_as_bigint_param_test (decimal_bigint) VALUES (?)', [123456789.0],
          e => {
            assert.ifError(e)
            done()
          })
      },

      done => {
        theConnection.queryRaw('SELECT decimal_bigint FROM decimal_as_bigint_param_test', (e, r) => {
          assert.ifError(e)
          const expected = {
            meta: [{
              name: 'decimal_bigint',
              size: 19,
              nullable: true,
              type: 'number',
              sqlType: 'bigint'
            }],
            rows: [[123456789]]
          }
          assert.deepStrictEqual(expected, r)
          done()
        })
      },

      () => {
        testDone()
      })
  })

  test('insert date as parameter', testDone => {
    testBoilerPlate('date_param_test', { date_test: 'datetimeoffset' },

      done => {
        theConnection.queryRaw('INSERT INTO date_param_test (date_test) VALUES (?)', [utcDate],
          e => {
            assert.ifError(e)
            done()
          })
      },

      done => {
        theConnection.queryRaw('SELECT date_test FROM date_param_test', (e, r) => {
          assert.ifError(e)
          assert.strictEqual(utcDate.toISOString(), r.rows[0][0].toISOString(), 'dates are not equal')
          assert.strictEqual(r.rows[0][0].nanosecondsDelta, 0, 'nanoseconds not 0')
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('verify js date inserted into datetime field', testDone => {
    const localDate = new Date()
    const utcDate = new Date(Date.UTC(localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
      localDate.getUTCSeconds(),
      localDate.getUTCMilliseconds()))

    testBoilerPlate('datetime_test', { datetime_test: 'datetime' },
      done => {
        theConnection.queryRaw('INSERT INTO datetime_test (datetime_test) VALUES (?)', [utcDate], (e, r) => {
          assert.ifError(e)
          assert(r.rowcount === 1)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT * FROM datetime_test', (e, r) => {
          assert.ifError(e)
          assert(r.rows[0][0], utcDate)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('verify empty string inserted into nvarchar field', testDone => {
    testBoilerPlate('emptystring_test', { emptystring_test: 'nvarchar(1)' },
      done => {
        theConnection.queryRaw('INSERT INTO emptystring_test (emptystring_test) VALUES (?)', [''], (e, r) => {
          assert.ifError(e)
          assert(r.rowcount === 1)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT * FROM emptystring_test', (e, r) => {
          assert.ifError(e)
          assert(r.rows[0][0], '')
          done()
        })
      },

      () => {
        testDone()
      })
  })

  test('insert large string into max column', testDone => {
    testBoilerPlate('test_large_insert', { large_insert: 'nvarchar(max) ' },
      done => {
        const largeText = repeat('A', 10000)
        theConnection.query('INSERT INTO test_large_insert (large_insert) VALUES (?)', [largeText], e => {
          assert.ifError(e, 'Error inserting large string')
          done()
        })
      },

      done => {
        theConnection.query('SELECT large_insert FROM test_large_insert', (e, r) => {
          assert.ifError(e)
          assert(r[0].large_insert.length === 10000, 'Incorrect length for large insert')
          done()
        })
      },

      () => {
        testDone()
      })
  })

  test('verify js date inserted into datetime field', testDone => {
    const localDate = new Date()
    const utcDate = new Date(Date.UTC(localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
      localDate.getUTCSeconds(),
      localDate.getUTCMilliseconds()))

    testBoilerPlate('datetime_test', { datetime_test: 'datetime' },

      done => {
        theConnection.queryRaw('INSERT INTO datetime_test (datetime_test) VALUES (?)', [utcDate], (e, r) => {
          assert.ifError(e)
          assert(r.rowcount === 1)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT * FROM datetime_test', (e, r) => {
          assert.ifError(e)
          assert(r.rows[0][0], utcDate)
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('verify js date before 1970 inserted into datetime field', testDone => {
    const ancientDate = new Date(1492, 10, 11, 6, 32, 46, 578)
    const utcDate = new Date(Date.UTC(ancientDate.getUTCFullYear(),
      ancientDate.getUTCMonth(),
      ancientDate.getUTCDate(),
      ancientDate.getUTCHours(),
      ancientDate.getUTCMinutes(),
      ancientDate.getUTCSeconds(),
      ancientDate.getUTCMilliseconds()))

    testBoilerPlate('datetime_test', { datetime_test: 'datetimeoffset(3)' },

      done => {
        theConnection.queryRaw('INSERT INTO datetime_test (datetime_test) VALUES (?)', [utcDate], (e, r) => {
          assert.ifError(e)
          assert(r.rowcount === 1)
          done()
        })
      },

      done => {
        theConnection.queryRaw('SELECT datetime_test FROM datetime_test', (e, r) => {
          assert.ifError(e)
          assert.strictEqual(r.rows[0][0].valueOf(), utcDate.valueOf())
          done()
        })
      },
      () => {
        testDone()
      })
  })

  // verify fix for a bug that would return the wrong day when a datetimeoffset was inserted where the date
  // was before 1/1/1970 and the time was midnight.
  test('verify dates with midnight time', testDone => {
    const midnightDate = new Date(Date.parse('2030-08-13T00:00:00.000Z'))
    midnightDate.nanosecondsDelta = 0

    testBoilerPlate('midnight_date_test', { midnight_date_test: 'datetimeoffset(3)' },
      done => {
        const insertQuery = 'INSERT INTO midnight_date_test (midnight_date_test) VALUES (?);'
        theConnection.queryRaw(insertQuery, [midnightDate], e => {
          assert.ifError(e)
          done()
        })
      },
      // test valid dates
      done => {
        theConnection.queryRaw('SELECT midnight_date_test FROM midnight_date_test', (e, r) => {
          assert.ifError(e)
          const expectedDates = []
          expectedDates.push([midnightDate])
          const expectedResults = {
            meta: [{
              name: 'midnight_date_test',
              size: 30,
              nullable: true,
              type: 'date',
              sqlType: 'datetimeoffset'
            }],
            rows: expectedDates
          }
          assert.deepStrictEqual(expectedResults.meta, r.meta)
          assert(r.rows.length === 1)
          for (const row in r.rows) {
            for (const d in row) {
              assert.deepStrictEqual(expectedResults.rows[row][d], r.rows[row][d])
            }
          }
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('verify bug fix for last day of the year error', testDone => {
    const eoyDate = new Date(Date.parse('1960-12-31T11:12:13.000Z'))
    eoyDate.nanosecondsDelta = 0
    testBoilerPlate('eoy_date_test', { eoy_date_test: 'datetimeoffset(3)' },
      done => {
        const insertQuery = 'INSERT INTO eoy_date_test (eoy_date_test) VALUES (?);'
        theConnection.queryRaw(insertQuery, [eoyDate], e => {
          assert.ifError(e)
          done()
        })
      },

      // test valid dates
      done => {
        theConnection.queryRaw('SELECT eoy_date_test FROM eoy_date_test', (e, r) => {
          assert.ifError(e)
          const expectedDates = []
          expectedDates.push([eoyDate])
          const expectedResults = {
            meta: [{
              name: 'eoy_date_test',
              size: 30,
              nullable: true,
              type: 'date',
              sqlType: 'datetimeoffset'
            }],
            rows: expectedDates
          }
          assert.deepStrictEqual(expectedResults.meta, r.meta)
          assert(r.rows.length === 1)
          for (const row in r.rows) {
            for (const d in row) {
              assert.deepStrictEqual(expectedResults.rows[row][d], r.rows[row][d])
            }
          }
          done()
        })
      },
      () => {
        testDone()
      })
  })

  test('bind a null to binary using sqlTypes.asVarBinary(null)', testDone => {
    theConnection.query('declare @bin binary(4) = ?; select @bin as bin', [sql.VarBinary(null)], (err, res) => {
      assert.ifError(err)
      const expected = [{
        bin: null
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })

  test('bind a Buffer([0,1,2,3])] to binary', testDone => {
    theConnection.query('declare @bin binary(4) = ?; select @bin as bin', [Buffer.from([0, 1, 2, 3])], (err, res) => {
      assert.ifError(err)
      const expected = [{
        bin: Buffer.from([0, 1, 2, 3])
      }]
      assert.deepStrictEqual(expected, res)
      testDone()
    })
  })
})
