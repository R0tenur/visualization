import { DatabaseTable } from "../models/database-table.model";
import { chartBuilder } from "./builder.service";

describe("chartBuilder", () => {
  const tableName = "dummyTable";
  const tableSchema = "dummyTableSchema";
  const columnName = "dummyColumn";

  const anotherTableName = "anotherDummyTable";
  const anotherTableSchema = "anotherDummySchema";
  const anotherColumnName = "anotherDummyColumn";

  it("throws error when no db-respone", () => {
    // Act
    const err = () => chartBuilder([]);

    // Asser
    expect(err).toThrowError();
  });

  it("builds chart with uniqe columns", () => {
    // arrange
    const tablesWithMultiple: DatabaseTable[] = [
      {
        name: tableName,
        schema: tableSchema,
        columns: [
          {
            dataType: "nvarchar",
            name: columnName,
            ...emptyRelation,
          },
          {
            dataType: "nvarchar",
            name: columnName,
            ...emptyRelation,
          },
        ],
      },
    ];

    // Act
    const chart = chartBuilder(tablesWithMultiple);

    // Asser
    expect(numberOfTimesStringInString(chart, columnName)).toBe(1);
  });

  it("builds chart with relations", () => {
    // arrange
    const tablesWithMultiple: DatabaseTable[] = [
      {
        name: tableName,
        schema: tableSchema,
        columns: [
          {
            dataType: "nvarchar",
            name: columnName,
            referenceColumn: anotherColumnName,
            referenceTable: anotherTableName,
            referenceTableSchema: anotherTableSchema,
            constraint: "theKey",
          },
        ],
      },
      {
        name: anotherTableName,
        schema: anotherTableSchema,
        columns: [
          {
            dataType: "nvarchar",
            name: columnName,
            ...emptyRelation,
          },
          {
            dataType: "nvarchar",
            name: anotherColumnName,
            ...emptyRelation,
          },
        ],
      },
    ];

    const expected = `classDiagram
      
class ${tableSchema}_${tableName} {
    ${columnName}
          
}
class ${anotherTableSchema}_${anotherTableName} {
    ${columnName}
          ${anotherColumnName}
          
}
      ${tableSchema}_${tableName} --|> ${anotherTableSchema}_${anotherTableName}: ${anotherColumnName}
`;

    // Act
    const chart = chartBuilder(tablesWithMultiple);

    // Assert
    expect(chart).toEqual(expected);
  });
});

const emptyRelation = {
  referenceColumn: "",
  referenceTable: "",
  referenceTableSchema: "",
  foreignKey: "",
  constraint: "",
};
const numberOfTimesStringInString = (string: string, word: string) =>
  string.split(word).length - 1;
