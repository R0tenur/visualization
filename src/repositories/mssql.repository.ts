import { Database } from "../models/database.model";
import { DatabaseTable } from "../models/database-table.model";

const windowsSql = () => require('mssql/msnodesqlv8');
const allSql = require('mssql');



export const getMssqlDbSchema = async (
  username: string,
  password: string,
  server: string,
  database: string,
  trusted: boolean
): Promise<Database> => {
  let db: Database = {
    tables: [],
    errors: []
  } as Database;
  let sql: any;
  try {
    if (trusted) {
      sql = windowsSql();
    } else {
      sql = allSql;
    }
    const parsedSever = parsePort(server);
    const config = {
      user: username,
      password: password,
      server: parsedSever.server,
      port: parsedSever.port,
      database: database,
      driver: trusted ? "msnodesqlv8" : "",
      options: {
        trustedConnection: trusted,
        port: parsedSever.port
      }
    };
    await sql.connect(config);

    let dbEntry = await getFromSysTables(sql);

    if (!dbEntry) {
      dbEntry = await sql.query(informationsSchemaQuery);
    }

    db.tables = toTables(dbEntry);
  } catch (err) {
    db.errors.push('Error getting data: ' + err.message);
  } finally {
    sql.close();
  }
  return db;
};
const parsePort = (server: string): { server: string, port: number } => {
  const parsedServer = server.split(',');
  return { server: parsedServer[0].replace('tcp:', ''), port: Number.parseInt(parsedServer[1]) || 1433 };
}
const toTables = (dbResult): DatabaseTable[] => {
  const result: DatabaseTable[] = [];
  for (let index = 0; index < dbResult.recordset.length; index++) {
    const element = dbResult.recordset[index];
    const columnToAdd = {
      Name: element.COLUMN_NAME,
      ReferenceColumn: element.REFERENCE_COLUMN,
      ReferenceTable: element.REFERENCE_TO_TABLE,
      ForeignKey: element.FOREIGN_KEY,
    };
    const existing = result.find(t => t.Name === element.TABLE_NAME);

    if (existing) {
      existing.Columns.push(columnToAdd);
    } else {
      result.push({
        Name: element.TABLE_NAME,
        Columns: [
          columnToAdd
        ]
      });
    }
  }
  return result;
};

const getFromSysTables = async (sql) => {
  try {
    return await sql.query(sysTableQuery);
  } catch (error) {

  }
};

export const listDatabases = async (
  username: string,
  password: string,
  server: string
): Promise<string[]> => {
  let databases = [];
  try {
    await allSql.connect(`mssql://${username}:${password}@${server}`);
    const result = await allSql.query`USE MASTER SELECT name FROM master.sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')`;

    databases = result.recordset.map((r: any) => r['name']);
  } catch (err) {
    // ... error checks
  } finally {
    allSql.close();
  }
  return databases;
};

const sysTableQuery = `
SELECT
    T.name as 'TABLE_NAME',
    Columns.name as 'COLUMN_NAME',
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
    WHERE (col1.name != col2.NAME OR tab1.name != tab2.name) AND tab1.name = t.name AND col1.name = Columns.name) as REFERENCE_TO_TABLE,
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
    WHERE (col1.name != col2.NAME OR tab1.name != tab2.name) AND tab1.name = t.name AND col1.name = Columns.name) as REFERENCE_COLUMN,
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
    WHERE (col1.name != col2.NAME OR tab1.name != tab2.name) AND tab1.name = t.name AND col1.name = Columns.name) as FOREIGN_KEY

FROM SYS.TABLES T
    INNER JOIN SYS.COLUMNS Columns ON Columns.object_id = T.object_id
`;

const informationsSchemaQuery = `
SELECT
        T.TABLE_NAME,
        Columns.COLUMN_NAME,
        (SELECT
            KCU2.TABLE_NAME
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU1 ON 
        KCU1.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG AND
                KCU1.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA AND
                KCU1.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU2 ON 
        KCU2.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG AND
                KCU2.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA AND
                KCU2.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME
        WHERE KCU1.ORDINAL_POSITION = KCU2.ORDINAL_POSITION AND
            KCU1.TABLE_NAME = T.TABLE_NAME AND KCU1.COLUMN_NAME = Columns.COLUMN_NAME) as REFERENCE_TO_TABLE,

        (SELECT
            KCU2.COLUMN_NAME
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU1 ON 
        KCU1.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG AND
                KCU1.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA AND
                KCU1.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU2 ON 
        KCU2.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG AND
                KCU2.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA AND
                KCU2.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME
        WHERE KCU1.ORDINAL_POSITION = KCU2.ORDINAL_POSITION AND
            KCU1.TABLE_NAME = T.TABLE_NAME AND KCU1.COLUMN_NAME = Columns.COLUMN_NAME) as REFERENCE_COLUMN,


        (SELECT KCU1.CONSTRAINT_NAME AS 'FOREIGN_KEY'
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU1 ON 
        KCU1.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG AND
                KCU1.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA AND
                KCU1.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU2 ON 
        KCU2.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG AND
                KCU2.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA AND
                KCU2.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME
        WHERE KCU1.ORDINAL_POSITION = KCU2.ORDINAL_POSITION AND
            KCU1.TABLE_NAME = T.TABLE_NAME AND KCU1.COLUMN_NAME = Columns.COLUMN_NAME
) as FOREIGN_KEY

    FROM INFORMATION_SCHEMA.TABLES T
        INNER JOIN INFORMATION_SCHEMA.COLUMNS Columns ON Columns.TABLE_NAME = T.TABLE_NAME
 WHERE T.TABLE_TYPE='BASE TABLE'

`;