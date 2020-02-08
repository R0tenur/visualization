/* global suite teardown teardown test setup */
'use strict'

const assert = require('assert')
const supp = require('../samples/typescript/demo-support')

suite('userbind', function () {
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
    theConnection.close(() => {
      done()
    })
  })

  function testUserBind (params, cb) {
    const allres = []
    let skip = false
    let error = null

    const sequence = [

      asyncDone => {
        theConnection.query(params.query, [params.setter(params.min)], (err, res) => {
          error = err
          if (err) {
            skip = true
            asyncDone()
          } else {
            allres.push(res[0])
            asyncDone()
          }
        })
      },

      asyncDone => {
        if (skip) {
          asyncDone()
          return
        }
        theConnection.query(params.query, [params.setter(params.max)], (err, res) => {
          error = err
          if (err) {
            skip = true
            asyncDone()
          } else {
            allres.push(res[0])
            asyncDone()
          }
        })
      },

      asyncDone => {
        if (skip) {
          asyncDone()
          return
        }
        if (Object.prototype.hasOwnProperty.call(params, 'test_null')) {
          if (!params.test_null) {
            asyncDone()
          }
        } else {
          theConnection.query(params.query, [params.setter(null)], (err, res) => {
            error = err
            if (err) {
              error = err
              asyncDone()
            } else {
              allres.push(res[0])
              asyncDone()
            }
          })
        }
      }
    ]

    async.series(sequence,
      () => {
        cb(error, allres)
      })
  }

  function compare (params, res) {
    const min = params.expected ? params.expected[0] : params.min
    const max = params.expected ? params.expected[1] : params.max
    const expected = [
      { v: min },
      { v: max }
    ]

    let testNull = true
    if (Object.prototype.hasOwnProperty.call(params, 'test_null')) {
      testNull = params.test_null
    }

    if (testNull) {
      expected.push({
        v: null
      })
    }

    assert.deepStrictEqual(res, expected)
  }

  test('user bind DateTimeOffset to sql type DateTimeOffset - provide offset of 60 minutes', testDone => {
    const offset = 60
    const scale = 7
    const now = new Date()
    const smalldt = new Date(Date.UTC(now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      14,
      0,
      0,
      0))

    const expected = new Date(smalldt.getTime() - offset * 60000)
    expected.nanosecondsDelta = 0
    const params = {
      query: 'declare @v DateTimeOffset = ?; select @v as v',
      min: smalldt,
      max: smalldt,
      expected: [
        expected,
        expected
      ],
      setter: v => {
        return sql.DateTimeOffset(v, scale, offset)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind DateTime2 to sql type datetime2(7) - with scale set to illegal value, should error', testDone => {
    const now = new Date()
    const params = {
      query: 'declare @v DATETIME2(7) = ?; select @v as v',
      min: now,
      max: now,
      setter: v => {
        return sql.DateTime2(v, 8) // set scale illegal
      }
    }
    testUserBind(params, err => {
      assert(err)
      testDone()
    })
  })

  test('user bind DateTime2 to sql type datetime2(7) - with scale set too low, should error', testDone => {
    const jsonDate = '2011-05-26T07:56:00.123Z'
    const then = new Date(jsonDate)
    const params = {
      query: 'declare @v DATETIME2(7) = ?; select @v as v',
      min: then,
      max: then,
      setter: v => {
        return sql.DateTime2(v, 1) // set scale too low
      }
    }
    testUserBind(params, err => {
      assert.ok(err.message.indexOf('Fractional second precision exceeds the scale specified') > 0)
      testDone()
    })
  })

  function repeat (a, num) {
    return new Array(num + 1).join(a)
  }

  test('user bind WLongVarChar to NVARCHAR(MAX)', testDone => {
    const smallLen = 2200
    const largeLen = 8200
    const params = {
      query: 'declare @v NVARCHAR(MAX) = ?; select @v as v',
      min: repeat('N', smallLen),
      max: repeat('X', largeLen),
      test_null: false,
      setter: v => {
        return sql.WLongVarChar(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind DateTimeOffset to sql type DateTimeOffset - no offset ', testDone => {
    const now = new Date()
    const smalldt = new Date(Date.UTC(now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      14,
      0,
      0,
      0))
    smalldt.nanosecondsDelta = 0
    const params = {
      query: 'declare @v DateTimeOffset = ?; select @v as v',
      min: smalldt,
      max: smalldt,
      setter: v => {
        return sql.DateTimeOffset(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind SmallDateTime to sql type smalldatetime', testDone => {
    const now = new Date()
    const smalldt = new Date(Date.UTC(now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      0,
      0))
    smalldt.nanosecondsDelta = 0
    const params = {
      query: 'declare @v smalldatetime = ?; select @v as v',
      min: smalldt,
      max: smalldt,
      setter: v => {
        return sql.SmallDateTime(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind DateTime2 to sql type datetime2(7) default scale', testDone => {
    const now = new Date()
    now.nanosecondsDelta = 0
    const params = {
      query: 'declare @v DATETIME2(7) = ?; select @v as v',
      min: now,
      max: now,
      setter: v => {
        return sql.DateTime2(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind DateTime2 to sql type datetime2(7) - with scale set correctly, should pass', testDone => {
    const now = new Date()
    now.nanosecondsDelta = 0
    const params = {
      query: 'declare @v DATETIME2(7) = ?; select @v as v',
      min: now,
      max: now,
      setter: v => {
        return sql.DateTime2(v, 3) // set scale just right for ms
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind DateTime to sql type datetime2(7)', testDone => {
    const now = new Date()
    now.nanosecondsDelta = 0
    const params = {
      query: 'declare @v DATETIME2(7) = ?; select @v as v',
      min: now,
      max: now,
      setter: v => {
        return sql.DateTime(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind DateTime to sql type datetime - driver currently only supports 10ms accuracy with datetime', testDone => {
    const now = sql.DateRound()
    now.nanosecondsDelta = 0
    const params = {
      query: 'declare @v DATETIME2(7) = ?; select @v as v',
      min: now,
      max: now,
      setter: v => {
        return sql.DateTime(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind UniqueIdentifier', (testDone) => {
    const params = {
      query: 'declare @v uniqueidentifier = ?; select @v as v',
      min: 'F01251E5-96A3-448D-981E-0F99D789110D',
      max: '45E8F437-670D-4409-93CB-F9424A40D6EE',
      setter: v => {
        return sql.UniqueIdentifier(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Time', (testDone) => {
    const today = new Date()
    const timeOnly = new Date(Date.UTC(1900,
      0,
      1,
      today.getUTCHours(),
      today.getUTCMinutes(),
      today.getUTCSeconds(),
      today.getUTCMilliseconds()))
    timeOnly.nanosecondsDelta = 0

    const params = {
      query: 'declare @v time = ?; select @v as v',
      min: today,
      max: today,
      expected: [
        timeOnly,
        timeOnly
      ],
      setter: v => {
        return sql.Time(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Date', testDone => {
    const today = new Date()
    const dateOnly = new Date(Date.UTC(today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      0,
      0,
      0,
      0))
    dateOnly.nanosecondsDelta = 0
    const params = {
      query: 'declare @v date = ?; select @v as v',
      min: today,
      max: today,
      expected: [
        dateOnly,
        dateOnly
      ],
      setter: v => {
        return sql.Date(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Xml - well formatted.', testDone => {
    const params = {
      query: 'declare @v xml = ?; select @v as v',
      min: '<Cars><Car id="1234"><Make>Volkswagen</Make><Model>Eurovan</Model><Year>2003</Year><Color>White</Color></Car></Cars>',
      max: '<Cars><Car id="1234"><Make>Volkswagen</Make><Model>Eurovan</Model><Year>2003</Year><Color>White</Color></Car><Car id="5678"><Make>Honda</Make><Model>CRV</Model><Year>2009</Year><Color>Black</Color><Mileage>35,600</Mileage></Car></Cars>',
      setter: v => {
        return sql.Xml(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Xml - bad xml should give error', (testDone) => {
    const params = {
      query: 'declare @v xml = ?; select @v as v',
      min: '',
      max: '<Cars><Car id="1234"><Make>Volkswagen</Make><Model>Eurovan</Model><Year>2003</Year><Color>White</Color></Cars>',
      setter: v => {
        return sql.Xml(v)
      }
    }
    testUserBind(params, err => {
      assert.ok(err.message.indexOf('end tag does not match start tag') > 0)
      testDone()
    })
  })

  test('user bind nchar - check truncated user strings (1)', testDone => {
    const params = {
      query: 'declare @v nchar(5) = ?; select @v as v',
      min: 'five',
      max: 'hello world',
      expected: [
        'five ',
        'hello'
      ],

      setter: v => {
        return sql.NChar(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Char - check truncated user strings (1)', testDone => {
    const params = {
      query: 'declare @v char(5) = ?; select @v as v',
      min: 'five',
      max: 'hello world',
      expected: [
        'five ',
        'hello'
      ],
      setter: v => {
        return sql.Char(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Char - returned string will be padded (2)', testDone => {
    const params = {
      query: 'declare @v char(5) = ?; select @v as v',
      min: 'h',
      max: 'world',
      expected: [
        'h    ',
        'world'
      ],
      setter: v => {
        return sql.Char(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Char - use precision to clip user string (3)', testDone => {
    const params = {
      query: 'declare @v char(11) = ?; select @v as v',
      min: 'h',
      max: 'world',
      expected: [
        'h' + new Array(11).join(' '),
        'wo' + new Array(10).join(' ')
      ],
      setter: v => {
        return sql.Char(v, 2)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind NVarChar /16 bit encoded', testDone => {
    const params = {
      query: 'declare @v varchar(100) = ?; select @v as v',
      min: 'hello',
      max: 'world',
      expected: [
        'hello',
        'world'
      ],
      setter: v => {
        return sql.NVarChar(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Float, maps to numeric data structure.', (testDone) => {
    const params = {
      query: 'declare @v float = ?; select @v as v',
      min: -1.7976931348623158E+308,
      max: 1.7976931348623158E+308,
      setter: v => {
        return sql.Float(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Double, maps to numeric data structure.', testDone => {
    const params = {
      query: 'declare @v float = ?; select @v as v',
      min: -1.7976931348623158E+308,
      max: 1.7976931348623158E+308,
      setter: v => {
        return sql.Float(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Bit', testDone => {
    const params = {
      query: 'declare @v bit = ?; select @v as v',
      min: false,
      max: true,
      setter: v => {
        return sql.Bit(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind BigInt', testDone => {
    const params = {
      query: 'declare @v bigint = ?; select @v as v',
      min: -9007199254740991,
      max: 9007199254740991,
      setter: v => {
        return sql.BigInt(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind Int', (testDone) => {
    const params = {
      query: 'declare @v int = ?; select @v as v',
      min: -2147483648,
      max: 2147483647,
      setter: v => {
        return sql.Int(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind TinyInt', testDone => {
    const params = {
      query: 'declare @v tinyint = ?; select @v as v',
      min: 0,
      max: 255,
      setter: v => {
        return sql.TinyInt(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })

  test('user bind SmallInt', testDone => {
    const params = {
      query: 'declare @v smallint = ?; select @v as v',
      min: -32768,
      max: 32767,
      setter: v => {
        return sql.SmallInt(v)
      }
    }
    testUserBind(params, (err, res) => {
      assert.ifError(err)
      compare(params, res)
      testDone()
    })
  })
})
