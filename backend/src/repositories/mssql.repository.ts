import { Database } from "../models/database.model";
import { DatabaseTable } from "../models/database-table.model";
import { runQuery } from "./base.repository";
import { Provider } from "../models/provider.enum";

interface DbResponse {
  TABLE_NAME: string;
  TABLE_SCHEMA: string;
  COLUMN_NAME: string;
  REFERENCE_TO_TABLE: string;
  REFERENCE_COLUMN: string;
  REFERENCE_TO_TABLE_SCHEMA: string;
  FOREIGN_KEY: string;

}

export const getMssqlDbSchema = async (
  connectionId: string,
  databaseName: string,
): Promise<Database> => {
  let db: Database = {
    tables: [],
    errors: []
  } as Database;

  let dbEntry = await runQuery<DbResponse>(
    Provider.MSSQL,
    connectionId,
    databaseName,
    informationsSchemaQuery);
  
  db.tables = toTables(dbEntry);
  return db;
};

const toTables = (dbResult: DbResponse[]): DatabaseTable[] => {
  const result: DatabaseTable[] = [];
  for (let index = 0; index < dbResult.length; index++) {
    const element = dbResult[index];
    const columnToAdd = {
      name: element.COLUMN_NAME,
      referenceColumn: element.REFERENCE_COLUMN,
      referenceTable: element.REFERENCE_TO_TABLE,
      referenceTableSchema: element.REFERENCE_TO_TABLE_SCHEMA,
      foreignKey: element.FOREIGN_KEY,
    };
    const existing = result.find(t => t.name === element.TABLE_NAME && t.schema === element.TABLE_SCHEMA);

    if (existing) {
      existing.columns.push(columnToAdd);
    } else {
      result.push({
        name: element.TABLE_NAME,
        schema: element.TABLE_SCHEMA,
        columns: [
          columnToAdd
        ]
      });
    }
  }
  return result;
};


export const listDatabases = async (
  connectionId: string,
  database: string,
): Promise<string[]> => {
  return await runQuery<string>(Provider.MSSQL, connectionId, database, databaseListQuery);
};

const databaseListQuery =
  `
    USE MASTER SELECT name FROM master.sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
  `;


const informationsSchemaQuery = `
SELECT
    T.TABLE_NAME,
    T.TABLE_SCHEMA,
    Columns.COLUMN_NAME,
    FK.REFERENCE_TO_TABLE,
    FK.REFERENCE_TO_TABLE_SCHEMA,
    FK.REFERENCE_COLUMN,
    FK.FOREIGN_KEY
FROM INFORMATION_SCHEMA.TABLES T
    INNER JOIN INFORMATION_SCHEMA.COLUMNS Columns ON Columns.TABLE_NAME = T.TABLE_NAME AND Columns.TABLE_SCHEMA = T.TABLE_SCHEMA
    LEFT OUTER JOIN (
        SELECT
            KCU1.TABLE_NAME AS REFERENCE_FROM_TABLE,
            KCU2.TABLE_NAME AS REFERENCE_TO_TABLE,
            KCU2.TABLE_SCHEMA AS REFERENCE_TO_TABLE_SCHEMA,
            KCU1.COLUMN_NAME AS REFERENCE_FROM_COLUMN,
            KCU2.COLUMN_NAME AS REFERENCE_COLUMN,
            KCU1.CONSTRAINT_NAME AS 'FOREIGN_KEY'
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU1 ON 
                KCU1.CONSTRAINT_CATALOG = RC.CONSTRAINT_CATALOG AND
                KCU1.CONSTRAINT_SCHEMA = RC.CONSTRAINT_SCHEMA AND
                KCU1.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU2 ON 
                KCU2.CONSTRAINT_CATALOG = RC.UNIQUE_CONSTRAINT_CATALOG AND
                KCU2.CONSTRAINT_SCHEMA = RC.UNIQUE_CONSTRAINT_SCHEMA AND
                KCU2.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME
        WHERE KCU1.ORDINAL_POSITION = KCU2.ORDINAL_POSITION
    ) FK ON
        FK.REFERENCE_FROM_TABLE = T.TABLE_NAME AND
        FK.REFERENCE_FROM_COLUMN = Columns.COLUMN_NAME
 WHERE T.TABLE_TYPE='BASE TABLE';
`;
