import { SqlType } from './sql-type.enum';

export interface DataType {
  type: SqlType;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  primary?: boolean;
  default?: string;
}
