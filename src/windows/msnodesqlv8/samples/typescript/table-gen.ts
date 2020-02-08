import {BulkTableMgr, Connection, TableColumn} from "../../lib";

const sql: SqlClient = require('msnodesqlv8');
let argv = require('minimist')(process.argv.slice(2));
let supp = require('./demo-support');
let ASQ = require('asynquence-contrib');

import {MsNodeSqlWrapperModule} from "../../lib/MsNodeSqWrapperModule";
import SqlWrapper = MsNodeSqlWrapperModule.Sql;
import CommandResponse = MsNodeSqlWrapperModule.SqlCommandResponse;

interface LooseObject {
    [key: string]: any
}

import {
    SqlClient
} from 'msnodesqlv8';

enum ColumnType {
    bit = 0,
    date = 1,
    string = 2,
    binary = 3,
    decimal =4,
    int = 5
}


class TableGenerator {

    public dropSql: string = '';
    public defSql: string = '';
    conn_str: string = "";
    sqlWrapper:SqlWrapper;
    public qualifiedName:string;

    private init() : Promise<SqlWrapper>
    {
        return new Promise((resolve, reject) => {
            if (this.sqlWrapper != null) resolve(this.sqlWrapper);
            supp.GlobalConn.init(sql, (co: any) => {
                if (co == null) reject('no db.');
                this.conn_str = co.conn_str;
                this.sqlWrapper = new MsNodeSqlWrapperModule.Sql(this.conn_str);
                resolve(this.sqlWrapper);
            });
        })
    }

    public open(connString:string) : Promise<Connection>
    {
        return new Promise<Connection>((resolve,reject)=> {
            sql.open(connString, (err, conn) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(conn);
                }
            })
        })
    }

    public bind(conn:Connection) : Promise<BulkTableMgr>
    {
        return new Promise<BulkTableMgr>((resolve, reject)=> {
            let tm = conn.tableMgr();
            let table = this.qualifiedName;
            tm.bind(table, (t :BulkTableMgr) => {
                if (t != null) {
                    resolve(t);
                }else {
                    reject(`cannot resolve ${table}`)
                }
            })
        })
    }

    private static makeString(maxLength:number): string {
        let text = "";
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < TableGenerator.getRandomInt(1, maxLength); i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    private static getColumn(column:TableColumn) : any
    {
        switch (column.type) {
            case 'bit':
                return TableGenerator.getRandomInt(0, 1);

            case 'int':
                return TableGenerator.getRandomInt(0, 10000);

            case 'nvarchar':
                return TableGenerator.makeString(column.max_length / 2);

            case 'date':
                return new Date(TableGenerator.getRandomInt(1970, 2100), TableGenerator.getRandomInt(0, 11), TableGenerator.getRandomInt(1, 28))

            case 'decimal':
                return TableGenerator.getRandomInt(0, 10000);

            case 'varbinary':
                return Buffer.from(TableGenerator.makeString(column.max_length / 2));
        }
    }

    private single(i:number, schema: TableColumn[]) : Object {
        let obj: LooseObject = {};
        schema.map(col => {
            obj[col.name] = TableGenerator.getColumn(col)
        });
        obj['ID'] = i;
        return obj;
    }

    public rows(schema: TableColumn[], n:Number) : any[] {
        let v:any[] = [];
        for (let i = 0; i < n; ++i) {
            v[v.length] = this.single(i + 1, schema);
        }
        return v;
    }

    public insert(tm: BulkTableMgr, vec:any[]) : Promise<any> {
        return new Promise<any>((resolve, reject) => {
            tm.insertRows(vec, (err) => {
                if (err) {
                    reject(err);
                }else {
                    resolve();
                }
            })
        })
    }

    public populate(rows:number) : Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let inst = this;
            let vec:any[] = [];
            ASQ().runner(function*() {
                let conn: Connection = yield inst.open(inst.conn_str);
                let t:BulkTableMgr = yield inst.bind(conn);
                let summary = t.getSummary();
                let schema :TableColumn[] = summary.columns;
                vec = inst.rows(schema, rows);
                yield inst.insert(t, vec);
                console.log('finished.');
            }).or((e: any) => {
                console.log(e.message);
                reject(vec);
            });
        })
    }

    public create() : Promise<any>
    {
        return new Promise<any>((resolve, reject) => {
            let inst = this;
            ASQ().runner(function*() {
                let wrapper:SqlWrapper = yield inst.init();
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
            }).or((e: CommandResponse) => {
                reject(e);
            });
        })
    }

    public run() : Promise<any> {
        return new Promise<any>((reject, resolve) => {
            let inst = this;
            let create: boolean = argv.create || false;
            let rows: number = argv.populate || 0;
            ASQ().runner(function*() {
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
            }).or((e: CommandResponse) => {
                reject(e);
            });
        })
    }

    static colOfType(type: string, notNull: boolean) {
        notNull = notNull || true;
        let postFix = notNull ? ' NOT NULL' : '';
        return `${type}${postFix}`;
    }

    static nvarchar(width: number, notNull: boolean) {
        return TableGenerator.colOfType(`nvarchar(${width})`,notNull);
    }

    static varbinary(width: number, notNull: boolean) {
        return TableGenerator.colOfType(`varbinary(${width})`,notNull);
    }

    static nchar(width: number, notNull: boolean) {
        return TableGenerator.colOfType(`nchar(${width})`,notNull);
    }

    static decimal(width: number, precision:number, notNull: boolean) {
        return TableGenerator.colOfType(`decimal(${width}, ${precision})`,notNull);
    }

    static date(notNull: boolean) {
        return TableGenerator.colOfType('date',notNull);
    }

    static int(notNull: boolean) {
        return TableGenerator.colOfType('int',notNull);
    }

    static bit(notNull: boolean) {
        return TableGenerator.colOfType('bit',notNull);
    }

    static smallint(notNull: boolean) {
        return TableGenerator.colOfType('smallint',notNull);
    }

    static fromColumnType(index:number, colType: ColumnType ): string {
        let c:string = null;
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
                c = `col_bin_${index} ${TableGenerator.varbinary(100,true)}`;
                break;

            case ColumnType.int:
                c = `col_int_${index} ${TableGenerator.int(true)}`;
                break;
        }
        return c;
    }

    public static getRandomInt(min:number, max:number) :number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static roundRobinCol(index:number ): string {
        return TableGenerator.fromColumnType(index, index % 6)
    }

    static randomCol(index:number ): string {
        return TableGenerator.fromColumnType(index, TableGenerator.getRandomInt(0, 5))
    }

    public generate(argv: any): void {

        let columns: number = argv.columns || 10;
        let schema: string = argv.schema || 'dbo';
        let table: string = argv.table || 'test_table';
        let random: boolean = argv.random || false;
        this.qualifiedName = `${schema}.${table}`;

        this.dropSql = `
IF OBJECT_ID('${this.qualifiedName}', 'U') IS NOT NULL
    DROP TABLE ${this.qualifiedName}
`;
        let cols:string[] = [];
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

let help:boolean = argv.h || argv.help || false;
if (help) {
    console.log('create a test definition and / or populate with n rows of random data');
    console.log('node samples\\typescript\\table-gen.js --create --populate=30000 --columns=40');
    console.log('node samples\\typescript\\table-gen.js --schema=dbo --table=test_table --create --populate=30000 --columns=40');
}else {
    let g = new TableGenerator();
    g.run().then(() => {
        let s = g.defSql;
        console.log(s);
    }).catch(e => {
        console.log(e)
    });
}

