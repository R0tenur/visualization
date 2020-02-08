let sql = require('mssql');
const windowsSql = require('msnodesqlv8');

export interface MssqlDb {
  TABLE_NAME: string;
  C: MssqlColumn[];
}

export interface MssqlColumn {
  COLUMN_NAME: string;
  REFERENCE_COLUMN: string;
  REFERENCE_TO_TABLE: string;
  FOREIGN_KEY: string;
}

export const getMssqlDbSchema = async (
  username: string,
  password: string,
  server: string,
  database: string,
  trusted: boolean
): Promise<MssqlDb[]> => {
  let db = [] as MssqlDb[];
  try {
    const config = {
      user: username,
      password: password,
      server: server,
      database: database,
      driver: trusted ? 'msnodesqlv8' : '',
      options: {
        trustedConnection: trusted
      }
    };
    if (trusted) {
      sql = windowsSql;
    }

    await sql.connect(config);
    const result = await sql.query`
  SELECT (SELECT 
      T.TABLE_NAME,
      C.COLUMN_NAME,
      (SELECT TOP 1
      TAB2.NAME
      FROM SYS.FOREIGN_KEY_COLUMNS fkc
      INNER JOIN SYS.OBJECTS obj
          ON OBJ.OBJECT_ID = fkc.constraint_object_id
      INNER JOIN SYS.TABLES tab1
          ON tab1.OBJECT_ID = fkc.parent_object_id
      INNER JOIN sys.schemas sch
          ON tab1.schema_id = sch.schema_id
      INNER JOIN sys.columns col1
          ON col1.column_id = parent_column_id AND col1.object_id = tab1.object_id
      INNER JOIN sys.tables tab2
          ON tab2.OBJECT_ID = fkc.referenced_object_id
      INNER JOIN sys.columns col2
          ON col2.column_id = referenced_column_id AND col2.object_id = tab2.object_id
      WHERE col1.name = C.COLUMN_NAME AND C.TABLE_NAME != TAB2.NAME) as REFERENCE_TO_TABLE,
      (SELECT TOP 1
      col2.name AS [referenced_column]
      FROM SYS.FOREIGN_KEY_COLUMNS fkc
      INNER JOIN SYS.OBJECTS obj
          ON OBJ.OBJECT_ID = fkc.constraint_object_id
      INNER JOIN SYS.TABLES tab1
          ON tab1.OBJECT_ID = fkc.parent_object_id
      INNER JOIN sys.schemas sch
          ON tab1.schema_id = sch.schema_id
      INNER JOIN sys.columns col1
          ON col1.column_id = parent_column_id AND col1.object_id = tab1.object_id
      INNER JOIN sys.tables tab2
          ON tab2.OBJECT_ID = fkc.referenced_object_id
      INNER JOIN sys.columns col2
          ON col2.column_id = referenced_column_id AND col2.object_id = tab2.object_id
      WHERE col1.name = C.COLUMN_NAME AND C.TABLE_NAME != TAB2.NAME) as REFERENCE_COLUMN,
       (SELECT TOP 1
      OBJ.NAME
      FROM SYS.FOREIGN_KEY_COLUMNS fkc
      INNER JOIN SYS.OBJECTS obj
          ON OBJ.OBJECT_ID = fkc.constraint_object_id
      INNER JOIN SYS.TABLES tab1
          ON tab1.OBJECT_ID = fkc.parent_object_id
      INNER JOIN sys.schemas sch
          ON tab1.schema_id = sch.schema_id
      INNER JOIN sys.columns col1
          ON col1.column_id = parent_column_id AND col1.object_id = tab1.object_id
      INNER JOIN sys.tables tab2
          ON tab2.OBJECT_ID = fkc.referenced_object_id
      INNER JOIN sys.columns col2
          ON col2.column_id = referenced_column_id AND col2.object_id = tab2.object_id
      WHERE col1.name = C.COLUMN_NAME AND C.TABLE_NAME != TAB2.NAME) as FOREIGN_KEY
  
      FROM INFORMATION_SCHEMA.TABLES T
      INNER JOIN INFORMATION_SCHEMA.COLUMNS C ON C.TABLE_NAME = T.TABLE_NAME
      WHERE T.TABLE_TYPE='BASE TABLE' FOR JSON AUTO) AS 'JSONRESULT'`;

    db = JSON.parse(result.recordset[0]['JSONRESULT']) as MssqlDb[];
  } catch (err) {
    // ... error checks
  } finally {
    sql.close();
  }
  return db;
};

export const listDatabases = async (
  username: string,
  password: string,
  server: string
): Promise<string[]> => {
  let databases = [];
  try {
    await sql.connect(`mssql://${username}:${password}@${server}`);
    const result = await sql.query`USE MASTER SELECT name FROM master.sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')`;

    databases = result.recordset.map((r: any) => r['name']);
  } catch (err) {
    // ... error checks
  } finally {
    sql.close();
  }
  return databases;
};
