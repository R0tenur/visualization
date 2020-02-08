// ---------------------------------------------------------------------------------------------------------------------------------
// File: dates.js
// Contents: test suite for queries and parameters dealing with dates
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
// ---------------------------------------------------------------------------------------------------------------------------------

/* global suite teardown teardown test setup */
'use strict'

const assert = require('assert')
const supp = require('../samples/typescript/demo-support')

suite('date tests', function () {
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

  test('time to millisecond components', testDone => {
    const randomHour = Math.floor(Math.random() * 24)
    const randomMinute = Math.floor(Math.random() * 60)
    const randomSecond = Math.floor(Math.random() * 60)
    let randomMs = []
    const nanoseconds = [1e-9 * 100, 0.9999999, 0.5]
    const nanosecondsDeltaExpected = [1e-7, 0.0009999, 0]

    const fns =
      [
        asyncDone => {
          theConnection.queryRaw('DROP TABLE time_test', () => {
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('CREATE TABLE time_test (id int identity, test_time time, test_datetime2 datetime2, test_datetimeoffset datetimeoffset)', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('CREATE CLUSTERED INDEX IX_time_test ON time_test(id)', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        // insert all the hours and make sure they come back from time column
        asyncDone => {
          let query = ['INSERT INTO time_test (test_time) VALUES ']

          for (let h = 0; h <= 23; ++h) {
            query.push(['(\'', h, ':00:00.00\'),'].join(''))
          }
          query = query.join('')
          query = query.substr(0, query.length - 1)
          query += ';'

          theConnection.queryRaw(query, e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          let expectedHour = -1
          const stmt = theConnection.queryRaw('SELECT test_time FROM time_test ORDER BY id')
          stmt.on('error', e => {
            assert.ifError(e)
          })
          stmt.on('column', (c, d, more) => {
            ++expectedHour
            assert(c === 0)
            assert(!more)
            const expectedDate = new Date(Date.UTC(1900, 0, 1, expectedHour, 0, 0, 0))
            expectedDate.nanosecondsDelta = 0
            assert.deepStrictEqual(d, expectedDate)
          })
          stmt.on('done', () => {
            assert(expectedHour === 23)
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('TRUNCATE TABLE time_test', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        // insert all the hours and make sure they come back from time column
        asyncDone => {
          let query = ['INSERT INTO time_test (test_time) VALUES ']
          for (let m = 0; m <= 59; ++m) {
            query.push(['(\'', randomHour, ':', m, ':00.00\'),'].join(''))
          }
          query = query.join('')
          query = query.substr(0, query.length - 1)
          query += ';'

          theConnection.queryRaw(query, e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          let expectedMinute = -1

          const stmt = theConnection.queryRaw('SELECT test_time FROM time_test ORDER BY id')

          stmt.on('error', e => {
            assert.ifError(e)
          })
          stmt.on('column', (c, d, more) => {
            ++expectedMinute
            assert(c === 0)
            assert(!more)
            var expectedDate = new Date(Date.UTC(1900, 0, 1, randomHour, expectedMinute, 0, 0))
            expectedDate.nanosecondsDelta = 0
            assert.deepStrictEqual(d, expectedDate)
          })
          stmt.on('done', () => {
            assert(expectedMinute === 59)
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('TRUNCATE TABLE time_test', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        // insert all the hours and make sure they come back from time column
        asyncDone => {
          let query = ['INSERT INTO time_test (test_time) VALUES ']

          for (let s = 0; s <= 59; ++s) {
            query.push(['(\'', randomHour, ':', randomMinute, ':', s, '.00\'),'].join(''))
          }
          query = query.join('')
          query = query.substr(0, query.length - 1)
          query += ';'

          theConnection.queryRaw(query, e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          let expectedSecond = -1
          const stmt = theConnection.queryRaw('SELECT test_time FROM time_test ORDER BY id')

          stmt.on('error', e => {
            assert.ifError(e)
          })
          stmt.on('column', (c, d, more) => {
            ++expectedSecond
            assert(c === 0)
            assert(!more)
            const expectedDate = new Date(Date.UTC(1900, 0, 1, randomHour, randomMinute, expectedSecond, 0))
            expectedDate.nanosecondsDelta = 0
            assert.deepStrictEqual(d, expectedDate)
          })
          stmt.on('done', () => {
            assert(expectedSecond === 59)
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('TRUNCATE TABLE time_test', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        // insert a sampling of milliseconds and make sure they come back correctly
        asyncDone => {
          let query = ['INSERT INTO time_test (test_time) VALUES ']
          randomMs = []

          for (let ms = 0; ms <= 50; ++ms) {
            randomMs.push(Math.floor(Math.random() * 1000))
            query.push(['(\'', randomHour, ':', randomMinute, ':', randomSecond, (randomMs[ms] / 1000).toFixed(3).substr(1), '\'),'].join(''))
          }
          query = query.join('')
          query = query.substr(0, query.length - 1)
          query += ';'

          theConnection.queryRaw(query, e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          let msCount = -1

          const stmt = theConnection.queryRaw('SELECT test_time FROM time_test ORDER BY id')

          stmt.on('error', e => {
            assert.ifError(e)
          })
          stmt.on('column', (c, d, more) => {
            ++msCount
            assert(c === 0)
            assert(!more)
            const expectedDate = new Date(Date.UTC(1900, 0, 1, randomHour, randomMinute, randomSecond, randomMs[msCount]))
            expectedDate.nanosecondsDelta = 0
            assert.deepStrictEqual(d, expectedDate, 'Milliseconds didn\'t match')
          })
          stmt.on('done', () => {
            assert(msCount === 50)
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('TRUNCATE TABLE time_test', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        // insert a sampling of milliseconds and make sure they come back correctly
        asyncDone => {
          let query = ['INSERT INTO time_test (test_time) VALUES ']

          for (const i in nanoseconds) {
            query.push(['(\'', randomHour, ':', randomMinute, ':', randomSecond, (nanoseconds[i]).toFixed(7).substr(1), '\'),'].join(''))
          }
          query = query.join('')
          query = query.substr(0, query.length - 1)
          query += ';'

          theConnection.queryRaw(query, e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          let nsCount = -1

          const stmt = theConnection.queryRaw('SELECT test_time FROM time_test ORDER BY id')

          stmt.on('error', e => {
            assert.ifError(e)
          })
          stmt.on('column', (c, d, more) => {
            ++nsCount
            assert(c === 0)
            assert(!more)
            const expectedDate = new Date(Date.UTC(1900, 0, 1, randomHour, randomMinute, randomSecond, nanoseconds[nsCount] * 1000))
            expectedDate.nanosecondsDelta = nanosecondsDeltaExpected[nsCount]
            assert.deepStrictEqual(d, expectedDate, 'Nanoseconds didn\'t match')
          })
          stmt.on('done', () => {
            assert(nsCount === 2)
            asyncDone()
          })
        }
      ]

    async.series(fns, () => {
      testDone()
    })
  })

  // this test simply verifies dates round trip.  It doesn't try to verify illegal dates vs. legal dates.
  // SQL Server is assumed to be only returning valid times and dates.
  test('date retrieval verification', testDone => {
    const testDates = ['1-1-1970', '12-31-1969', '2-29-1904', '2-29-2000']
    const fns = [
      asyncDone => {
        theConnection.queryRaw('DROP TABLE date_test', () => {
          asyncDone()
        })
      },
      asyncDone => {
        theConnection.queryRaw('CREATE TABLE date_test (id int identity, test_date date)', e => {
          assert.ifError(e)
          asyncDone()
        })
      },
      asyncDone => {
        theConnection.queryRaw('CREATE CLUSTERED INDEX IX_date_test ON date_test(id)', e => {
          assert.ifError(e)
          asyncDone()
        })
      },
      asyncDone => {
        let insertQuery = 'INSERT INTO date_test (test_date) VALUES '
        for (const testDate of testDates) {
          insertQuery += '(\'' + testDate + '\'),'
        }
        insertQuery = insertQuery.substr(0, insertQuery.length - 1)
        insertQuery += ';'
        theConnection.queryRaw(insertQuery, e => {
          assert.ifError(e)
          asyncDone()
        })
      },
      // test valid dates
      asyncDone => {
        theConnection.setUseUTC(false)
        theConnection.queryRaw('SELECT test_date FROM date_test', (e, r) => {
          assert.ifError(e)
          const expectedDates = []
          for (const testDate of testDates) {
            const d = new Date(testDate)
            // eslint-disable-next-line camelcase
            const now_utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
              d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds())
            const expectedDate = new Date(now_utc)
            expectedDates.push([expectedDate])
          }
          const expectedResults = {
            meta: [{ name: 'test_date', size: 10, nullable: true, type: 'date', sqlType: 'date' }],
            rows: expectedDates
          }
          assert.deepStrictEqual(expectedResults.meta, r.meta)
          for (const row in r.rows) {
            for (const d in row) {
              assert.deepStrictEqual(expectedResults.rows[row][d], r.rows[row][d])
            }
          }
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('test timezone offset correctly offsets js date type', testDone => {
    theConnection.query('select convert(datetimeoffset(7), \'2014-02-14 22:59:59.9999999 +05:00\') as dto1, convert(datetimeoffset(7), \'2014-02-14 17:59:59.9999999 +00:00\') as dto2',
      function (err, res) {
        assert.ifError(err)
        const dto1 = res['dto1']
        const dto2 = res['dto2']
        assert(dto1 === dto2)
        testDone()
      })
  })

  // this test simply verifies dates round trip.  It doesn't try to verify illegal dates vs. legal dates.
  // SQL Server is assumed to be only returning valid times and dates.

  test('date to millisecond verification', testDone => {
    const testDates = [{ date1: '1-1-1900', date2: '1-1-1901', milliseconds: 31536000000 },
      { date1: '2-28-1900', date2: '3-1-1900', milliseconds: 86400000 },
      { date1: '2-28-1904', date2: '3-1-1904', milliseconds: 172800000 },
      { date1: '2-28-2000', date2: '3-1-2000', milliseconds: 172800000 },
      { date1: '1-1-1970', date2: '12-31-1969', milliseconds: -86400000 },
      { date1: '1-1-1969', date2: '1-1-1968', milliseconds: -(31536000000 + 86400000) },
      { date1: '2-3-4567', date2: '2-3-4567', milliseconds: 0 }]

    const fns = [
      asyncDone => {
        theConnection.queryRaw('DROP TABLE date_diff_test', () => {
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.queryRaw('CREATE TABLE date_diff_test (id int identity, date1 datetime2, date2 datetime2)', e => {
          assert.ifError(e)
          asyncDone()
        })
      },

      asyncDone => {
        theConnection.queryRaw('CREATE CLUSTERED INDEX IX_date_diff_test ON date_diff_test(id)', e => {
          assert.ifError(e)
          asyncDone()
        })
      },

      asyncDone => {
        let insertQuery = 'INSERT INTO date_diff_test (date1, date2) VALUES '
        for (const i in testDates) {
          insertQuery += ['(\'', testDates[i].date1, '\',\'', testDates[i].date2, '\'),'].join('')
        }
        insertQuery = insertQuery.substr(0, insertQuery.length - 1)
        insertQuery = insertQuery + ';'
        theConnection.queryRaw(insertQuery, e => {
          assert.ifError(e)
          asyncDone()
        })
      },

      // test valid dates
      asyncDone => {
        theConnection.queryRaw('SELECT date1, date2 FROM date_diff_test ORDER BY id', (e, r) => {
          assert.ifError(e)
          for (const d in r.rows) {
            const timeDiff = r.rows[d][1].getTime() - r.rows[d][0].getTime()
            assert(timeDiff === testDates[d].milliseconds)
          }
          asyncDone()
        })
      }
    ]

    async.series(fns, () => {
      testDone()
    })
  })

  test('test timezone components of datetimeoffset', testDone => {
    const tzYear = 1970
    const tzMonth = 0
    const tzDay = 1
    const tzHour = 0
    const tzMinute = 0
    const tzSecond = 0

    const insertedDate = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzSecond))
    const msPerHour = 1000 * 60 * 60

    const fns =
      [
        asyncDone => {
          theConnection.queryRaw('DROP TABLE datetimeoffset_test', () => {
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.query('CREATE TABLE datetimeoffset_test (id int identity, test_datetimeoffset datetimeoffset)', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          theConnection.queryRaw('CREATE CLUSTERED INDEX IX_datetimeoffset_test ON datetimeoffset_test(id)', e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          let query = ['INSERT INTO datetimeoffset_test (test_datetimeoffset) VALUES ']

          // there are some timezones not on hour boundaries, but we aren't testing those in these unit tests
          for (let tz = -12; tz <= 12; ++tz) {
            query.push(['(\'', (tzYear < 1000) ? '0' + tzYear : tzYear, '-', tzMonth + 1, '-', tzDay,
              ' ', tzHour, ':', tzMinute, ':', tzSecond, (tz < 0) ? '' : '+', tz, ':00\'),'].join(''))
          }
          query = query.join('')
          query = query.substr(0, query.length - 1)
          query += ';'

          theConnection.queryRaw(query, e => {
            assert.ifError(e)
            asyncDone()
          })
        },
        asyncDone => {
          const stmt = theConnection.queryRaw('SELECT test_datetimeoffset FROM datetimeoffset_test ORDER BY id')
          let tz = -13

          stmt.on('error', e => {
            assert.ifError(e)
          })
          stmt.on('column', function (c, d, m) {
            assert(c === 0, 'c != 0')
            assert(!m, 'm != false')
            assert(d.nanosecondsDelta === 0, 'nanosecondsDelta != 0')
            ++tz
            const expectedDate = new Date(insertedDate.valueOf() - (msPerHour * tz))
            assert(d.valueOf() === expectedDate.valueOf(), 'Dates don\'t match')
          })
          stmt.on('done', () => {
            assert(tz === 12, 'Incorrect final timezone')
            asyncDone()
          })
        }
      ]

    async.series(fns, () => {
      testDone()
    })
  })
})
