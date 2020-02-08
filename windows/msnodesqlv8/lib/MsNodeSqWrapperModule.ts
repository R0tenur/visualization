

import {SqlClient, Error, Meta, EventColumnCb, PreparedStatement, Query, Connection} from "msnodesqlv8";

/**
 * Created by Stephen on 1/22/2017.
 */

export module MsNodeSqlWrapperModule {

    const legacyDriver: SqlClient = require('msnodesqlv8');

    export class SqlModuleWrapperError implements Error {
        constructor(public message: string) {
        }

        sqlstate: string = "";
        code: number = 0;
    }

    export interface queryCb<T> { (v: T): void
    }

    export enum SqlCommandType
    {
        None,
        QueryObjectFormat,
        QueryRawFormat,
        StoredProcedure,
        PreparingStatement,
        PreparedStatement
    }

    export class SqlCommand {

        constructor(public connection: SqlConnection, public id ?: string, public commandType: SqlCommandType = SqlCommandType.QueryObjectFormat) {
        }

        _driverTimeoutMs: number | undefined;
        _wrapperTimeoutMs: number | undefined;
        _sql: string | undefined;
        _procedure: string | undefined;

        _inputParams: any[] | undefined;

        _onMeta: queryCb<Meta> | undefined;
        _onColumn: EventColumnCb | undefined;
        _onRowCount: queryCb<number> | undefined;
        _onRow: queryCb<number> | undefined;
        _onDone: queryCb<any> | undefined;
        _onSubmitted: queryCb<any> | undefined;
        _onError: queryCb<string> | undefined;
        _onClosed: queryCb<string> | undefined;

        _query: Query | undefined;
        _preparedStatement: PreparedStatement | undefined;

        public isPrepared(): boolean {
            return this.commandType == SqlCommandType.PreparingStatement;
        }

        public sql(s: string): SqlCommand {
            this._sql = s;
            if (this.commandType == SqlCommandType.None)
                this.commandType = SqlCommandType.QueryObjectFormat;
            return this;
        }

        public params(v: any[]): SqlCommand {
            this._inputParams = v;
            return this;
        }

        public param(v: any): SqlCommand {
            if (this._inputParams == null) {
                this._inputParams = [];
            }
            this._inputParams.push(v);
            return this;
        }

        public procedure(s: string): SqlCommand {
            this._procedure = s;
            this.commandType = SqlCommandType.StoredProcedure;
            this.unsubscribe();
            return this;
        }

        public rawFormat(): SqlCommand {
            this.commandType = SqlCommandType.QueryRawFormat;
            return this;
        }

        public wrapperTimeoutMs(to: number): SqlCommand {
            this._wrapperTimeoutMs = to;
            return this;
        }

        public driverTimeoutMs(to: number): SqlCommand {
            this._driverTimeoutMs = to;
            return this;
        }

        public onMeta(cb: queryCb<Meta>): SqlCommand {
            this._onMeta = cb;
            return this;
        }

        public onColumn(cb: EventColumnCb): SqlCommand {
            this._onColumn = cb;
            return this;
        }

        public onRowCount(cb: queryCb<number>): SqlCommand {
            this._onRowCount = cb;
            return this;
        }

        public onRow(cb: queryCb<number>): SqlCommand {
            this._onRow = cb;
            return this;
        }

        public onDone(cb: queryCb<any>): SqlCommand {
            this._onDone = cb;
            return this;
        }

        public onSubmitted(cb: queryCb<any>): SqlCommand {
            this._onSubmitted = cb;
            return this;
        }

        public onError(cb: queryCb<string>): SqlCommand {
            this._onError = cb;
            return this;
        }

        public onClosed(cb: queryCb<string>): SqlCommand {
            this._onClosed = cb;
            return this;
        }

