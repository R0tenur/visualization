import { connection, ConnectionProvider, dataprotocol, DataProviderType, QueryProvider, SimpleExecuteResult } from "azdata";
import { Provider } from "../models/provider.enum";


export const runQuery = async <T>(provider: Provider, connectionId: string, database: string, query: string): Promise<T[]> => {

    const connectionUri = await connection.getUriForConnection(connectionId);

    const connectionProvider: ConnectionProvider = dataprotocol.getProvider(provider, DataProviderType.ConnectionProvider);
    await connectionProvider.changeDatabase(connectionUri, database);

    const queryProvider: QueryProvider = dataprotocol.getProvider(provider, DataProviderType.QueryProvider);
    const dbResult = await toPromise(queryProvider.runQueryAndReturn(connectionUri, query));
    return mapResult(dbResult);
};

const mapResult = <T>(result: SimpleExecuteResult): T[] => result.rows.map(element => {
    const item = {};
    for (let columnIndex = 0; columnIndex < result.columnInfo.length; columnIndex++) {
        item[result.columnInfo[columnIndex].columnName] = undefinedOrValue(element[columnIndex].displayValue);
    }
    return item as T;
});

const undefinedOrValue = (value: string) => value !== 'NULL' ? value : undefined;
const toPromise = <T>(t: Thenable<T>): Promise<T> => new Promise((resolve, reject) => t.then(
    result => resolve(result),
    err => reject(err)
))