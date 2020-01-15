import { MssqlDb } from '../repositories/mssql.repository';

export const mssqlChartBuilder = (tables: MssqlDb[]) => {
  const tableStrings: string[] = [];
  const tableRelations: string[] = [];

  tables.forEach((table: any) => {
    let columString = '';
    table.C.forEach((column: any) => {
      columString += `${column.COLUMN_NAME}
          `;
      if (column.REFERENCE_TO_TABLE) {
        tableRelations.push(
          `${table.TABLE_NAME} --|> ${column.REFERENCE_TO_TABLE}: ${column.REFERENCE_COLUMN}
            `
        );
      }
    });
    let tableString = `
        class ${table.TABLE_NAME}{
            ${columString}
        }
        `;
    tableStrings.push(tableString);
  });

  return {
    chart: ` classDiagram
      ${tableStrings.join('')}
      ${tableRelations.join('')}
      `
  };
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
