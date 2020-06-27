import { DatabaseTable } from "../models/database-table.model";
import { DatabaseColumn } from "../models/database-column.model";

export const chartBuilder = (tables: DatabaseTable[]) => {
  const tableStrings: string[] = [];
  const tableRelations: string[] = [];

  tables.forEach((table: any) => {
    let columString = '';
    table.Columns.forEach((column: DatabaseColumn) => {
      columString += `${column.Name}
          `;
      if (column.ReferenceTable) {
        tableRelations.push(
          `${table.Name} --|> ${column.ReferenceTable}: ${column.ReferenceColumn}
            `
        );
      }
    });
    let tableString = `
        class ${table.Name}{
            ${columString}
        }
        `;
    tableStrings.push(tableString);
  });
  if (tableStrings.length === 0) {
    return null;
  }
  return `classDiagram
      ${tableStrings.join('')}
      ${tableRelations.join('')}
      `;

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