        public unsubscribe(): void {
            this._onMeta = undefined;
            this._onColumn = undefined;
            this._onRowCount = undefined;
            this._onRow = undefined;
            this._onDone = undefined;
            this._onError = undefined;
            this._onClosed = undefined;
        }

        private subscribe(): void {

            let query = this._query;

            if (query) {
                if (this._onMeta != null) {
                    query.on('meta', (m:any) => this._onMeta(m));
                }
                if (this._onColumn != null) {
                    query.on('column', (c:any, d:any, m:any) => this._onColumn(c, d, m));
                }
                if (this._onRowCount != null) {
                    query.on('rowCount', (m:any) => this._onRowCount(m));
                }
                if (this._onRow != null) {
                    query.on('row', (m:any) => this._onRow(m));
                }
                if (this._onDone != null) {
                    query.on('done', m => this._onDone(m));
                }
                if (this._onError != null) {
                    query.on('error', m => this._onError(m));
                }
                if (this._onClosed != null) {
                    query.on('closed', m => this._onClosed(m));
                }
                if (this._onSubmitted != null) {
                    query.on('submitted', m => this._onSubmitted(m));
                }
            }            
        }

        public subscribing(): boolean {
            return this._onMeta != null
                || this._onSubmitted != null
                || this._onColumn != null
                || this._onRowCount != null
                || this._onRow != null
                || this._onDone != null
                || this._onError != null
                || this._onClosed != null
        }

        private execProcedure(resolve: Function, reject: Function, res: SqlCommandResponse): void {
            let timeout = this._driverTimeoutMs > 0 ? this._driverTimeoutMs / 1000 : 0;
            let pm = this.connection.legacy_conn.procedureMgr();
            pm.setTimeout(timeout);
            pm.callproc(this._procedure, this._inputParams, (err?: Error, rows?: any[], outputParams?: any[]) => {
                if (err) {
                    res.error = err;
                    reject(res);
                }
                else {
                    res.aggregate(rows);
                    res.outputParams = outputParams;
                    resolve(res);
                }
            });
        }

        private execQuery(resolve: Function, reject: Function, res: SqlCommandResponse): void {
            let timeout = this._driverTimeoutMs > 0 ? this._driverTimeoutMs / 1000 : 0;
            this._query = this.connection.legacy_conn.query({
                query_str: this._sql,
                query_timeout: timeout
            }, this._inputParams, (err: Error, rows: any[], more: boolean) => {
                if (err) {
                    res.error = err;
                    reject(res);
                } else {
                    res.aggregate(rows);
                    if (!more) resolve(res);
                }
            });
        }

        private execQueryRaw(resolve: Function, reject: Function, res: SqlCommandResponse): void {
            let timeout = this._driverTimeoutMs > 0 ? this._driverTimeoutMs / 1000 : 0;
            this._query = this.connection.legacy_conn.queryRaw({
                query_str: this._sql,
                query_timeout: timeout
            }, this._inputParams, (err?: Error, rawData?: RawData, more?: boolean) => {
                if (err) {
                    res.error = err;
                    reject(res);
                } else {
                    res.aggregateRaw(rawData);
                    if (!more) resolve(res);
                }
            });
        }

        private execPrepared(resolve: Function, reject: Function, res: SqlCommandResponse): void {
            this._preparedStatement.preparedQuery(
                this._inputParams, (err: Error, rows: any[], more: boolean) => {
                    if (err) {
                        res.error = err;
                        reject(res);
                    } else {
                        res.aggregate(rows);
                        if (!more) resolve(res);
                    }
                });
        }

        public cancel(): Promise<SqlCommand> {
            return new Promise((resolve, reject) => {
                let inst = this;
                if (!this._query) {
                    reject(new SqlModuleWrapperError('can only cancel a submitted query.'));
                    return;
                }
                this._query.cancelQuery(err => {
                    if (!err) reject(new SqlModuleWrapperError(`failed to cancel: ${err.message}`));
                    resolve(inst);
                })
            });
        }

