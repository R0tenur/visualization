import { connection, dataprotocol, DataProviderType, QueryProvider, SimpleExecuteResult } from "azdata";
import { Provider } from "../models/provider.enum";


export const runQuery = <T>(provider: Provider, connectionId: string, query: string): Promise<T[]> => new Promise((resolve, reject) =>
    connection.getUriForConnection(connectionId).then(connectionUri => {
        const queryProvider: QueryProvider = dataprotocol.getProvider(provider, DataProviderType.QueryProvider);
        queryProvider.runQueryAndReturn(connectionUri, query).then(result => resolve(mapResult(result)));
    })
);

const mapResult = <T>(result: SimpleExecuteResult): T[] => result.rows.map(element => {
    const item = {};
    for (let columnIndex = 0; columnIndex < result.columnInfo.length; columnIndex++) {
        item[result.columnInfo[columnIndex].columnName] = undefinedOrValue(element[columnIndex].displayValue);
    }
    return item as T;
});

const undefinedOrValue = (value: string) => value !== 'NULL' ? value : undefined;