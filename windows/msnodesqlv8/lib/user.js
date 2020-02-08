'use strict'

const userModule = ((() => {
  /*
 sql.UDT(value)
 sql.Geography(value)
 sql.Geometry(value)
 sql.Variant(value)
 */

  function SqlTypes () {
    // var SQL_UNKNOWN_TYPE = 0;
    // var SQL_DECIMAL = 3;
    // var SQL_INTERVAL = 10;
    // var SQL_TIMESTAMP = 11;
    // var SQL_BINARY = -2;
    // var SQL_WCHAR = -8;
    // var SQL_SS_VARIANT = -150;
    // var SQL_SS_UDT = -151;
    // var SQL_SS_XML = -152;
    const SQL_SS_TABLE = -153
    const SQL_CHAR = 1
    const SQL_NUMERIC = 2
    const SQL_INTEGER = 4
    const SQL_SMALLINT = 5
    const SQL_FLOAT = 6
    const SQL_REAL = 7
    const SQL_DOUBLE = 8
    const SQL_VARCHAR = 12
    // var SQL_LONGVARCHAR = -1;
    const SQL_VARBINARY = -3
    const SQL_LONGVARBINARY = -4
    const SQL_BIGINT = -5
    const SQL_TINYINT = -6
    const SQL_BIT = -7
    const SQL_WVARCHAR = -9
    const SQL_WLONGVARCHAR = -10
    const SQL_TYPE_DATE = 91
    const SQL_TYPE_TIMESTAMP = 93
    const SQL_SS_TIME2 = -154
    const SQL_SS_TIMESTAMPOFFSET = -155

    // currently mapped in the driver .. either through a guess by looking at type or explicitly from user

    function Bit (p) {
      return {
        sql_type: SQL_BIT,
        value: p
      }
    }

    // sql.BigInt(value)

    function BigInt (p) {
      return {
        sql_type: SQL_BIGINT,
        value: p
      }
    }

    // sql.Float(value)

    function Float (p) {
      return {
        sql_type: SQL_FLOAT,
        value: p
      }
    }

    // sql.Real(value)

    function Real (p) {
      return {
        sql_type: SQL_REAL,
        value: p
      }
    }

    // sql.Int(value)

    function Int (p) {
      return {
        sql_type: SQL_INTEGER,
        value: p
      }
    }

    // sql.SmallInt(value)

    function SmallInt (p) {
      return {
        sql_type: SQL_SMALLINT,
        value: p
      }
    }

    // sql.TinyInt(value)

    function TinyInt (p) {
      return {
        sql_type: SQL_TINYINT,
        value: p
      }
    }

    // sql.Numeric(value, [precision], [scale]) -- optional precision and scale definition

    function Numeric (p, precision, scale) {
      return {
        sql_type: SQL_NUMERIC,
        value: p,
        precision: precision > 0
          ? precision
          : 0,
        scale: scale > 0
          ? scale
          : 0
      }
    }

    // sql.Money(value) - uses underlying numeric type with driver computed precision/scale

    function Money (p) {
      return {
        sql_type: SQL_NUMERIC,
        value: p,
        precision: 0,
        scale: 0
      }
    }

    // sql.SmallMoney(value)

    function VarBinary (p) {
      return {
        sql_type: SQL_VARBINARY,
        value: p
      }
    }

    function LongVarBinary (p) {
      return {
        sql_type: SQL_LONGVARBINARY,
        value: p
      }
    }

    function WVarChar (p) {
      return {
        sql_type: SQL_WVARCHAR,
        value: p
      }
    }

    function WLongVarChar (p) {
      return {
        sql_type: SQL_WLONGVARCHAR,
        value: p
      }
    }

    // sql.DateTimeOffset(value, [scale]) -- optional scale definition

    function DateTimeOffset (p, scale, offset) {
      return {
        sql_type: SQL_SS_TIMESTAMPOFFSET,
        value: p,
        scale: scale > 0
          ? scale
          : 0,
        offset: offset > 0
          ? offset
          : 0
      }
    }

    function Double (p) {
      return {
        sql_type: SQL_DOUBLE,
        value: p
      }
    }

    // sql.Char(value, [length]) -- optional length definition

    function Char (p, precision) {
      return {
        sql_type: SQL_CHAR,
        value: p,
        precision: precision > 0
          ? precision
          : 0
      }
    }

    // sql.VarChar(value, [length]) -- optional length definition

    function VarChar (p, precision) {
      return {
        sql_type: SQL_VARCHAR,
        value: p,
        precision: precision > 0
          ? precision
          : 0
      }
    }

    // sql.Time(value, [scale]) -- optional scale definition

    function Time2 (p, scale) {
      return {
        sql_type: SQL_SS_TIME2,
        value: p,
        scale: scale > 0
          ? scale
          : 0
      }
    }

    function MyDate (p) {
      return {
        sql_type: SQL_TYPE_DATE,
        value: p
      }
    }

    function DateTime (p) {
      return {
        sql_type: SQL_TYPE_TIMESTAMP,
        value: p
      }
    }

    // fraction is not yet used by driver, this is a placeholder for potential use given
    // a JS date only holds MS resolution.  Also presents an issue of how to pass this
    // additional information back to the client.

    // sql.DateTime2(value, [scale]) -- optional scale definition

    function DateTime2 (p, scale, fraction) {
      if (!fraction && p) {
        fraction = p.getUTCMilliseconds()
      }
      return {
        sql_type: SQL_TYPE_TIMESTAMP,
        value: p,
        fraction: fraction,
        scale: scale > 0
          ? scale
          : 0
      }
    }

    // datetime Date round to 10 ms as fraction is not guaranteed

    function DateRound (d, scale) {
      if (!d) {
        d = new Date()
      }
      if (!scale) {
        scale = 10
      }
      const rms = Math.ceil(d.getUTCMilliseconds() / scale) * scale
      return new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        rms
      ))
    }

    function TzOffsetQuery (s, offsetMinutes) {
      const offset = offsetMinutes || -new Date().getTimezoneOffset()
      return {
        query_str: s,
        query_timeout: 0,
        query_polling: false,
        query_tz_adjustment: offset
      }
    }

    function PollingQuery (s) {
      return {
        query_str: s,
        query_timeout: 0,
        query_polling: true,
        query_tz_adjustment: 0
      }
    }

    function TimeoutQuery (s, tSecs) {
      return {
        query_str: s,
        query_timeout: tSecs,
        query_polling: false,
        query_tz_adjustment: 0
      }
    }

    function fromRow (rows, c) {
      let v
      if (rows.length === 1) {
        v = rows[0][c]
      } else {
        v = []
        for (let r = 0; r < rows.length; ++r) {
          v[v.length] = rows[r][c]
        }
      }
      return v
    }

    function Table (typeName, cols) {
      const rows = []
      const columns = []
      let schema = 'dbo'
      let unqualifiedTableName = typeName
      const schemaIndex = typeName.indexOf('.')
      if (schemaIndex > 0) {
        schema = typeName.substr(0, schemaIndex)
        unqualifiedTableName = typeName.substr(schemaIndex + 1)
      }

      if (cols && Array.isArray(cols)) {
        cols.forEach(c => {
          columns.push(c)
          if (Object.prototype.hasOwnProperty.call(c, 'schema_name')) {
            schema = c['schema_name']
          }
        })
      }

      function addRowsFromObjects (vec) {
        vec.forEach(v => {
          addRowFromObject(v)
        })
      }

      function addRowFromObject (o) {
        const row = []
        columns.forEach(col => {
          row.push(o[col.name])
        })
        rows.push(row)
      }

      return {
        schema: schema,
        name: unqualifiedTableName,
        rows: rows,
        columns: columns,
        addRowsFromObjects: addRowsFromObjects
      }
    }

    function TvpFromTable (p) {
      const tp = {
        sql_type: SQL_SS_TABLE,
        table_name: p.name,
        type_id: p.name,
        is_user_defined: true,
        is_output: false,
        value: p,
        table_value_param: [],
        row_count: 1,
        schema: p.schema || 'dbo'
      }
      if (Object.prototype.hasOwnProperty.call(p, 'columns') &&
        Object.prototype.hasOwnProperty.call(p, 'rows')) {
        const cols = p.columns
        const rows = p.rows
        tp.row_count = rows.length
        for (let c = 0; c < cols.length; ++c) {
          const v = fromRow(rows, c)
          const ty = cols[c].type
          tp.table_value_param[c] = getSqlTypeFromDeclaredType(ty, v)
        }
      }

      return tp
    }

    function getSqlTypeFromDeclaredType (dt, p) {
      switch (dt.declaration) {
        case 'char':
        case 'nchar':
          return Char(p)

        case 'varchar':
        case 'uniqueidentifier':
          return VarChar(p)

        case 'nvarchar':
          return WVarChar(p)

        case 'text':
          return VarChar(p)

        case 'int':
          return Int(p)

        case 'bigint':
          return BigInt(p)

        case 'tinyint':
          return TinyInt(p)

        case 'smallint':
          return SmallInt(p)

        case 'bit':
          return Bit(p)

        case 'float':
          return Float(p)

        case 'numeric':
          return Numeric(p, dt.precision, dt.scale)

        case 'decimal':
          return Numeric(p, dt.precision, dt.scale)

        case 'real':
          return Real(p)

        case 'date':
          return MyDate(p)

        case 'datetime':
          return DateTime(p)

        case 'datetime2':
          return DateTime2(p, dt.scale)

        case 'smalldatetime':
          return DateTime2(p)

        case 'time':
          return Time2(p)

        case 'money':
          return Money(p)

        case 'smallmoney':
          return Money(p)

        case 'binary':
        case 'hierarchyid':
        case 'varbinary':
          return VarBinary(p)

        default:
          return null
      }
    }

    return {
      TzOffsetQuery: TzOffsetQuery,
      TimeoutQuery: TimeoutQuery,
      PollingQuery: PollingQuery,
      Bit: Bit,
      BigInt: BigInt,
      Int: Int,
      TinyInt: TinyInt,
      Numeric: Numeric,
      Money: Money,
      SmallMoney: Money,
      VarBinary: VarBinary,
      UniqueIdentifier: WVarChar,
      LongVarBinary: LongVarBinary,
      Image: LongVarBinary,
      WVarChar: WVarChar,
      Double: Double,
      Decimal: Numeric,
      SmallInt: SmallInt,
      Float: Float,
      Real: Real,
      Char: Char,
      VarChar: VarChar,
      WLongVarChar: WLongVarChar,
      NChar: Char,
      NVarChar: WVarChar,
      Text: VarChar,
      NText: WVarChar,
      Xml: WVarChar,
      Time2: Time2,
      Time: Time2,
      MyDate: MyDate,
      DateTime: DateTime,
      DateTime2: DateTime2,
      DateRound: DateRound,
      SmallDateTime: DateTime2,
      DateTimeOffset: DateTimeOffset,
      TvpFromTable: TvpFromTable,
      Table: Table
    }
  }

  return {
    SqlTypes: SqlTypes
  }
})())

exports.userModule = userModule
