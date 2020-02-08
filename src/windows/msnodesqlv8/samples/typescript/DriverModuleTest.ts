/**
 * Created by admin on 19/01/2017.
 */
import {Meta, SqlClient} from 'msnodesqlv8';
import SqlConnection = MsNodeSqlWrapperModule.SqlConnection;
const sql: SqlClient = require('msnodesqlv8');
import CommandResponse = MsNodeSqlWrapperModule.SqlCommandResponse;
import {MsNodeSqlWrapperModule} from "../../lib/MsNodeSqWrapperModule";
import SqlWrapper = MsNodeSqlWrapperModule.Sql;

let assert = require('assert');
let supp = require('./demo-support');
let ASQ = require('asynquence-contrib');

class eventHits {
    public onMeta: number = 0;
    public onColumn: number = 0;
    public onRowCount: number = 0;
    public onRow: number = 0;
    public onDone: number = 0;
    public onClosed: number = 0;
    public onSubmitted: number = 0;
    public onError: number = 0;
}

class StoredProcedureDef {
    constructor(public name: string, public def: string) {
    }
}

class WrapperTest {

    conn_str: string = "";
    support: any;
    procedureHelper: any;
    helper: any;
    parsedJSON: any;
    sqlWrapper:SqlWrapper;

    getIntIntProcedure = new StoredProcedureDef(
        'test_sp_get_int_int',
        "alter PROCEDURE <name>" +
        `(
    @num1 INT,
    @num2 INT,
    @num3 INT OUTPUT
    )
    AS
    BEGIN
       SET @num3 = @num1 + @num2
       RETURN 99;
    END`);

    bigIntProcedure = new StoredProcedureDef(
        'bigint_test',
        "alter PROCEDURE <name>" +
        `(
            @a bigint = 0,
            @b bigint = 0 output
         )
        AS
        BEGIN
            set @b = @a
            select @b as b
        END`);

    raiseErrorProcedure = new StoredProcedureDef(
        'test_error',
        "alter PROCEDURE <name>" +
        `
            as 
            begin
	            RAISERROR ('error', 16, 1);
            end
`);

    constructor(public debug: boolean) {
    }

    expectedPrepared: any = [
        {
            "len": 4
        }
    ];

    testPrepare: string = `select len(convert(varchar, ?)) as len`;
    testSelect: string = `select 1+1 as v, convert(DATETIME, '2017-02-06') as d`;
    expectedRows: any = [
        {
            "v": 2,
            "d": new Date(Date.parse("Feb 06, 2017"))
        }
    ];
    expectedMeta = [
        {
            "size": 10,
            "name": "v",
            "nullable": true,
            "type": "number",
            "sqlType": "int"

        },
        {
            "size": 23,
            "name": "d",
            "nullable": true,
            "type": "date",
            "sqlType": "datetime"
        }
    ];

    private exec(done: Function): void {
        let inst = this;
        ASQ().runner(function*() {
            yield inst.storedProcedureStress.apply(inst, [inst.raiseErrorProcedure, []]);
            console.log(`storedProcedure ${inst.raiseErrorProcedure.name} completes. next....`);
            yield inst.storedProcedure.apply(inst, [inst.bigIntProcedure, [1234567890], [0, 1234567890]]);
            console.log(`storedProcedure ${inst.bigIntProcedure.name} completes. next....`);
            yield inst.storedProcedure.apply(inst, [inst.getIntIntProcedure, [1, 2], [99, 3]]);
            console.log(`storedProcedure ${inst.getIntIntProcedure.name} completes. next....`);
            yield inst.execute.apply(inst);
            console.log('execute completes next....');
            yield inst.prepare.apply(inst);
            console.log('prepare completes next....');
            yield inst.eventSubscribe.apply(inst);
            console.log('eventSubscribe completes next....');
        }).val(() => {
            done();
        }).or((e: any) => {
            console.log(e);
        });
    }

    public run(done: Function) {
        supp.GlobalConn.init(sql, (co: any) => {
                this.conn_str = co.conn_str;
                this.sqlWrapper = new MsNodeSqlWrapperModule.Sql(this.conn_str);
                this.support = co.support;
                this.procedureHelper = new this.support.ProcedureHelper(this.conn_str);
                this.procedureHelper.setVerbose(false);
                this.helper = co.helper;
                this.parsedJSON = this.helper.getJSON();
                if (this.debug) console.log(this.conn_str);
                this.exec(done);
            }
        );
    }

    private createProcedureDef(procedureDef: StoredProcedureDef): Promise<any> {
        return new Promise((resolve, reject) => {
            this.procedureHelper.createProcedure(procedureDef.name, procedureDef.def, function (e: any) {
                if (e) reject(e);
                else resolve()
            });
        });
    }