        public freePrepared(): Promise<SqlCommand> {
            return new Promise((resolve, reject) => {
                let inst = this;
                if (this.commandType != SqlCommandType.PreparedStatement) {
                    reject(new SqlModuleWrapperError('freePrepared must be called on prepared command.'));
                    return;
                }
                this._preparedStatement.free(() => {
                    inst._preparedStatement = null;
                    inst.commandType = SqlCommandType.None;
                    resolve(inst);
                })
            });
        }

        public prepare(): Promise<SqlCommand> {
            return new Promise((resolve, reject) => {
                if (this._sql == null) {
                    reject(new SqlModuleWrapperError('prepare must be called after sql() with sql to prepare.'));
                    return;
                }
                if (this.commandType == SqlCommandType.PreparingStatement) {
                    reject(new SqlModuleWrapperError('prepare is preparing and must be called once only on a command.'));
                    return;
                }
                if (this._preparedStatement != null) {
                    reject(new SqlModuleWrapperError('this command has previously been prepared.'));
                    return;
                }
                this.commandType = SqlCommandType.PreparingStatement;
                this.unsubscribe();
                let inst = this;
                this.connection.legacy_conn.prepare(this._sql, (err?: Error, statement?: PreparedStatement) => {
                    if (err) {
                        reject(err);
                        inst.commandType = SqlCommandType.None;
                    } else {
                        inst._preparedStatement = statement;
                        inst.commandType = SqlCommandType.PreparedStatement;
                        resolve(inst);
                    }
                })
            });
        }

        private dispatchCommandType(resolve: Function, reject: Function, res: SqlCommandResponse): void {
            switch (this.commandType) {

                case SqlCommandType.QueryObjectFormat: {
                    this.execQuery(resolve, reject, res);
                    break;
                }

                case SqlCommandType.QueryRawFormat: {
                    this.execQueryRaw(resolve, reject, res);
                    break;
                }

                case SqlCommandType.StoredProcedure: {
                    this.execProcedure(resolve, reject, res);
                    break;
                }

                case SqlCommandType.PreparingStatement: {
                    res.error = new SqlModuleWrapperError(`statement not yet prepared.`);
                    break;
                }

                case SqlCommandType.PreparedStatement: {
                    this.execPrepared(resolve, reject, res);
                    break;
                }

                default: {
                    res.error = new SqlModuleWrapperError(`${this.commandType} is not valid value.`);
                    break;
                }
            }
        }

        public execute(): Promise<SqlCommandResponse> {

            return new Promise((resolve, reject) => {
                let res = new SqlCommandResponse();
                let to = this._wrapperTimeoutMs;
                if (to > 0) {
                    setTimeout(to, () => {
                        res.error = new SqlModuleWrapperError(`wrapper timeout ${to} expired.`);
                        reject(res);
                    });
                }

                this.dispatchCommandType(resolve, reject, res);

                if (res.error != null) {
                    reject(res);
                } else if (this.subscribing()) {
                    this.subscribe()
                }
            })
        }
    }

    export class RawData implements RawData {
        public meta: Meta[] = [];
        public rows: Array<any[]> [];
    }

    export class SqlCommandResponse {

        public aggregateRaw(raw: RawData) {
            let rd = this.rawData;
            if (rd == null) {
                this.rawData = rd = new RawData();
                rd.meta = raw.meta;
                rd.rows = [];
            }

            raw.rows.forEach(row => rd.rows.push(row));
            
        }

        public aggregate(rows: any[]) {
            if (this.asObjects == null) {
                this.asObjects = [];
            }
            rows.forEach(r => this.asObjects.push(r));
        }

        public error: Error | undefined;
        public asObjects: any[] = [];
        public outputParams: any[] | undefined;
        public rawData: RawData | undefined;
    }

    export interface dictIteratorCb<T> { (key: string, val: T): void
    }

    export class Dictionary<T> {

        container: {[id: string]: T;} = {};

