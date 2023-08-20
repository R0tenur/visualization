import { DatabaseTable } from "../models/database-table.model";
import { DatabaseColumn } from "../models/database-column.model";

export const chartBuilder = (tables: DatabaseTable[]) => {
  const tableStrings: string[] = [];
  const tableRelations: string[] = [];

  tables.forEach((table: DatabaseTable) => {
    const columnNames: string[] = [];
    let columString = "";
    table.columns.forEach((column: DatabaseColumn) => {
      if (!columnNames.find((x) => x === column.name)) {
        columnNames.push(column.name);
        columString += `${column.dataType} ${column.name} ${column.constraint}
          `;
        if (column.referenceTable) {
          tableRelations.push(
            `"${table.schema}.${table.name}" ||--|{ "${column.referenceTableSchema}.${column.referenceTable}": ${column.referenceColumn}\n`
          );
        }
      }
    });

    let tableString = `
"${table.schema}.${table.name}" {
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
  return `erDiagram
      ${tableStrings.join("")}
      ${tableRelations.join("")}`;
};

export const databaseListChartBuilder = (databases: string[]): any => {
  let chartString = "";

  databases.forEach((db) => {
    chartString += `class ${db}{}
        `;
  });
  return {
    chart: `erDiagram
${chartString}
      `,
  };
};
