'use strict'

const EventEmitter = require('events').EventEmitter

const debug = require('debug')('msnodesqlv8-sequelize')
const mssql = require('msnodesqlv8')
const uuid = require('uuid')

const Request = require('./request.js')

function detectDriver () {
  const drivers = [
    'SQL Server Native Client 12.0',
    'SQL Server Native Client 11.0',
    'SQL Server Native Client 10.0',
    'SQL Native Client',
    'SQL Server'
  ]
  let detectedDriver = null
  return drivers.reduce((prev, driver) => {
    return prev.then(() => {
      if (detectedDriver !== null) {
        return
      }
      return new Promise((resolve) => {
        mssql.open(`Driver=${driver};`, (err, conn) => {
          if (err) {
            if (err.message.indexOf('Neither DSN nor SERVER keyword supplied') !== -1 && detectedDriver === null) {
              detectedDriver = driver
            }
          } else {
            // Should not be possible because nothing but driver is specified.
            conn.close(() => {})
          }
          resolve()
        })
      })
    })
  }, Promise.resolve()).then(() => {
    if (detectedDriver) {
      return detectedDriver
    }
    throw new Error('driver was not specified and no driver was detected')
  })
}

class Connection extends EventEmitter {
  constructor (config) {
    super()

    config = Object.assign({}, config, config.options)
    delete config.options

    if (!config.connectionString) {
      if (typeof config.instanceName !== 'string' || config.instanceName.match(/^MSSQLSERVER$/i)) {
        config.instanceName = ''
      }
      config.connectionString = (config.driver ? `Driver={${config.driver}};` : '') +
        `Server=${config.server ? config.server : 'localhost'}\\${config.instanceName};` +
        (config.database ? `Database=${config.database};` : '') +
        (config.trustedConnection ? 'Trusted_Connection=yes;' : `Uid=${config.userName || ''};Pwd=${config.password || ''};`)
    }

    this.uuid = uuid.v4()
    this.config = config
    this.connection = null
    this.connectionCloseFunc = null
    this.timer = null
    this.requests = []

    Promise.resolve().then(() => {
      const match = this.config.connectionString.match(/(?:^\s*Driver\s*=)|(?:;\s*Driver\s*=)/i)
      if (!match) {
        return detectDriver().then((driver) => {
          this.config.driver = driver
          this.config.connectionString = `Driver={${driver}};${this.config.connectionString}`
        })
      }
    }).then(() => {
      this.connect()
    }).catch((err) => {
      this.emit('connect', err)
    })
  }

  get closed () {
    return this.connection === null || this.connection.close !== this.connectionCloseFunc
  }

  get loggedIn () {
    return !this.closed
  }

  connect () {
    mssql.open(this.config.connectionString, (err, conn) => {
      if (!err) {
        debug(`connection (${this.uuid}): opened`)
        this.connection = conn
        this.connectionCloseFunc = conn.close
        // Poll connection to make sure it is still open.
        this.timer = setInterval(() => {
          if (this.closed) {
            this.reset()
          }
        }, 5000)
      }
      this.emit('connect', err)
    })
  }

  reset () {
    debug(`connection (${this.uuid}): reset by peer`)
    const error = new Error('connection reset by peer')
    error.code = 'ECONNRESET'
    this.emit('error', error)
  }

  close () {
    clearInterval(this.timer)
    this.timer = null
    if (this.connection !== null) {
      this.connection.close((err) => {
        this.connection = null
        this.emit('end', err)
      })
    } else {
      this.emit('end', new Error('connection already closed'))
    }
    this.requests.slice().forEach((request) => this.removeRequest(request, new Error('connection closed')))
    debug(`connection (${this.uuid}): closed`)
  }

  beginTransaction (callback, name) {
    name = name ? `[${name}]` : ''
    const request = new Request(`BEGIN TRANSACTION ${name};`, (err) => {
      if (typeof callback === 'function') {
        callback(err)
      }
    })
    request.execute(this)
  }

  commitTransaction (callback, name) {
    name = name ? `[${name}]` : ''
    const request = new Request(`COMMIT TRANSACTION ${name};`, (err) => {
      if (typeof callback === 'function') {
        callback(err)
      }
    })
    request.execute(this)
  }

  rollbackTransaction (callback, name) {
    name = name ? `[${name}]` : ''
    const request = new Request(`ROLLBACK TRANSACTION ${name};`, (err) => {
      if (typeof callback === 'function') {
        callback(err)
      }
    })
    request.execute(this)
  }

  saveTransaction (callback, name) {
    if (!name) {
      callback(new Error('name required for transaction savepoint'))
      return
    }
    name = `[${name}]`
    const request = new Request(`SAVE TRANSACTION ${name};`, (err) => {
      if (typeof callback === 'function') {
        callback(err)
      }
    })
    request.execute(this)
  }

  execSql (request) {
    request.execute(this)
  }

  removeRequest (request, error) {
    debug(`connection (${this.uuid}): removing request (${request.uuid})`)
    const index = this.requests.indexOf(request)
    if (index !== -1) {
      this.requests.splice(index, 1)
      if (error && typeof request.callback === 'function') {
        request.callback(error)
      }
    }
  }
}

module.exports = Connection
