/* istanbul ignore file */
export interface DatabaseColumn {
    name: string;
    referenceColumn: string;
    referenceTable: string;
    referenceTableSchema: string;
    foreignKey: string;
}