    private storedProcedureStress(procedureDef: StoredProcedureDef, params: any): Promise<any> {
        let inst = this;
        return new Promise((resolve, reject) => {
            ASQ().runner(function*() {
                let connection = yield inst.sqlWrapper.open();
                let array: any = [];

                yield inst.createProcedureDef(procedureDef);
                let count = 100;
                for (let i = 0; i < count; i++) {
                    array.push(i);
                }

                let raised = 0;
                let promises = array.map(() => {
                    let command = connection.getCommand().procedure(procedureDef.name).params(params);
                    // test should raise an error, or just don't exist at all
                    return command.execute().catch((err: any) => {
                        console.log(`[${raised}] ${JSON.stringify(err, null, 2)}`);
                        ++raised;
                    });
                });
                yield Promise.all(promises);
            }).val(() => {
                resolve();
            }).or((e: any) => {
                reject(e);
            });
        });
    }

    private storedProcedure(procedureDef: StoredProcedureDef, params: any, expected: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            let inst = this;
            ASQ().runner(function*() {
                let connection = yield inst.sqlWrapper.open();
                yield inst.createProcedureDef.apply(inst, [procedureDef]);
                let res = yield connection.getCommand().procedure(procedureDef.name).params(params).execute();
                assert.deepEqual(res.outputParams, expected, "results didn't match");
                yield connection.close();
                resolve();
            }).or((e: any) => {
                reject(e);
            });
        });
    }

    private prepare(): Promise<any> {
        let inst = this;
        return new Promise((resolve, reject) => {
            ASQ().runner(function *() {
                let connection = yield inst.sqlWrapper.open();
                let command = connection.getCommand().sql(inst.testPrepare);
                command = yield command.prepare();
                let res = yield command.params([1000]).execute();
                assert.deepEqual(res.asObjects, inst.expectedPrepared, "results didn't match");
                yield command.freePrepared();
                yield connection.close();
                resolve();
            }).or((e: any) => {
                    reject(e);
                }
            )
        })
    }

    private execute(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sqlWrapper.execute(this.testSelect).then(res => {
                assert.deepEqual(res.asObjects, this.expectedRows, "results didn't match");
                resolve();
            }).catch(e => reject(e));
        });
    }

    private eventSubscribe(): Promise<any> {
        return new Promise((resolve, reject) => {
            let inst = this;

            function runTest(c: SqlConnection) {
                let command = c.getCommand();
                command.sql(inst.testSelect);
                let h = new eventHits();

                command.onMeta((meta: Meta) => {
                    if (inst.debug) console.log(`onMeta: ${JSON.stringify(meta, null, 2)}`);
                    h.onMeta++;
                    assert.deepEqual(inst.expectedMeta, meta, "results didn't match");
                }).onColumn((colIndex: number, data:any, more:boolean) => {
                    if (inst.debug) console.log(`onColumn: more = ${more} data = ${JSON.stringify(data, null, 2)}`);
                    h.onColumn++;
                }).onRowCount((count: number) => {
                    if (inst.debug) console.log(`onRowCount: ${count}`);
                    h.onRowCount++;
                })
                .onRow((r: number) => {
                    if (inst.debug) console.log(`onRow: row = ${JSON.stringify(r, null, 2)}`);
                    h.onRow++;
                }).onDone(() => {
                    if (inst.debug) console.log(`onDone:`);
                    h.onDone++;
                }).onSubmitted((s:any) => {
                    if (inst.debug) console.log(`onSubmitted: ${JSON.stringify(s)}`);
                    h.onSubmitted++;
                }).onClosed(() => {
                    if (inst.debug) console.log(`onClose:`);
                    h.onClosed++;
                }).onError((e: any) => {
                    if (inst.debug) console.log(`onError: e = ${JSON.stringify(e, null, 2)}`);
                    h.onError++;
                }).execute().then((res: CommandResponse) => {
                    if (inst.debug) console.log('==============================');
                    if (inst.debug) console.log(JSON.stringify(res, null, 2));
                    assert.deepEqual(res.asObjects, inst.expectedRows, "results didn't match");
                    resolve();
                }).catch((e: CommandResponse) => {
                    h.onError++;
                    if (inst.debug) console.log(JSON.stringify(e, null, 2));
                    reject(e);
                });
            }

            this.sqlWrapper.open()
                .then((c : SqlConnection) => runTest(c)).catch(e => {
                console.log(e);
                reject(e);
            });
        });
    }
}

let wt = new WrapperTest(true);
wt.run(() => {
    console.log('done.');
});
