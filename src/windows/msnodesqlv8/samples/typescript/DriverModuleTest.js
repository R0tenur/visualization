"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sql = require('msnodesqlv8');
const MsNodeSqWrapperModule_1 = require("../../lib/MsNodeSqWrapperModule");
let assert = require('assert');
let supp = require('./demo-support');
let ASQ = require('asynquence-contrib');
class eventHits {
    constructor() {
        this.onMeta = 0;
        this.onColumn = 0;
        this.onRowCount = 0;
        this.onRow = 0;
        this.onDone = 0;
        this.onClosed = 0;
        this.onSubmitted = 0;
        this.onError = 0;
    }
}
class StoredProcedureDef {
    constructor(name, def) {
        this.name = name;
        this.def = def;
    }
}
class WrapperTest {
    constructor(debug) {
        this.debug = debug;
        this.conn_str = "";
        this.getIntIntProcedure = new StoredProcedureDef('test_sp_get_int_int', "alter PROCEDURE <name>" +
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
        this.bigIntProcedure = new StoredProcedureDef('bigint_test', "alter PROCEDURE <name>" +
            `(
            @a bigint = 0,
            @b bigint = 0 output
         )
        AS
        BEGIN
            set @b = @a
            select @b as b
        END`);
        this.raiseErrorProcedure = new StoredProcedureDef('test_error', "alter PROCEDURE <name>" +
            `
            as 
            begin
	            RAISERROR ('error', 16, 1);
            end
`);
        this.expectedPrepared = [
            {
                "len": 4
            }
        ];
        this.testPrepare = `select len(convert(varchar, ?)) as len`;
        this.testSelect = `select 1+1 as v, convert(DATETIME, '2017-02-06') as d`;
        this.expectedRows = [
            {
                "v": 2,
                "d": new Date(Date.parse("Feb 06, 2017"))
            }
        ];
        this.expectedMeta = [
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
    }
    exec(done) {
        let inst = this;
        ASQ().runner(function* () {
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
        }).or((e) => {
            console.log(e);
        });
    }
    run(done) {
        supp.GlobalConn.init(sql, (co) => {
            this.conn_str = co.conn_str;
            this.sqlWrapper = new MsNodeSqWrapperModule_1.MsNodeSqlWrapperModule.Sql(this.conn_str);
            this.support = co.support;
            this.procedureHelper = new this.support.ProcedureHelper(this.conn_str);
            this.procedureHelper.setVerbose(false);
            this.helper = co.helper;
            this.parsedJSON = this.helper.getJSON();
            if (this.debug)
                console.log(this.conn_str);
            this.exec(done);
        });
    }
    createProcedureDef(procedureDef) {
        return new Promise((resolve, reject) => {
            this.procedureHelper.createProcedure(procedureDef.name, procedureDef.def, function (e) {
                if (e)
                    reject(e);
                else
                    resolve();
            });
        });
    }
    storedProcedureStress(procedureDef, params) {
        let inst = this;
        return new Promise((resolve, reject) => {
            ASQ().runner(function* () {
                let connection = yield inst.sqlWrapper.open();
                let array = [];
                yield inst.createProcedureDef(procedureDef);
                let count = 100;
                for (let i = 0; i < count; i++) {
                    array.push(i);
                }
                let raised = 0;
                let promises = array.map(() => {
                    let command = connection.getCommand().procedure(procedureDef.name).params(params);
                    return command.execute().catch((err) => {
                        console.log(`[${raised}] ${JSON.stringify(err, null, 2)}`);
                        ++raised;
                    });
                });
                yield Promise.all(promises);
            }).val(() => {
                resolve();
            }).or((e) => {
                reject(e);
            });
        });
    }
    storedProcedure(procedureDef, params, expected) {
        return new Promise((resolve, reject) => {
            let inst = this;
            ASQ().runner(function* () {
                let connection = yield inst.sqlWrapper.open();
                yield inst.createProcedureDef.apply(inst, [procedureDef]);
                let res = yield connection.getCommand().procedure(procedureDef.name).params(params).execute();
                assert.deepEqual(res.outputParams, expected, "results didn't match");
                yield connection.close();
                resolve();
            }).or((e) => {
                reject(e);
            });
        });
    }
    prepare() {
        let inst = this;
        return new Promise((resolve, reject) => {
            ASQ().runner(function* () {
                let connection = yield inst.sqlWrapper.open();
                let command = connection.getCommand().sql(inst.testPrepare);
                command = yield command.prepare();
                let res = yield command.params([1000]).execute();
                assert.deepEqual(res.asObjects, inst.expectedPrepared, "results didn't match");
                yield command.freePrepared();
                yield connection.close();
                resolve();
            }).or((e) => {
                reject(e);
            });
        });
    }
    execute() {
        return new Promise((resolve, reject) => {
            this.sqlWrapper.execute(this.testSelect).then(res => {
                assert.deepEqual(res.asObjects, this.expectedRows, "results didn't match");
                resolve();
            }).catch(e => reject(e));
        });
    }
    eventSubscribe() {
        return new Promise((resolve, reject) => {
            let inst = this;
            function runTest(c) {
                let command = c.getCommand();
                command.sql(inst.testSelect);
                let h = new eventHits();
                command.onMeta((meta) => {
                    if (inst.debug)
                        console.log(`onMeta: ${JSON.stringify(meta, null, 2)}`);
                    h.onMeta++;
                    assert.deepEqual(inst.expectedMeta, meta, "results didn't match");
                }).onColumn((colIndex, data, more) => {
                    if (inst.debug)
                        console.log(`onColumn: more = ${more} data = ${JSON.stringify(data, null, 2)}`);
                    h.onColumn++;
                }).onRowCount((count) => {
                    if (inst.debug)
                        console.log(`onRowCount: ${count}`);
                    h.onRowCount++;
                })
                    .onRow((r) => {
                    if (inst.debug)
                        console.log(`onRow: row = ${JSON.stringify(r, null, 2)}`);
                    h.onRow++;
                }).onDone(() => {
                    if (inst.debug)
                        console.log(`onDone:`);
                    h.onDone++;
                }).onSubmitted((s) => {
                    if (inst.debug)
                        console.log(`onSubmitted: ${JSON.stringify(s)}`);
                    h.onSubmitted++;
                }).onClosed(() => {
                    if (inst.debug)
                        console.log(`onClose:`);
                    h.onClosed++;
                }).onError((e) => {
                    if (inst.debug)
                        console.log(`onError: e = ${JSON.stringify(e, null, 2)}`);
                    h.onError++;
                }).execute().then((res) => {
                    if (inst.debug)
                        console.log('==============================');
                    if (inst.debug)
                        console.log(JSON.stringify(res, null, 2));
                    assert.deepEqual(res.asObjects, inst.expectedRows, "results didn't match");
                    resolve();
                }).catch((e) => {
                    h.onError++;
                    if (inst.debug)
                        console.log(JSON.stringify(e, null, 2));
                    reject(e);
                });
            }
            this.sqlWrapper.open()
                .then((c) => runTest(c)).catch(e => {
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
//# sourceMappingURL=DriverModuleTest.js.map