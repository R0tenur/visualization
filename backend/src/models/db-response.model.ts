/* istanbul ignore file */
export interface DbResponse {
    TABLE_NAME: string;
    TABLE_SCHEMA: string;
    COLUMN_NAME: string;
    REFERENCE_TO_TABLE: string;
    REFERENCE_COLUMN: string;
    REFERENCE_TO_TABLE_SCHEMA: string;
    FOREIGN_KEY: string;
}