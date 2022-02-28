import { DatabaseTable } from "../models/database-table.model";
import { chartBuilder } from "./builder.service";

describe('chartBuilder', () => {
  const tableName = 'dummyTable';
  const columnName = 'dummyColumn';

  const anotherTableName = 'anotherDummyTable';
  const anotherColumnName = 'anotherDummyColumn';
  it('throws error when no db-respone', () => {

    // Act
    const err = () => chartBuilder([]);

    // Asser
    expect(err).toThrowError();
  });

  it('builds chart with uniqe columns', () => {
    // arrange
    const tablesWithMultiple: DatabaseTable[] = [
      {
        Name: tableName,
        Columns: [
          {
            Name: columnName,
            ...emptyRelation
          },
          {
            Name: columnName,
            ...emptyRelation
          },
        ],
      }
    ];

    // Act
    const chart = chartBuilder(tablesWithMultiple);

    // Asser
    expect(numberOfTimesStringInString(chart, columnName)).toBe(1);
  });

  it('builds chart with uniqe columns', () => {
    // arrange
    const tablesWithMultiple: DatabaseTable[] = [
      {
        Name: tableName,
        Columns: [
          {
            Name: columnName,
            ReferenceColumn: anotherColumnName,
            ReferenceTable: anotherTableName,
            ForeignKey: 'theKey'

          },
        ],
      },
      {
        Name: anotherTableName,
        Columns: [
          {
            Name: columnName,
            ...emptyRelation
          },
          {
            Name: anotherColumnName,
            ...emptyRelation
          },
        ],
      }
    ];

    const expected = `classDiagram
      
class dummyTable {
    dummyColumn
          
}
class anotherDummyTable {
    dummyColumn
          anotherDummyColumn
          
}
      dummyTable --|> anotherDummyTable: anotherDummyColumn
`;

    // Act
    const chart = chartBuilder(tablesWithMultiple);

    // Assert
    expect(chart).toEqual(expected);
  });
});


const emptyRelation = {
  ReferenceColumn: '',
  ReferenceTable: '',
  ForeignKey: ''
};
const numberOfTimesStringInString = (string: string, word: string) => string.split(word).length - 1;
