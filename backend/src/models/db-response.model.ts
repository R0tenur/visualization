/* istanbul ignore file */
export interface DbResponse {
  TABLE_NAME: string;
  TABLE_SCHEMA: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: string;
  IS_NULLABLE: string;
  REFERENCE_TO_TABLE: string;
  REFERENCE_COLUMN: string;
  REFERENCE_TO_TABLE_SCHEMA: string;
  FOREIGN_KEY: string;
  CONSTRAINT_TYPE: string;
}

export interface DbViewResponse {
  TABLE_NAME: string;
  TABLE_SCHEMA: string;
  COLUMN_NAME: string;
  VIEW_SCHEMA: string;
  VIEW_NAME: string;
}
