'use strict'

/* globals describe before it */

const assert = require('assert')
const supp = require('../samples/typescript/demo-support')
const sql = require('msnodesqlv8')

describe('connection tests', () => {
  let connStr
  let support
  let helper
  let procedureHelper
  before(done => {
    supp.GlobalConn.init(sql, co => {
      connStr = global.conn_str || co.conn_str
      support = co.support
      procedureHelper = new support.ProcedureHelper(connStr)
      procedureHelper.setVerbose(false)
      helper = co.helper
      helper.setVerbose(false)
      done()
    }, global.conn_str)
  })

  it('connection closes OK in sequence with query', done => {
    sql.open(connStr,
      (err, conn) => {
        const expected = [{
          n: 1
        }]
        assert(err === null || err === false)
        conn.query('SELECT 1 as n', (err, results) => {
          assert.ifError(err)
          assert.deepStrictEqual(results, expected)
          conn.close(() => {
            done()
          })
        })
      })
  })
})
