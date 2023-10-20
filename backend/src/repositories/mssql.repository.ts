import { Database } from "../models/database.model";
import { DatabaseTable } from "../models/database-table.model";
import * as base from "./base.repository";
import { Provider } from "../models/provider.enum";
import { DbResponse, DbViewResponse } from "../models/db-response.model";
import { DatabaseColumn } from "../models/database-column.model";

export interface ViewOptions {
  showTables: boolean;
  showViews: boolean;
}

export const getMssqlDbSchema = async (
  connectionId: string,
  databaseName: string,
  options: ViewOptions
): Promise<Database> => {
  let db: Database = {
    tables: [],
    errors: [],
  } as Database;

  let dbEntry = options.showTables
    ? await base.runQuery<DbResponse>(
        Provider.MSSQL,
        connectionId,
        databaseName,
        informationsSchemaQuery
      )
    : [];

  db.tables = toTables(dbEntry);

  let dbViewEntry = options.showViews
    ? await base.runQuery<DbViewResponse>(
        Provider.MSSQL,
        connectionId,
        databaseName,
        viewQuery
      )
    : [];

  db.tables = db.tables.concat(toViews(dbViewEntry));

  return db;
};

const toTables = (dbResult: DbResponse[]): DatabaseTable[] => {
  const result: DatabaseTable[] = [];

  for (const element of dbResult) {
    const columnToAdd: DatabaseColumn = {
      dataType: formatDatatype(element),
      name: element.COLUMN_NAME,
      referenceColumn: element.REFERENCE_COLUMN,
      referenceTable: element.REFERENCE_TO_TABLE,
      referenceTableSchema: element.REFERENCE_TO_TABLE_SCHEMA,
      constraints: element.CONSTRAINT_TYPE?.split(",") || [],
      nullable: element.IS_NULLABLE === "YES",
    };
    const existing = result.find(
      (t) => t.name === element.TABLE_NAME && t.schema === element.TABLE_SCHEMA
    );

    if (existing) {
      existing.columns.push(columnToAdd);
    } else {
      result.push({
        name: element.TABLE_NAME,
        schema: element.TABLE_SCHEMA,
        columns: [columnToAdd],
      });
    }
  }
  return result;
};
const toViews = (dbResult: DbViewResponse[]): DatabaseTable[] => {
  const result: DatabaseTable[] = [];
  const relations = [];
  for (const element of dbResult) {
    const columnToAdd: DatabaseColumn = {
      dataType: `${element.TABLE_SCHEMA}_${element.TABLE_NAME}`,
      name: element.COLUMN_NAME,
      referenceColumn: "",
      referenceTable: "",
      referenceTableSchema: "",
      constraints: [],
      nullable: false,
    };
    const existing = result.find(
      (t) =>
        t.name === element.VIEW_NAME &&
        t.schema === "View: " + element.VIEW_SCHEMA
    );

    const relationExists = relations.find(
      (r) => r.schema === element.TABLE_SCHEMA && r.name === element.TABLE_NAME
    );

    if (!relationExists) {
      columnToAdd.referenceTable = element.TABLE_NAME;
      columnToAdd.referenceTableSchema = element.TABLE_SCHEMA;
      columnToAdd.referenceColumn =
        element.VIEW_NAME + " => " + element.TABLE_NAME;
      columnToAdd.constraints = ["UNIQUE"];

      relations.push({
        schema: element.TABLE_SCHEMA,
        name: element.TABLE_NAME,
      });
    }

    if (existing) {
      existing.columns.push(columnToAdd);
    } else {
      result.push({
        name: element.VIEW_NAME,
        schema: "View: " + element.VIEW_SCHEMA,
        columns: [columnToAdd],
      });
    }
  }
  return result;
};

export const listDatabases = async (
  connectionId: string,
  database: string
): Promise<string[]> => {
  return await base.runQuery<string>(
    Provider.MSSQL,
    connectionId,
    database,
    databaseListQuery
  );
};

const formatDatatype = (element: DbResponse) =>
  element.DATA_TYPE +
  (element.CHARACTER_MAXIMUM_LENGTH
    ? "(" + element.CHARACTER_MAXIMUM_LENGTH + ")"
    : "");

const databaseListQuery = `
    USE MASTER SELECT name FROM master.sys.databases WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
  `;

const informationsSchemaQuery = `SELECT
T.TABLE_NAME,
T.TABLE_SCHEMA,
Columns.COLUMN_NAME,
Columns.DATA_TYPE,
Columns.CHARACTER_MAXIMUM_LENGTH,
IS_NULLABLE,
FK.REFERENCE_TO_TABLE,
FK.REFERENCE_TO_TABLE_SCHEMA,
FK.REFERENCE_COLUMN,
FK.FOREIGN_KEY,
(SELECT STRING_AGG (Const.CONSTRAINT_TYPE, ',') AS CONSTRAINT_TYPE
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS Const
    INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE c ON Const.CONSTRAINT_NAME = c.CONSTRAINT_NAME
WHERE c.COLUMN_NAME = Columns.COLUMN_NAME AND Const.TABLE_NAME = T.TABLE_NAME AND Const.TABLE_SCHEMA = T.TABLE_SCHEMA) AS CONSTRAINT_TYPE
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
WHERE T.TABLE_TYPE='BASE TABLE'`;

const viewQuery = `SELECT VIEW_SCHEMA, VIEW_NAME, COLUMN_NAME, TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.VIEW_COLUMN_USAGE`;
