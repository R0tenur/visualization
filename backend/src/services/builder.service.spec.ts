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

  it("prepend column with _ when column name starts with number", () => {
    // Arrange
    const table: DatabaseTable[] = [
      {
        name: tableName,
        schema: tableSchema,
        columns: [
          {
            dataType: "nvarchar",
            name: "1" + columnName,
            ...emptyRelation,
          },
        ],
      },
    ];

    // Act
    const chart = chartBuilder(table);

    // Asser
    expect(numberOfTimesStringInString(chart, "1" + columnName)).toBe(1);
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

  [
    { kind: "one to many", md: "||--|{", replaceColumn: {} },
    { kind: "zero to many", md: "|o--|{", replaceColumn: { nullable: true } },
    {
      kind: "one to one",
      md: "||--||",
      replaceColumn: { constraints: ["PRIMARY KEY", "FOREIGN KEY", "UNIQUE"] },
    },
  ].forEach((element) => {
    it(`builds chart with ${element.kind} relations`, () => {
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
              nullable: false,
              constraints: ["PRIMARY KEY", "FOREIGN KEY"],
              ...element.replaceColumn,
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

      const expected = `erDiagram
      
"${tableSchema}.${tableName}" {
    nvarchar ${columnName} "PK, FK${
        element.kind === "one to one" ? ", UNIQUE" : ""
      }"
          
}
"${anotherTableSchema}.${anotherTableName}" {
    nvarchar ${columnName} ""
          nvarchar ${anotherColumnName} ""
          
}
      "${tableSchema}.${tableName}" ${
        element.md
      } "${anotherTableSchema}.${anotherTableName}": "${anotherColumnName}"
`;

      // Act
      const chart = chartBuilder(tablesWithMultiple);

      // Assert
      expect(chart).toEqual(expected);
    });
  });
});

const emptyRelation = {
  referenceColumn: "",
  referenceTable: "",
  referenceTableSchema: "",
  foreignKey: "",
  nullable: false,
  constraints: [],
};
const numberOfTimesStringInString = (string: string, word: string) =>
  string.split(word).length - 1;
