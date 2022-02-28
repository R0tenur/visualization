/* istanbul ignore file */
import { DatabaseColumn } from "./database-column.model";
export interface DatabaseTable {
    Name: string;
    Columns: DatabaseColumn[];
}
