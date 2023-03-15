import { SqlType } from './sql-type.enum';

export interface ColumnData {
  type: SqlType;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  primary?: boolean;
  default?: string;
}
