import * as base from "./base.repository";
import { getMssqlDbSchema } from "./mssql.repository";

it("maps db response to tables", async () => {
  // Arrange
  const dbRow = {
    TABLE_NAME: "dummy",
    TABLE_SCHEMA: "",
    REFERENCE_TO_TABLE: "",
    REFERENCE_COLUMN: "",
    REFERENCE_TO_TABLE_SCHEMA: "",
    FOREIGN_KEY: "",
  };
  spyOn(base, "runQuery").and.returnValues(
    [
      {
        COLUMN_NAME: "col1",
        IS_NULLABLE: "YES",
        DATA_TYPE: "VARCHAR",
        CHARACTER_MAXIMUM_LENGTH: 12345,
        CONSTRAINT_TYPE: "CONSTRAINT1,CONSTRAINT2",

        ...dbRow,
      },
      {
        COLUMN_NAME: "col2",
        DATA_TYPE: "DATETIME",
        IS_NULLABLE: "NO",
        ...dbRow,
      },
    ],
    []
  );

  // Act
  const result = await getMssqlDbSchema("dummyId", "dummyName");

  // Asser
  expect(result.tables).toHaveLength(1);
  expect(result.tables[0].columns).toHaveLength(2);

  expect(result.tables[0].columns[0].dataType).toBe("VARCHAR(12345)");
  expect(result.tables[0].columns[0].nullable).toBe(true);
  expect(result.tables[0].columns[0].constraints).toEqual([
    "CONSTRAINT1",
    "CONSTRAINT2",
  ]);

  expect(result.tables[0].columns[1].dataType).toBe("DATETIME");
  expect(result.tables[0].columns[1].nullable).toBe(false);
  expect(result.tables[0].columns[1].constraints).toEqual([]);
});

it("maps db views to tables", async () => {
  // Arrange
  spyOn(base, "runQuery").and.returnValues(
    [],
    [
      {
        VIEW_SCHEMA: "schema",
        VIEW_NAME: "view",
        COLUMN_NAME: "column0",
        TABLE_SCHEMA: "tableSchema",
        TABLE_NAME: "tableName",
      },
      {
        VIEW_SCHEMA: "schema",
        VIEW_NAME: "view",
        COLUMN_NAME: "column1",
        TABLE_SCHEMA: "tableSchema",
        TABLE_NAME: "tableName",
      },
    ]
  );

  // Act
  const result = await getMssqlDbSchema("dummyId", "dummyName");

  // Asser
  expect(result.tables).toHaveLength(1);
  expect(result.tables[0].columns).toHaveLength(2);
});
