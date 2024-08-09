import { DatabaseTable } from "../models/database-table.model";
import { DatabaseColumn } from "../models/database-column.model";

export const chartBuilder = (tables: DatabaseTable[]) => {
  const tableStrings: string[] = [];
  const tableRelations: string[] = [];

  tables.forEach((table: DatabaseTable) => {
    const columnNames: string[] = [];
    let columString = "";
    table.columns.forEach((column: DatabaseColumn) => {
      column.name = formatColumnName(column.name);
      column.referenceColumn = formatColumnName(column.referenceColumn);
      if (!columnNames.find((x) => x === column.name)) {
        columnNames.push(column.name);
        columString += `${column.dataType} ${column.name.replace(
          " ",
          "-"
        )} "${formatConstraints(column.constraints)}"
          `;
        if (column.referenceTable) {
          tableRelations.push(
            `"${table.schema}.${table.name}" ${getRelation(column)} "${
              column.referenceTableSchema
            }.${column.referenceTable}": "${column.referenceColumn}"\n`
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
    const err = new Error("Could not build mermaid from db response");
    err.stack = `Db-response:
    ${JSON.stringify(tables)}`;

    throw err;
  }
  return `erDiagram
      ${tableStrings.join("")}
      ${tableRelations.join("")}`;
};

const getRelation = (column: DatabaseColumn) => {
  const constraints = column.constraints;

  if (column.nullable && constraints.includes("UNIQUE")) {
    return "|o--||";
  }

  if (column.nullable) {
    return "|}--o|";
  }

  if (constraints.includes("UNIQUE")) {
    return "||--|{";
  }

  return "|{--||";
};

const formatConstraints = (element?: string[]) =>
  element
    ?.map((c) => (c === "PRIMARY KEY" ? "PK" : c))
    ?.map((c) => (c === "FOREIGN KEY" ? "FK" : c))
    .filter((c) => !!c)
    .join(", ") || "";

const formatColumnName = (name: string) => {
  if (!name) {
    return name;
  }

  if (/^\d/.test(name)) {
    name = `_${name}`;
  }

  return name.replace(" ", "_").replace("/", "_");
};
