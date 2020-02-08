"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql = require('msnodesqlv8');
let argv = require('minimist')(process.argv.slice(2));
let supp = require('./demo-support');
let ASQ = require('asynquence-contrib');
const MsNodeSqWrapperModule_1 = require("../../lib/MsNodeSqWrapperModule");
var ColumnType;
(function (ColumnType) {
    ColumnType[ColumnType["bit"] = 0] = "bit";
    ColumnType[ColumnType["date"] = 1] = "date";
    ColumnType[ColumnType["string"] = 2] = "string";
    ColumnType[ColumnType["binary"] = 3] = "binary";
    ColumnType[ColumnType["decimal"] = 4] = "decimal";
    ColumnType[ColumnType["int"] = 5] = "int";
})(ColumnType || (ColumnType = {}));
class TableGenerator {
    constructor() {
        this.dropSql = '';
        this.defSql = '';
        this.conn_str = "";
    }
    init() {
        return new Promise((resolve, reject) => {
            if (this.sqlWrapper != null)
                resolve(this.sqlWrapper);
            supp.GlobalConn.init(sql, (co) => {
                if (co == null)
                    reject('no db.');
                this.conn_str = co.conn_str;
                this.sqlWrapper = new MsNodeSqWrapperModule_1.MsNodeSqlWrapperModule.Sql(this.conn_str);
                resolve(this.sqlWrapper);
            });
        });
    }
    open(connString) {
        return new Promise((resolve, reject) => {
            sql.open(connString, (err, conn) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(conn);
                }
            });
        });
    }
    bind(conn) {
        return new Promise((resolve, reject) => {
            let tm = conn.tableMgr();
            let table = this.qualifiedName;
            tm.bind(table, (t) => {
                if (t != null) {
                    resolve(t);
                }
                else {
                    reject(`cannot resolve ${table}`);
                }
            });
        });
    }
    static makeString(maxLength) {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < TableGenerator.getRandomInt(1, maxLength); i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    static getColumn(column) {
        switch (column.type) {
            case 'bit':
                return TableGenerator.getRandomInt(0, 1);
            case 'int':
                return TableGenerator.getRandomInt(0, 10000);
            case 'nvarchar':
                return TableGenerator.makeString(column.max_length / 2);
            case 'date':
                return new Date(TableGenerator.getRandomInt(1970, 2100), TableGenerator.getRandomInt(0, 11), TableGenerator.getRandomInt(1, 28));
            case 'decimal':
                return TableGenerator.getRandomInt(0, 10000);
            case 'varbinary':
                return Buffer.from(TableGenerator.makeString(column.max_length / 2));
        }
    }
    single(i, schema) {
        let obj = {};
        schema.map(col => {
            obj[col.name] = TableGenerator.getColumn(col);
        });
        obj['ID'] = i;
        return obj;
    }
    rows(schema, n) {
        let v = [];
        for (let i = 0; i < n; ++i) {
            v[v.length] = this.single(i + 1, schema);
        }
        return v;
    }
    insert(tm, vec) {
        return new Promise((resolve, reject) => {
            tm.insertRows(vec, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    populate(rows) {
        return new Promise((resolve, reject) => {
            let inst = this;
            let vec = [];
            ASQ().runner(function* () {
                let conn = yield inst.open(inst.conn_str);
                let t = yield inst.bind(conn);
                let summary = t.getSummary();
                let schema = summary.columns;
                vec = inst.rows(schema, rows);
                yield inst.insert(t, vec);
                console.log('finished.');
            }).or((e) => {
                console.log(e.message);
                reject(vec);
            });
        });
    }
    create() {
        return new Promise((resolve, reject) => {
            let inst = this;
            ASQ().runner(function* () {
                let wrapper = yield inst.init();
                console.log('open question');
                let connection = yield wrapper.open();
                console.log(`drop table ${inst.dropSql}`);
                yield connection.getCommand().sql(inst.dropSql).execute();
                console.log('create table');
                console.log(`${inst.defSql}`);
                yield connection.getCommand().sql(inst.defSql).execute();
                console.log('close connection');
                yield connection.close();
                resolve();
            }).or((e) => {
                reject(e);
            });
        });
    }
    run() {
        return new Promise((reject, resolve) => {
            let inst = this;
            let create = argv.create || false;
            let rows = argv.populate || 0;
            ASQ().runner(function* () {
                inst.generate(argv);
                if (create) {
                    console.log(`creating ${inst.qualifiedName}`);
                    yield inst.create();
                }
                if (rows > 0) {
                    console.log(`populating ${inst.qualifiedName}`);
                    yield inst.populate(rows);
                }
                resolve();
            }).or((e) => {
                reject(e);
            });
        });
    }
    static colOfType(type, notNull) {
        notNull = notNull || true;
        let postFix = notNull ? ' NOT NULL' : '';
        return `${type}${postFix}`;
    }
    static nvarchar(width, notNull) {
        return TableGenerator.colOfType(`nvarchar(${width})`, notNull);
    }
    static varbinary(width, notNull) {
        return TableGenerator.colOfType(`varbinary(${width})`, notNull);
    }
    static nchar(width, notNull) {
        return TableGenerator.colOfType(`nchar(${width})`, notNull);
    }
    static decimal(width, precision, notNull) {
        return TableGenerator.colOfType(`decimal(${width}, ${precision})`, notNull);
    }
    static date(notNull) {
        return TableGenerator.colOfType('date', notNull);
    }
    static int(notNull) {
        return TableGenerator.colOfType('int', notNull);
    }
    static bit(notNull) {
        return TableGenerator.colOfType('bit', notNull);
    }
    static smallint(notNull) {
        return TableGenerator.colOfType('smallint', notNull);
    }
    static fromColumnType(index, colType) {
        let c = null;
        switch (colType) {
            case ColumnType.string:
                c = `col_str_${index} ${TableGenerator.nvarchar(20, true)}`;
                break;
            case ColumnType.decimal:
                c = `col_dec_${index} ${TableGenerator.decimal(34, 18, true)}`;
                break;
            case ColumnType.date:
                c = `col_dat_${index} ${TableGenerator.date(true)}`;
                break;
            case ColumnType.bit:
                c = `col_bit_${index} ${TableGenerator.bit(true)}`;
                break;
            case ColumnType.binary:
                c = `col_bin_${index} ${TableGenerator.varbinary(100, true)}`;
                break;
            case ColumnType.int:
                c = `col_int_${index} ${TableGenerator.int(true)}`;
                break;
        }
        return c;
    }
    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    static roundRobinCol(index) {
        return TableGenerator.fromColumnType(index, index % 6);
    }
    static randomCol(index) {
        return TableGenerator.fromColumnType(index, TableGenerator.getRandomInt(0, 5));
    }
    generate(argv) {
        let columns = argv.columns || 10;
        let schema = argv.schema || 'dbo';
        let table = argv.table || 'test_table';
        let random = argv.random || false;
        this.qualifiedName = `${schema}.${table}`;
        this.dropSql = `
IF OBJECT_ID('${this.qualifiedName}', 'U') IS NOT NULL
    DROP TABLE ${this.qualifiedName}
`;
        let cols = [];
        for (let i = 0; i < columns; ++i) {
            cols[cols.length] = random ? TableGenerator.randomCol(i) : TableGenerator.roundRobinCol(i);
        }
        let body = cols.join(',\n\t');
        this.defSql = `
CREATE TABLE ${this.qualifiedName} (
    ${body},
    ID int NOT NULL,
    PRIMARY KEY (ID)
);`;
    }
}
let help = argv.h || argv.help || false;
if (help) {
    console.log('create a test definition and / or populate with n rows of random data');
    console.log('node samples\\typescript\\table-gen.js --create --populate=30000 --columns=40');
    console.log('node samples\\typescript\\table-gen.js --schema=dbo --table=test_table --create --populate=30000 --columns=40');
}
else {
    let g = new TableGenerator();
    g.run().then(() => {
        let s = g.defSql;
        console.log(s);
    }).catch(e => {
        console.log(e);
    });
}
//# sourceMappingURL=table-gen.js.map