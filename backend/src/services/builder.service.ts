import { DatabaseTable } from "../models/database-table.model";
import { DatabaseColumn } from "../models/database-column.model";

export const chartBuilder = (tables: DatabaseTable[]) => {
  const tableStrings: string[] = [];
  const tableRelations: string[] = [];

  tables.forEach((table: DatabaseTable) => {
    const columnNames: string[] = [];
    let columString = '';
    if (table.columns) {
      table.columns.forEach((column: DatabaseColumn) => {
        if (!columnNames.find(x => x === column.name)) {
          columnNames.push(column.name);
          columString += `${column.name}
          `;
          if (column.referenceTable) {
            tableRelations.push(
              `${table.schema}_${table.name} --|> ${column.referenceTableSchema}_${column.referenceTable}: ${column.referenceColumn}\n`
            );
          }
        }

      });
    }

    let tableString = `
class ${table.schema}_${table.name} {
    ${columString}
}`;
    tableStrings.push(tableString);
  });
  if (tableStrings.length === 0) {
    var err = new Error("Could not build mermaid from db response");
    err.stack = `Db-response:
    ${JSON.stringify(tables)}`;

    throw err;
  }
  return `classDiagram
      ${tableStrings.join('')}
      ${tableRelations.join('')}`;

};

export const databaseListChartBuilder = (databases: string[]): any => {
  let chartString = '';

  databases.forEach(db => {
    chartString += `class ${db}{}
        `;
  });

  return {
    chart: `classDiagram
      ${chartString}
      `
  };
};
