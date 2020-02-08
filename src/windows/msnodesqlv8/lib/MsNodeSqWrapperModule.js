"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MsNodeSqlWrapperModule;
(function (MsNodeSqlWrapperModule) {
    const legacyDriver = require('msnodesqlv8');
    class SqlModuleWrapperError {
        constructor(message) {
            this.message = message;
            this.sqlstate = "";
            this.code = 0;
        }
    }
    MsNodeSqlWrapperModule.SqlModuleWrapperError = SqlModuleWrapperError;
    let SqlCommandType;
    (function (SqlCommandType) {
        SqlCommandType[SqlCommandType["None"] = 0] = "None";
        SqlCommandType[SqlCommandType["QueryObjectFormat"] = 1] = "QueryObjectFormat";
        SqlCommandType[SqlCommandType["QueryRawFormat"] = 2] = "QueryRawFormat";
        SqlCommandType[SqlCommandType["StoredProcedure"] = 3] = "StoredProcedure";
        SqlCommandType[SqlCommandType["PreparingStatement"] = 4] = "PreparingStatement";
        SqlCommandType[SqlCommandType["PreparedStatement"] = 5] = "PreparedStatement";
    })(SqlCommandType = MsNodeSqlWrapperModule.SqlCommandType || (MsNodeSqlWrapperModule.SqlCommandType = {}));
    class SqlCommand {
        constructor(connection, id, commandType = SqlCommandType.QueryObjectFormat) {
            this.connection = connection;
            this.id = id;
            this.commandType = commandType;
        }
        isPrepared() {
            return this.commandType == SqlCommandType.PreparingStatement;
        }
        sql(s) {
            this._sql = s;
            if (this.commandType == SqlCommandType.None)
                this.commandType = SqlCommandType.QueryObjectFormat;
            return this;
        }
        params(v) {
            this._inputParams = v;
            return this;
        }
        param(v) {
            if (this._inputParams == null) {
                this._inputParams = [];
            }
            this._inputParams.push(v);
            return this;
        }
        procedure(s) {
            this._procedure = s;
            this.commandType = SqlCommandType.StoredProcedure;
            this.unsubscribe();
            return this;
        }
        rawFormat() {
            this.commandType = SqlCommandType.QueryRawFormat;
            return this;
        }
        wrapperTimeoutMs(to) {
            this._wrapperTimeoutMs = to;
            return this;
        }
        driverTimeoutMs(to) {
            this._driverTimeoutMs = to;
            return this;
        }
        onMeta(cb) {
            this._onMeta = cb;
            return this;
        }
        onColumn(cb) {
            this._onColumn = cb;
            return this;
        }
        onRowCount(cb) {
            this._onRowCount = cb;
            return this;
        }
        onRow(cb) {
            this._onRow = cb;
            return this;
        }
        onDone(cb) {
            this._onDone = cb;
            return this;
        }
        onSubmitted(cb) {
            this._onSubmitted = cb;
            return this;
        }
        onError(cb) {
            this._onError = cb;
            return this;
        }
        onClosed(cb) {
            this._onClosed = cb;
            return this;
        }
        unsubscribe() {
            this._onMeta = undefined;
            this._onColumn = undefined;
            this._onRowCount = undefined;
            this._onRow = undefined;
            this._onDone = undefined;
            this._onError = undefined;
            this._onClosed = undefined;
        }
        subscribe() {
            let query = this._query;
            if (query) {
                if (this._onMeta != null) {
                    query.on('meta', (m) => this._onMeta(m));
                }
                if (this._onColumn != null) {
                    query.on('column', (c, d, m) => this._onColumn(c, d, m));
                }
                if (this._onRowCount != null) {
                    query.on('rowCount', (m) => this._onRowCount(m));
                }
                if (this._onRow != null) {
                    query.on('row', (m) => this._onRow(m));
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
        subscribing() {
            return this._onMeta != null
                || this._onSubmitted != null
                || this._onColumn != null
                || this._onRowCount != null
                || this._onRow != null
                || this._onDone != null
                || this._onError != null
                || this._onClosed != null;
        }
        execProcedure(resolve, reject, res) {
            let timeout = this._driverTimeoutMs > 0 ? this._driverTimeoutMs / 1000 : 0;
            let pm = this.connection.legacy_conn.procedureMgr();
            pm.setTimeout(timeout);
            pm.callproc(this._procedure, this._inputParams, (err, rows, outputParams) => {
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
        execQuery(resolve, reject, res) {
            let timeout = this._driverTimeoutMs > 0 ? this._driverTimeoutMs / 1000 : 0;
            this._query = this.connection.legacy_conn.query({
                query_str: this._sql,
                query_timeout: timeout
            }, this._inputParams, (err, rows, more) => {
                if (err) {
                    res.error = err;
                    reject(res);
                }
                else {
                    res.aggregate(rows);
                    if (!more)
                        resolve(res);
                }
            });
        }
        execQueryRaw(resolve, reject, res) {
            let timeout = this._driverTimeoutMs > 0 ? this._driverTimeoutMs / 1000 : 0;
            this._query = this.connection.legacy_conn.queryRaw({
                query_str: this._sql,
                query_timeout: timeout
            }, this._inputParams, (err, rawData, more) => {
                if (err) {
                    res.error = err;
                    reject(res);
                }
                else {
                    res.aggregateRaw(rawData);
                    if (!more)
                        resolve(res);
                }
            });
        }
        execPrepared(resolve, reject, res) {
            this._preparedStatement.preparedQuery(this._inputParams, (err, rows, more) => {
                if (err) {
                    res.error = err;
                    reject(res);
                }
                else {
                    res.aggregate(rows);
                    if (!more)
                        resolve(res);
                }
            });
        }
        cancel() {
            return new Promise((resolve, reject) => {
                let inst = this;
                if (!this._query) {
                    reject(new SqlModuleWrapperError('can only cancel a submitted query.'));
                    return;
                }
                this._query.cancelQuery(err => {
                    if (!err)
                        reject(new SqlModuleWrapperError(`failed to cancel: ${err.message}`));
                    resolve(inst);
                });
            });
        }
        freePrepared() {
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
                });
            });
        }
        prepare() {
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
                this.connection.legacy_conn.prepare(this._sql, (err, statement) => {
                    if (err) {
                        reject(err);
                        inst.commandType = SqlCommandType.None;
                    }
                    else {
                        inst._preparedStatement = statement;
                        inst.commandType = SqlCommandType.PreparedStatement;
                        resolve(inst);
                    }
                });
            });
        }
        dispatchCommandType(resolve, reject, res) {
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
        execute() {
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
                }
                else if (this.subscribing()) {
                    this.subscribe();
                }
            });
        }
    }
    MsNodeSqlWrapperModule.SqlCommand = SqlCommand;
    class RawData {
        constructor() {
            this.meta = [];
        }
    }
    MsNodeSqlWrapperModule.RawData = RawData;
    class SqlCommandResponse {
        constructor() {
            this.asObjects = [];
        }
        aggregateRaw(raw) {
            let rd = this.rawData;
            if (rd == null) {
                this.rawData = rd = new RawData();
                rd.meta = raw.meta;
                rd.rows = [];
            }
            raw.rows.forEach(row => rd.rows.push(row));
        }
        aggregate(rows) {
            if (this.asObjects == null) {
                this.asObjects = [];
            }
            rows.forEach(r => this.asObjects.push(r));
        }
    }
    MsNodeSqlWrapperModule.SqlCommandResponse = SqlCommandResponse;
    class Dictionary {
        constructor() {
            this.container = {};
        }
        count() {
            let keys = Object.keys(this.container);
            return keys.length;
        }
        values() {
            let va = [];
            let keys = Object.keys(this.container);
            keys.forEach(k => va.push(this.container[k]));
            return va;
        }
        keys() {
            return Object.keys(this.container);
        }
        containsKey(key) {
            return this.container[key] != null;
        }
        add(key, v) {
            if (this.containsKey(key))
                throw new Error(`duplicate key ${key}`);
            this.container[key] = v;
        }
        remove(key) {
            delete this.container[key];
        }
        get(key) {
            return this.container[key];
        }
        forEach(cb) {
            Object.keys(this.container).forEach((k) => cb(k, this.container[k]));
        }
    }
    MsNodeSqlWrapperModule.Dictionary = Dictionary;
    class ConnectionPool {
        constructor() {
            this.connections = new Dictionary();
        }
    }
    MsNodeSqlWrapperModule.ConnectionPool = ConnectionPool;
    class CommandCache {
        constructor(connection) {
            this.connection = connection;
            this.CachedCommands = new Dictionary();
        }
        get(id) {
            if (id == null)
                return new SqlCommand(this.connection);
            let cached = this.CachedCommands.get(id);
            if (cached == null) {
                cached = new SqlCommand(this.connection);
                this.CachedCommands.add(id, cached);
            }
            return cached;
        }
        free(commandId) {
            return new Promise((resolve, reject) => {
                let c = this.CachedCommands.get(commandId);
                if (c == null) {
                    reject(false);
                    return;
                }
                if (c.isPrepared()) {
                    c.freePrepared().then(() => {
                        this.CachedCommands.remove(commandId);
                        resolve(commandId);
                    });
                }
                else {
                    this.CachedCommands.remove(commandId);
                    resolve(commandId);
                }
            });
        }
        deleteAll() {
            return new Promise((resolve, reject) => {
                this.CachedCommands.forEach((id, c) => {
                    this.free(id).then(() => {
                        if (this.CachedCommands.count() == 0) {
                            resolve(true);
                        }
                    }).catch(e => {
                        reject(e);
                    });
                });
            });
        }
    }
    MsNodeSqlWrapperModule.CommandCache = CommandCache;
    class SqlConnection {
        constructor(legacy_conn) {
            this.legacy_conn = legacy_conn;
            this.CommandCache = new CommandCache(this);
        }
        id() {
            return this.legacy_conn.id.toString();
        }
        getCommand() {
            return new SqlCommand(this);
        }
        static getLegacy() {
            return legacyDriver;
        }
        close() {
            return new Promise((resolve, reject) => {
                this.legacy_conn.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
        }
    }
    MsNodeSqlWrapperModule.SqlConnection = SqlConnection;
    class Sql {
        constructor(connStr) {
            this.connStr = connStr;
        }
        execute(sql, params = [], raw = false) {
            return new Promise((resolve, reject) => {
                this.open().then((connection) => {
                    let command = new SqlCommand(connection);
                    if (raw)
                        command = command.rawFormat();
                    command.sql(sql).params(params).execute().then(res => {
                        connection.close().then(() => {
                            resolve(res);
                        }).catch(e => {
                            reject(e);
                        });
                    }).catch(e => {
                        reject(e);
                    });
                }).catch(e => {
                    reject(e);
                });
            });
        }
        open(timeout = 0) {
            return new Promise((resolve, reject) => {
                legacyDriver.open({
                    conn_str: this.connStr,
                    conn_timeout: timeout
                }, (err, legacy) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        let connection = new SqlConnection(legacy);
                        resolve(connection);
                    }
                });
            });
        }
    }
    MsNodeSqlWrapperModule.Sql = Sql;
})(MsNodeSqlWrapperModule = exports.MsNodeSqlWrapperModule || (exports.MsNodeSqlWrapperModule = {}));
//# sourceMappingURL=MsNodeSqWrapperModule.js.map