        public count(): number {
            let keys = Object.keys(this.container);
            return keys.length;
        }

        public values(): T[] {
            let va: T[] = [];
            let keys = Object.keys(this.container);
            keys.forEach(k => va.push(this.container[k]));
            return va;
        }

        public keys(): string[] {
            return Object.keys(this.container);
        }

        public containsKey(key: string): boolean {
            return this.container[key] != null;
        }

        public add(key: string, v: T): void {
            if (this.containsKey(key)) throw new Error(`duplicate key ${key}`);
            this.container[key] = v;
        }

        public remove(key: string): void {
            delete this.container[key];
        }

        public get(key: string): T {
            return this.container[key];
        }

        public forEach(cb: dictIteratorCb<T>) {
            Object.keys(this.container).forEach((k: string) => cb(k, this.container[k]));
        }
    }

    export class ConnectionPool {
        connections: Dictionary<Connection> = new Dictionary<Connection>();
    }

    export class CommandCache {
        public CachedCommands: Dictionary<SqlCommand> = new Dictionary<SqlCommand>();

        constructor(public connection: SqlConnection) {
        }

        public get(id?: string): SqlCommand {
            if (id == null) return new SqlCommand(this.connection);
            let cached = this.CachedCommands.get(id);
            if (cached == null) {
                cached = new SqlCommand(this.connection);
                this.CachedCommands.add(id, cached);
            }
            return cached;
        }

        public free(commandId?: string): Promise<string> {
            return new Promise((resolve, reject) => {
                let c: SqlCommand = this.CachedCommands.get(commandId);
                if (c == null) {
                    reject(false);
                    return;
                }
                if (c.isPrepared()) {
                    c.freePrepared().then(() => {
                        this.CachedCommands.remove(commandId);
                        resolve(commandId);
                    });
                } else {
                    this.CachedCommands.remove(commandId);
                    resolve(commandId);
                }
            });
        }

        public deleteAll(): Promise<boolean> {
            return new Promise((resolve, reject) => {
                this.CachedCommands.forEach((id, c) => {
                    this.free(id).then(()=> {
                        if (this.CachedCommands.count() == 0) {
                            resolve(true);
                        }
                    }).catch(e => {
                        reject(e);
                    })
                });
            });
        }
    }

    export class SqlConnection {

        public CommandCache: CommandCache;

        constructor(public legacy_conn: Connection) {
            this.CommandCache = new CommandCache(this);
        }

        public id(): string {
            return this.legacy_conn.id.toString();
        }

        public getCommand() : SqlCommand {
            return new SqlCommand(this);
        }

        public static getLegacy(): SqlClient {
            return legacyDriver;
        }

        public close(): Promise<any> {
            return new Promise((resolve, reject) => {
                this.legacy_conn.close((err: Error) => {
                    if (err) reject(err);
                    else resolve();
                })
            });
        }
    }

    export class Sql {

        constructor(public connStr: string) {
        }

        public execute(sql:string, params:any = [], raw:boolean = false) : Promise<SqlCommandResponse> {
            return new Promise((resolve, reject) => {
                this.open().then( (connection : SqlConnection) => {
                    let command = new SqlCommand(connection);
                    if (raw) command = command.rawFormat();
                    command.sql(sql).params(params).execute().then(res=> {
                        connection.close().then(() => {
                            resolve(res);
                        }).catch(e=>{
                            reject(e);
                        });
                    }).catch(e=> {
                        reject(e);
                    })
                }).catch(e=> {
                    reject(e);
                });
            });
        }

        public open(timeout: number = 0): Promise<SqlConnection> {
            return new Promise((resolve, reject) => {
                legacyDriver.open({
                    conn_str: this.connStr,
                    conn_timeout: timeout
                }, (err: Error, legacy: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        let connection = new SqlConnection(legacy);
                        resolve(connection);
                    }
                });
            });
        }
    }
}