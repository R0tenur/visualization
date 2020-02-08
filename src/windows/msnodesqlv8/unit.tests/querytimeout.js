/* global suite teardown teardown test setup */
'use strict'

const assert = require('assert')
const supp = require('../samples/typescript/demo-support')

suite('querytimeout', function () {
  this.timeout(20 * 1000)
  const sql = global.native_sql

  let theConnection
  let connStr
  let helper

  setup(testDone => {
    supp.GlobalConn.init(sql, co => {
      connStr = global.conn_str || co.conn_str
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

  test('test timeout 2 secs on waitfor delay 10', testDone => {
    const queryObj = {
      query_str: 'waitfor delay \'00:00:10\';',
      query_timeout: 2
    }

    theConnection.query(queryObj, err => {
      assert(err)
      assert(err.message.indexOf('Query timeout expired') > 0)
      testDone()
    })
  })

  test('test timeout 10 secs on waitfor delay 2', testDone => {
    const queryObj = {
      query_str: 'waitfor delay \'00:00:2\';',
      query_timeout: 10
    }

    theConnection.query(queryObj, err => {
      assert.ifError(err)
      testDone()
    })
  })

  test('test timeout 0 secs on waitfor delay 4', testDone => {
    const queryObj = {
      query_str: 'waitfor delay \'00:00:4\';'
    }

    theConnection.query(queryObj, err => {
      assert.ifError(err)
      testDone()
    })
  })
})
