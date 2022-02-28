/* istanbul ignore file */
import { DatabaseTable } from "./database-table.model";
export interface Database {
    tables: DatabaseTable[];
    errors: any[];
}
