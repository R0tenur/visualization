/* istanbul ignore file */
import { DatabaseColumn } from "./database-column.model";
export interface DatabaseTable {
    name: string;
    schema: string;
    columns: DatabaseColumn[];
}
