import { DatabaseTable } from "../models/database-table.model";
import { chartBuilder } from "./builder.service";

describe('chartBuilder', () => {
  const tableName = 'dummyTable';
  const columnName = 'dummyColumn';

  // const anotherTableName = 'anotherDummyTable';
  // const anotherColumnName = 'dummyColumn';



  it('builds chart with uniqe columns', () => {

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

    const chart = chartBuilder(tablesWithMultiple);
    console.log(chart);
    expect(numberOfTimesStringInString(chart, columnName)).toBe(1);
  });
});

const emptyRelation = {
  ReferenceColumn: '',
  ReferenceTable: '',
  ForeignKey: ''
};
const numberOfTimesStringInString = (string, word) => string.split(word).length - 1;
