'use strict'

// ---------------------------------------------------------------------------------------------------------------------------------
// File: bootstrap.js
// Contents: javascript which loads the native part of the Microsoft Driver for Node.js for SQL Server
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
//
// thanks to node-sqlever-unofficial for this bootstrap.
//
// ---------------------------------------------------------------------------------------------------------------------------------

var bootModule = (function () {
  var path = require('path')
  var binaryDir = path.join(__dirname, 'bin')
  var files = require('fs').readdirSync(binaryDir)

  function debugLoad () {
    var binaryDir = __dirname
    var filename = '..\\build\\Debug\\sqlserverv8.node'
    console.log('DEBUG mode filename ' + filename)
    var native = path.join(binaryDir, filename)
    console.log('DEBUG loading from native ' + native)
    try {
      module.exports = require(native)
    } catch (e) {
      console.log('failed to load library.')
      console.log(e)
    }
  }
  function liveLoad () {
    files.forEach(function (file) {
      if (noBinaryExported()) {
        attemptToExportBinary(file)
      }
    })

    failIfNoBinaryExported()

    // If the require fails, we can just ignore the exception and continue trying
    function attemptToExportBinary (filename) {
      try {
        var native = path.join(binaryDir, filename)
        module.exports = require(native)
      } catch (e) {
      }
    }

    function failIfNoBinaryExported () {
      if (noBinaryExported()) {
        throw new Error('None of the binaries loaded successfully. Is your node version either latest 4, 5, 6, 7, 8 or 9 ?')
      }
    }

    function noBinaryExported () {
      return !module.exports.hasOwnProperty('Connection')
    }
  }

  return {
    debugLoad: debugLoad,
    liveLoad: liveLoad
  }
}())

// bootModule.debugLoad()
bootModule.liveLoad()
