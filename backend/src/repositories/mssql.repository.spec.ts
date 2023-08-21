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
      { COLUMN_NAME: "col1", ...dbRow },
      { COLUMN_NAME: "col2", ...dbRow },
    ],
    []
  );

  // Act
  var result = await getMssqlDbSchema("dummyId", "dummyName");

  // Asser
  expect(result.tables).toHaveLength(1);
  expect(result.tables[0].columns).toHaveLength(2);
});
