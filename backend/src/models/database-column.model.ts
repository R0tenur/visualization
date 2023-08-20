/* istanbul ignore file */
export interface DatabaseColumn {
  dataType: string;
  name: string;
  referenceColumn: string;
  referenceTable: string;
  referenceTableSchema: string;
  constraint: string;
}
