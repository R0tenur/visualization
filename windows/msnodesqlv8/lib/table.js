/**
 * Created by Stephen on 9/28/2015.
 */

/*
 supports bulk table operations, delete, modify and insert. Also capture table definition such that
 template sql statements can be used to insert single entries.

 this manager will ultimately become the underlying mechanism for simple "entity framework" like
 transactions i.e. working with a concrete java script type that requires efficient binding to
 the database, thus it must be robust and simple to enhance.
 */

'use strict'

const tableModule = ((() => {
  function TableMgr (connection, connectionMeta, connectionUser) {
    const cache = {}
    const bulkTableManagers = {}
    const theConnection = connection
    const metaResolver = connectionMeta
    const user = connectionUser

    function describeTable (tableName) {
      const resolver = metaResolver
      return new Promise((resolve, reject) => {
        resolver.getServerVersionRes(theConnection).then(res => {
          let cat = res[0].Cat
          let sql
          function mapFn (data) {
            const tableParts = tableName.split(/\.(?![^\[]*\])/g) // Split table names like 'dbo.table1' to: ['dbo', 'table1'] and 'table1' to: ['table1']
            const table = tableParts[tableParts.length - 1] // get the table name
            let fullTableName = table
            const schema = tableParts[tableParts.length - 2] || '' // get the table schema, if missing set schema to ''
            if (tableParts.length > 2) {
              cat = tableParts[tableParts.length - 3]
            } else if (table[0] === '#') {
              cat = 'tempdb'
              fullTableName = `${cat}.${schema}.${table}`
            }
            sql = data.replace(/<table_name>/g, table.replace(/^\[|\]$/g, '').replace(/\]\]/g, ']')) // removes brackets at start end end, change ']]' to ']'
              .replace(/<table_schema>/g, schema.replace(/^\[|\]$/g, '').replace(/\]\]/g, ']')) // removes brackets at start end end, change ']]' to ']'
              .replace(/<escaped_table_name>/g, fullTableName) // use the escaped table name for the OBJECT_ID() function
              .replace(/<table_catalog>/g, cat) // use the escaped table name for the OBJECT_ID() function

            return sql
          }
          resolver.getTableDefinition(theConnection, res[0].MajorVersion, mapFn).then(res => {
            resolve(res)
          }).catch(err => {
            reject(err)
          })
        }).catch(err => {
          reject(err)
        })
      })
    }

    /*
     based on an instance bind properties of that instance to a given table.
     Will have to allow for not all properties binding i.e. may be partial persistence - and allow for
     mappings i.e. object.myName = table.<name> or table.my_name etc.
     */

    function Meta (tableName, cols) {
      // filter out duplicate columns with the same name
      cols = cols.filter((item, pos) => cols.findIndex(col => col.name === item.name) === pos)

      function getFullName () {
        const first = cols[0]
        return `[${first.table_catalog}].[${first.table_schema}].[${first.table_name}]`
      }

      const fullTableName = cols.length > 0 && cols[0].table_catalog !== 'tempdb'
        ? getFullName()
        : tableName

      const allColumns = cols

      function readOnly (col) {
        return (col.is_identity || col.is_computed || col.is_hidden || col.generated_always_type)
      }

      function recalculateAssignableColumns () {
        return allColumns.filter(col => !readOnly(col))
      }

      function recalculatePrimaryColumns () {
        return allColumns.filter(col => col.is_primary_key)
      }

      let insertSignature
      let whereColumns
      let updateColumns
      let selectSignature
      let deleteSignature
      let updateSignature
      const assignableColumns = recalculateAssignableColumns()

      const primaryCols = recalculatePrimaryColumns()
      const primaryByName = primaryCols.reduce((agg, col) => {
        agg[col.name] = col
        return agg
      }, {})

      const colByName = allColumns.reduce((agg, col) => {
        agg[col.name] = col
        return agg
      }, {})

      function columnSet (colSubSet) {
        return `${colSubSet.map(e => `[${e.name}] = ?`).join(' and ')}`
      }

      function whereClause (colSubSet) {
        return `where ( ${columnSet(colSubSet)} )`
      }

      function columnList (colSubSet) {
        return colSubSet.map(e => `[${e.name}]`).join(', ')
      }

      function selectStatement (colSubSet) {
        return `select ${columnList(allColumns)} from ${fullTableName} ${whereClause(colSubSet)}`
      }

      function deleteStatement (colSubSet) {
        return `delete from ${fullTableName} ${whereClause(colSubSet)}`
      }

      function updateStatement (colSubSet) {
        return `update ${fullTableName} set ${columnSet(colSubSet)} ${whereClause(whereColumns)}`
      }

      function insertStatement () {
        const subSet = recalculateAssignableColumns()
        const w = subSet.map(() => `?`).join(', ')
        const values = subSet.length > 0 ? ` values ( ${w} )` : ''
        return `insert into ${fullTableName} ( ${columnList(subSet)} ) ${values}`
      }

      function filteredSet (colSubSet) {
        return colSubSet.reduce((agg, c) => {
          if (Object.prototype.hasOwnProperty.call(colByName, c.name)) {
            agg.push(colByName[c.name])
          }
          return agg
        }, [])
      }

      function setWhereCols (colSubSet) {
        const subSet = filteredSet(colSubSet)
        whereColumns = subSet
        insertSignature = insertStatement()
        deleteSignature = deleteStatement(subSet)
        selectSignature = selectStatement(subSet)
        updateSignature = updateStatement(subSet)

        return selectSignature
      }

      function setUpdateCols (colSubSet) {
        const filtered = filteredSet(colSubSet)
        updateColumns = filtered
        updateSignature = updateStatement(filtered)

        return updateSignature
      }

      function recalculateUpdateColumns () {
        const assignable = recalculateAssignableColumns()
        return assignable.filter(col => !Object.prototype.hasOwnProperty.call(primaryByName, col.name))
      }

      setWhereCols(primaryCols)
      setUpdateCols(recalculateUpdateColumns())

      function getSummary () {
        return {
          insertSignature: insertSignature,
          whereColumns: whereColumns,
          updateColumns: updateColumns,
          selectSignature: selectSignature,
          deleteSignature: deleteSignature,
          updateSignature: updateSignature,
          columns: allColumns,
          primaryColumns: primaryCols,
          assignableColumns: assignableColumns,
          by_name: colByName
        }
      }

      function toString () {
        const s = getSummary()
        return JSON.stringify(s, null, 4)
      }

      // export api

      function getAllColumns () {
        return allColumns
      }

      function getInsertSignature () {
        return insertSignature
      }

      function getWhereColumns () {
        return whereColumns
      }

      function getUpdateColumns () {
        return updateColumns
      }

      function getSelectSignature () {
        return selectSignature
      }

      function getDeleteSignature () {
        return deleteSignature
      }

      function getUpdateSignature () {
        return updateSignature
      }

      function getPrimaryColumns () {
        return primaryCols
      }

      function getAssignableColumns () {
        return assignableColumns
      }

      function getColumnsByName () {
        return colByName
      }

      return {
        getAllColumns: getAllColumns,
        toString: toString,
        getSummary: getSummary,
        setWhereCols: setWhereCols,
        setUpdateCols: setUpdateCols,
        readOnly: readOnly,

        getInsertSignature: getInsertSignature,
        getSelectSignature: getSelectSignature,
        getDeleteSignature: getDeleteSignature,
        getUpdateSignature: getUpdateSignature,
        getColumnsByName: getColumnsByName,
        getWhereColumns: getWhereColumns,
        getUpdateColumns: getUpdateColumns,
        getPrimaryColumns: getPrimaryColumns,
        getAssignableColumns: getAssignableColumns
      }
    }

    function describe (name) {
      return new Promise((resolve, reject) => {
        let tableMeta = cache[name]
        if (!tableMeta) {
          describeTable(name).then(cols => {
            tableMeta = new Meta(name, cols)
            cache[name] = tableMeta
            resolve(tableMeta)
          }).catch(err => {
            reject(err)
          })
        } else {
          resolve(tableMeta)
        }
      })
    }

    function BulkTableOpMgr (m) {
      const meta = m
      let batch = 0
      let summary = meta.getSummary()

      function asTableType (name) {
        const summary = meta.getSummary()
        const columns = summary.columns

        if (!name) {
          name = `${columns[0].table_name}Type`
        }
        const cols = userTypeCols(name)
        return new user.Table(name, cols)
      }

      function userTypeCols () {
        const summary = meta.getSummary()
        const columns = summary.columns
        const cols = []
        columns.forEach(col => {
          let declaration = `${col.name} ${col.type}`
          let length = 0
          if (col.max_length > 0) {
            if (col.type === 'nvarchar') {
              length = col.max_length / 2
            } else if (col.type === 'varbinary') {
              length = col.max_length
            }
          }

          if (length > 0) {
            declaration += `(${length})`
          }
          cols.push({
            name: col.name,
            userType: declaration,
            type: {
              declaration: col.type,
              length: length
            }
          })
        })
        return cols
      }

      function asUserType (name) {
        const summary = meta.getSummary()
        const columns = summary.columns
        const cols = userTypeCols()
        const declarations = cols.map(c => c.userType).join(', ')
        // CREATE TYPE TestType AS TABLE ( a VARCHAR(50), b INT );

        if (!name) {
          name = `${columns[0].table_name}Type`
        }
        return `CREATE TYPE ${name} AS TABLE (${declarations})`
      }

      // create an object of arrays where each array represents all values
      // for the batch.

      function prepare () {
        return summary.columns.reduce((agg, col) => {
          const property = col.name
          if (Object.prototype.hasOwnProperty.call(summary.by_name, property) &&
            !meta.readOnly(summary.by_name[property])) {
            agg.keys.push(property)
            if (!Object.prototype.hasOwnProperty.call(agg.arrays_by_name, property)) {
              agg.arrays_by_name[property] = []
            }
          }
          return agg
        }, {
          keys: [],
          arrays_by_name: {}
        })
      }

      function arrayPerColumn (vec) {
        const res = prepare()
        vec.forEach(instance => {
          res.keys.reduce((agg, property) => {
            const columnValues = agg[property]
            const val = Object.prototype.hasOwnProperty.call(instance, property)
              ? instance[property]
              : null
            columnValues.push(val)
            return agg
          }, res.arrays_by_name)
        })

        return res
      }

      // if batch size is set, split the input into that batch size.

      function rowBatches (rows) {
        const batches = []
        if (batch === 0) {
          batches.push(rows)
        } else {
          let singleBatch = []
          for (let i = 0; i < rows.length; i += 1) {
            singleBatch.push(rows[i])
            if (singleBatch.length === batch) {
              batches.push(singleBatch)
              singleBatch = []
            }
          }
        }

        return batches
      }

      // driver will have to recognise this is an array of arrays where each array
      // represents all values for that particular column.

      function arrayPerColumnForCols (rows, colSubSet) {
        const colsByName = arrayPerColumn(rows).arrays_by_name
        return colSubSet.reduce((agg, col) => {
          if (Object.prototype.hasOwnProperty.call(colsByName, col.name)) {
            agg.push(colsByName[col.name])
          }
          return agg
        }, [])
      }

      // given the input array of asObjects consisting of potentially all columns, strip out
      // the sub set corresponding to the where column set.

      function whereForRowsNoBatch (sql, rows, callback) {
        const colArray = arrayPerColumnForCols(rows, summary.whereColumns)
        theConnection.query(sql, colArray, callback)
      }

      function selectRows (rows, callback) {
        const res = []
        whereForRowsNoBatch(summary.selectSignature, rows, (err, results, more) => {
          results.forEach(r => {
            res.push(r)
          })
          if (!more) {
            callback(err, res)
          }
        })
      }

      function runQuery (sql, colArray) {
        return new Promise((resolve, reject) => {
          theConnection.query(sql, colArray, (e, res) => {
            if (e) {
              reject(e)
            } else {
              resolve(res)
            }
          })
        })
      }

      function batchIterator (sql, rows, iterate) {
        return Promise.all(rowBatches(rows).map(b => runQuery(sql, iterate(b))))
      }

      function insertRows (rows, callback) {
        batchIterator(summary.insertSignature, rows, b => arrayPerColumnForCols(b, summary.assignableColumns))
          .then(callback(null, [])).catch(e => callback(e, null))
      }

      function updateRows (rows, callback) {
        batchIterator(summary.updateSignature, rows, b => arrayPerColumnForCols(b, summary.updateColumns).concat(arrayPerColumnForCols(b, summary.whereColumns)))
          .then(callback(null, [])).catch(e => callback(e, null))
      }

      function deleteRows (rows, callback) {
        batchIterator(summary.deleteSignature, rows, b => arrayPerColumnForCols(b, summary.whereColumns))
          .then(callback(null, [])).catch(e => callback(e, null))
      }

      function getMeta () {
        return meta
      }

      function setBatchSize (batchSize) {
        batch = batchSize
      }

      function setWhereCols (whereCols) {
        meta.setWhereCols(whereCols)
        summary = meta.getSummary()
      }

      function setUpdateCols (updateCols) {
        meta.setUpdateCols(updateCols)
        summary = meta.getSummary()
      }

      function getSummary () {
        return meta.getSummary()
      }

      // public api

      return {
        asTableType: asTableType,
        asUserType: asUserType,
        insertRows: insertRows,
        selectRows: selectRows,
        deleteRows: deleteRows,
        updateRows: updateRows,
        setBatchSize: setBatchSize,
        setWhereCols: setWhereCols,
        setUpdateCols: setUpdateCols,
        getMeta: getMeta,
        meta: meta,
        columns: meta.getAllColumns(),
        getSummary: getSummary
      }
    }

    function bind (table, cb) {
      describe(table).then(meta => {
        const bulkMgr = new BulkTableOpMgr(meta)
        bulkTableManagers[table] = bulkMgr
        cb(bulkMgr)
      }).catch(err => {
        cb(null, err)
      })
    }

    return {
      describe: describe,
      bind: bind
    }
  }

  return {
    TableMgr: TableMgr
  }
})())

exports.tableModule = tableModule
