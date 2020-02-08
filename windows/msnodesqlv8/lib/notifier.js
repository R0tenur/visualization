/**
 * Created by Stephen on 28/06/2017.
 */

'use strict'

const notifyModule = ((() => {
  const events = require('events')
  const util = require('util')

  function NotifyFactory () {
    let nextId = 0

    function StreamEvents () {
      const queryId = nextId
      nextId += 1
      let theConnection
      let queryObj
      let queryWorker
      let operation
      let paused

      function isPaused () {
        return paused
      }

      function getQueryObj () {
        return queryObj
      }

      function getQueryId () {
        return queryId
      }

      function setOperation (id) {
        operation = id
      }

      function getOperation () {
        return operation
      }

      function setQueryObj (qo) {
        queryObj = qo
      }

      function setConn (c) {
        theConnection = c
      }

      function setQueryWorker (qw) {
        queryWorker = qw
        if (paused) {
          queryWorker.pause()
        }
      }

      function cancelQuery (cb) {
        if (theConnection) {
          theConnection.cancelQuery(this, cb)
        } else {
          setImmediate(() => {
            cb(new Error('[msnodesql] cannot cancel query where setConn has not been set'))
          })
        }
      }

      function pauseQuery () {
        paused = true
        if (queryWorker) {
          queryWorker.pause()
        }
      }

      function resumeQuery () {
        paused = false
        if (queryWorker) {
          queryWorker.resume()
        }
      }

      this.setOperation = setOperation
      this.getOperation = getOperation
      this.getQueryObj = getQueryObj
      this.getQueryId = getQueryId
      this.setConn = setConn
      this.setQueryObj = setQueryObj
      this.cancelQuery = cancelQuery
      this.setQueryWorker = setQueryWorker
      this.pauseQuery = pauseQuery
      this.resumeQuery = resumeQuery
      this.isPaused = isPaused

      events.EventEmitter.call(this)
    }

    util.inherits(StreamEvents, events.EventEmitter)

    function getChunkyArgs (paramsOrCallback, callback) {
      if ((typeof paramsOrCallback === 'object' &&
        Array.isArray(paramsOrCallback) === true) &&
        typeof callback === 'function') {
        return { params: paramsOrCallback, callback: callback }
      }

      if (!paramsOrCallback && typeof callback === 'function') {
        return { params: [], callback: callback }
      }

      if (typeof paramsOrCallback === 'function' && callback === undefined) {
        return { params: [], callback: paramsOrCallback }
      }

      if ((typeof paramsOrCallback === 'object' &&
        Array.isArray(paramsOrCallback) === true) &&
        callback === undefined) {
        return { params: paramsOrCallback, callback: null }
      }

      if ((!paramsOrCallback || paramsOrCallback === undefined) &&
        callback === undefined) {
        return { params: [], callback: null }
      }

      throw new Error('[msnodesql] Invalid parameter(s) passed to function query or queryRaw.')
    }

    function getQueryObject (p) {
      return typeof (p) === 'string'
        ? {
          query_str: p,
          query_timeout: 0,
          query_polling: false,
          query_tz_adjustment: 0
        }
        : p
    }

    function validateParameters (parameters, funcName) {
      parameters.forEach(p => {
        if (typeof p.value !== p.type) {
          throw new Error(['[msnodesql] Invalid ', p.name, ' passed to function ', funcName, '. Type should be ', p.type, '.'].join(''))
        }
      })
    }

    function validateQuery (queryOrObj, useUTC, parentFn) {
      const queryObj = getQueryObject(queryOrObj, useUTC)
      validateParameters(
        [
          {
            type: 'string',
            value: queryObj.query_str,
            name: 'query string'
          }
        ],
        parentFn
      )
      return queryObj
    }

    return {
      StreamEvents: StreamEvents,
      validateParameters: validateParameters,
      getChunkyArgs: getChunkyArgs,
      validateQuery: validateQuery
    }
  }

  return {
    NotifyFactory: NotifyFactory
  }
})())

exports.notifyModule = notifyModule
