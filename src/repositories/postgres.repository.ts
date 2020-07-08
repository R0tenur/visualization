import { DatabaseTable } from "../models/database-table.model";
import { Database } from "../models/database.model";


export const getPostgresDbSchema = async (
    username: string,
    password: string,
    server: string,
    database: string,
    trusted: boolean
): Promise<Database> => {
    let db: Database = {
        tables: [],
        errors: []
    } as Database;
    let sql: any;
    try {
      
    } catch (err) {
        db.errors.push('Error getting data: ' + err.message);
    } finally {
        sql.close();
    }
    return db;
};

const toTables = (dbResult): DatabaseTable[] => {
    const result: DatabaseTable[] = [];
    for (let index = 0; index < dbResult.recordset.length; index++) {
        const element = dbResult.recordset[index];
        const columnToAdd = {
            Name: element.column_name,
            ReferenceColumn: element.reference_column,
            ReferenceTable: element.reference_table,
            ForeignKey: element.foregin_key,
        };
        const existing = result.find(t => t.Name === element.table_name);

        if (existing) {
            existing.Columns.push(columnToAdd);
        } else {
            result.push({
                Name: element.table_name,
                Columns: [
                    columnToAdd
                ]
            });
        }
    }
    return result;
};
const postgresQuery = `
SELECT t.table_name,
       c.column_name,
    (SELECT ccu.table_name
     FROM information_schema.table_constraints AS tc
     LEFT JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
     LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_name = t.table_name AND kcu.column_name = c.column_name
    limit 1) as reference_table,
    (SELECT ccu.column_name
     FROM information_schema.table_constraints AS tc
     LEFT JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
     LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_name = t.table_name AND kcu.column_name = c.column_name
    limit 1) as reference_column,
    (SELECT tc.constraint_name
     FROM information_schema.table_constraints AS tc
     LEFT JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
     LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_name = t.table_name AND kcu.column_name = c.column_name
    limit 1) as foregin_key
FROM information_schema.tables T
INNER JOIN information_schema.columns C ON c.table_name = t.table_name
WHERE T.table_schema = 'public';
`;
