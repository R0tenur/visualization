[![Build status](https://ci.appveyor.com/api/projects/status/7swf644d37pqdmuj/branch/master?svg=true)](https://ci.appveyor.com/project/TimelordUK/node-sqlserver-v8/branch/master) [![npm version](https://badge.fury.io/js/msnodesqlv8.svg)](https://badge.fury.io/js/msnodesqlv8) 
[![GitHub stars](https://img.shields.io/github/stars/TimelordUK/node-sqlserver-v8.svg)](https://github.com/TimelordUK/node-sqlserver-v8/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/TimelordUK/node-sqlserver-v8.svg)](https://github.com/TimelordUK/node-sqlserver-v8/issues)
[![npm](https://img.shields.io/npm/dm/msnodesqlv8.svg)]() 
[![npm](https://img.shields.io/npm/dy/msnodesqlv8.svg)]()

# msnodesqlv8

1. pause/resume long running query
1. sequelize support directly included
1. supports input/output parameters.
1. captures return code from stored procedure.
1. will obtain meta data describing parameters.
1. compatibe with Node 10, 11, 12, 13
1. electron 5, 6 supported.
1. includes 64 bit/ia32 precompiled libraries.
1. npm install with npm install msnodesqlv8
1. bulk table operations insert, delete, update
1. prepared statements
1. table value parameters
1. use with sequelize

## Node JS support for SQL server 

Based on node-sqlserver, this version will compile in Visual Studio 2015/2017 and is built against the v8 node module API.  Included in the repository are pre compiled binaries for both x64 and x86 targets.

This library only works with Node versions greater than 10.0

## Installing

Install the package from npm:

```
npm install msnodesqlv8 --save
```

## Getting started

please see [wiki](https://github.com/TimelordUK/node-sqlserver-v8/wiki) for documentation.

### JavaScript

Require the module, and write a simple program link this:

```javascript
const sql = require("msnodesqlv8");

const connectionString = "server=.;Database=Master;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const query = "SELECT name FROM sys.databases";

sql.query(connectionString, query, (err, rows) => {
    console.log(rows);
});
```

See our [JavaScript sample app](samples/javascript) for more details.

### TypeScript

Typings are included in the package. Simply import the types you need, and require the module to get started:

```typescript
import { SqlClient } from "msnodesqlv8";

const sql: SqlClient = require("msnodesqlv8");

const connectionString = "server=.;Database=Master;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
const query = "SELECT name FROM sys.databases";

sql.query(connectionString, query, (err, rows) => {
    console.log(rows);
});
```

See our [TypeScript sample app](samples/typescript) for more details.

## Prepared Statements

It is now possible to prepare one or more statements which can then be invoked
over and over with different parameters.  There are a few examples in the prepared unit tests.
Please note that prepared statements must be closed as shown below when they are no longer required.
Each prepared statement utilises server resources so the application should open and close appropriately.

Prepared Statements can be useful when there is a requirement to run the same SQL with different
parameters many times.  This saves overhead from constantly submitting the same SQL to the server.
```javascript
    function employeePrepare(done) {

    var query =
        `SELECT [ModifiedDate]
        ,[BusinessEntityID]
        ,[OrganizationNode]
        ,[ModifiedDate]
        FROM [scratch].[dbo].[Employee]
        WHERE BusinessEntityID = ?`;

    // open connection
    sql.open(connStr, function (err, conn) {
        assert.ifError(err);
        // prepare a statement which can be re-used
        conn.prepare(query, function (e, ps) {
            // called back with a prepared statement
            console.log(ps.getMeta());
            // prepared query meta data avaialble to view
            assert.ifError(err);
            // execute with expected paramater
            ps.preparedQuery([1], function(err, fetched) {
                console.log(fetched);
                // can call again with new parameters.
                // note - free the statement when no longer used,
                // else resources will be leaked.
                ps.free(function() {
                    done();
                })
            });
        });
    });
    }
```


## Connect Timeout

send in a connect object to pass a timeout to the driver for connect request
```javascript
    function connect_timeout() {
        var co = {
            conn_str : connStr,
            conn_timeout : 2
        };
        var start = new Date().getTime();
        console.log ('connect ' + start);
        sql.open(co, function(err, conn) {
            var end = new Date().getTime();
            var elapsed = end - start;
            console.log ('callback ..... ' + elapsed );
            if (err) {
                console.log(err);
                return;
            }
            var ts = new Date().getTime();
            conn.query("declare @v time = ?; select @v as v", [sql.Time(ts)], function (err, res) {
                assert.ifError(err);
                console.log(res);
            });
        });
```
## Query Timeout

send in a query object such as that shown below to set a timeout for a particular query.  Note usual semantics of using a sql string parameter will result in no timeout being set
```javascript
        open(function(conn) {
            var queryObj = {
                query_str : "waitfor delay \'00:00:10\';",
                query_timeout : 2
            };

            conn.query(queryObj, function (err, res) {
                assert(err != null);
                assert(err.message.indexOf('Query timeout expired') > 0)
                test_done();
            });
        });
```
A timeout can also be used with a stored procedure call as follows :-
```javascript
        function go() {
            var pm = c.procedureMgr();
            pm.setTimeout(2);
            pm.callproc(sp_name, ['0:0:5'], function(err, results, output) {
                assert(err != null);
                assert(err.message.indexOf('Query timeout expired') > 0)
                test_done();
            });
        }
```
## User Binding Of Parameters

In many cases letting the driver decide on the parameter type is sufficient.  There are occasions however where more control is required. The API now includes some methods which explicitly set the type alongside the value.  The driver will in this case
use the type as provided.  For example, to set column type as binary and pass in null value, use the sql.VarBinary as shown below.  There are more examples in test harness file userbind.js.
```javascript
     sql.open(connStr, function(err, conn) {
         conn.query("declare @bin binary(4) = ?; select @bin as bin", [sql.VarBinary(null)], function (err, res) {
             var expected = [ {
                 'bin' : null
             }];
             assert.ifError(err);
             assert.deepEqual(expected, res);
         });
     });
```
## Stored Procedure Support 

Included in this module is support for stored procedures in SQL server.  Simple input/output parameters and return value can be bound.  

open a connection, and get an instance of procedureMgr
```javascript
        sql.open(conn_str, function (err, conn) {
                var pm = conn.procedureMgr();
                pm.callproc('my_proc', [10], function(err, results, output) {
            });
        });
```
in above example a call is issued to the stored procedure my_proc which takes one input integer parameter.  results will contain rows selected within the procedure and output parameters are inserted into output vector.  Note the [0] element in output will be the return result of the procedure.  If no return exists in the procedure, this value will be 0.  Any further elements in the array will be output parameters populated by the execution of the procedure.

Note the manager will issue a select to the database to obtain meta data about the procedure.  This is cached by the manager.  It is possible to obtain this information for inspection.
```javascript
    pm.describe(name, function (meta) {
        console.log(JSON.stringify(meta));
        pm.callproc('my_proc', [10], function (err, results, output) {
        });
    });
```
meta will contain the parameter array associated with the procedure, the type, size and call signature required.  

the test folder includes some simple unit tests for stored procedures.  If you discover any problems with using this new feature please include a simple example, preferably a unit test illustrating the issue.  I will endeavour to fix the issue promptly.

Further enhancements will be made to the library over the coming months - please leave feedback or suggestions for required features.

## Bulk Table Operations

Bulk insert/delete/modify is now supported through a helper class.  The underlying c++ driver will reserve vectors containing the column data and submit in bulk to the database which will reduce network overhead.  It is possible to configure in the java script a batch size which will break the master vector of objects down into batches each of which is prepared and sent by the driver. Most of the effort for this update was spent in getting the c++ driver to work, the js API still needs a little refinement, so please use the feature and make suggestions for improvements.

If issues are found, please provide the exact table definition being used and ideally a unit test illustrating the problem. 

take a look at the unit test file bulk.js to get an idea of how to use these new functions.

once a connection is opened, first get the table manager :-
```javascript
            var tm = c.tableMgr();
            tm.bind('Employee', cb);
```
the table manager will fetch some meta data describing the table 'Employee' and make a callback providing a manager for that particular table :-
```javascript
            function cb(bulkMgr) {
              // bulkMgr is now ready to accept bulk operations for table 'Employee'
              // see employee.json and employee.sql in test.
              var parsedJSON = getJSON(); // see bulk.js
              bulkMgr.insertRows(parsedJSON, insertDone);
            }
```
you can look at the signatures, columns and other interesting information by asking for a summary :-
```javascript
             var summary = bulkMgr.getSummary();
```
by default the primary key of the table is assigned to the where condition for select which gives a convenient way of selecting a set of rows based on knowing the keys.  Note this operation is not yet optimized with bulk fetch, which will be enhanced in the next update addressing cursors.
```javascript
             keys = [];
             keys.push(
                 {
                     BusinessEntityID : 1  
                 }
             );
             bulkMgr.selectRows(keys, function(err, results) {
                 // results will contain the full object i.e. all columns,
             }
             ); 
```
it is possible to change the where clause by using a different column signature - for example, LoginID
```javascript
            var whereCols = [];
            whereCols.push({
                name : 'LoginID'
            });
            // as above keys now needs to contain a vector of LoginID
            bulkMgr.setWhereCols(whereCols);
            bulkMgr.selectRows(keys, bulkDone);
 ```
amends can be made to a sub set of columns, for example to bulk update the modified date, prepare a set of objects with the primary keys to satisfy the where clause and of course the column to be updated. By default all assignable columns are used for the update signature so the entire object would need to be presented.  Where performance is within acceptable limits, this is probably the easiest pattern i.e. select the entire object, amend as required and commit the amended vector back to the database.

```javascript
                var newDate = new Date("2015-01-01T00:00:00.000Z");
                var modifications = [];
                parsedJSON.forEach(function(emp) {
                    emp.ModifiedDate = newDate;
                    modifications.push( {
                        BusinessEntityID : emp.BusinessEntityID,
                        ModifiedDate : newDate
                    });
                });
```
tell the bulkMgr which columns to use for the update and send in the modification :-
```javascript
                var updateCols = [];
                updateCols.push({
                    name : 'ModifiedDate'
                });

                bulkMgr.setUpdateCols(updateCols);
                bulkMgr.updateRows(modifications, updateDone);
```
the manager can also delete rows - the where clause is used in binding signature so by default this will be the primary key.  Similar to the select examples above :-
```javascript
                 bulkMgr.deleteRows(keys, function (err, res) {
                 })
```
of course keys can be the original objects as fetched with select - the driver only needs all columns that satisfy the where condition of the signature.


finally, to reset the signatures the summary can help :-
```javascript
                 var summary = bulkMgr.getSummary();
                 bulkMgr.setWhereCols(summary.primaryColumns);
                 bulkMgr.setUpdateCols(summary.assignableColumns);
```
 
Further enhancements will be made to the library over the coming months - please leave feedback or suggestions for required features.

## Use with Sequelize

This library now  direct support for sequelize, up to v5, the popular JS ORM. For sequelize v4: 

```js
const sequelize = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'msnodesqlv8/lib/sequelize',
  dialectOptions: {
    connectionString: 'Driver={SQL Server Native Client 11.0};Server=(localdb)\\node;Database=scratch;Trusted_Connection=yes;',
  },
})
```

For sequelize v5: 

```js
const sequelize = new Sequelize({
  dialect: 'mssql',
  dialectModule: require('./dialect-module'),
  bindParam: false,
  dialectOptions: {
    options: {
      connectionString: 'Driver={SQL Server Native Client 11.0};Server=(localdb)\\node;Database=scratch;Trusted_Connection=yes;',
    },
  },
})
```

## Test

Included are a few unit tests.  They require mocha, async, and assert to be 
installed via npm.  Also, set the variables in test-config.js, then run the 
tests as follows:
```shell
    cd test
    node runtests.js
```
note if you wish to run the code through an IDE such as PHPStorm, the following fragment may help :-
```javascript
    function runTest() {

    var mocha = new Mocha(
        {
            ui : 'tdd'
        });

    -- change path as required to unit test file, set breakpoint and run via IDE
    
    mocha.addFile('node_modules/node-sqlserver-v8/test/query.js');

    mocha.run(function (failures) {
        process.on('exit', function () {
            process.exit(failures);
        });
    });
```

## Known Issues







