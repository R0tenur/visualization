/**
 * Created by admin on 19/01/2017.
 */

export interface SqlClient {
    open(description: ConnectDescription, cb: OpenCb): void
    open(conn_str: string, cb: OpenCb): void
    query(conn_str: string, sql: string, cb?: QueryCb): Query
    query(conn_str: string, sql: string, params?: any[], cb?: QueryCb): Query
    query(conn_str: string, description: QueryDescription, cb?: QueryCb): Query
    query(conn_str: string, description: QueryDescription, params?: any[], cb?: QueryCb): Query
    queryRaw(conn_str: string, description: QueryDescription, cb: QueryRawCb): Query
    queryRaw(conn_str: string, description: QueryDescription, params?: any[], cb?: QueryRawCb): Query
    queryRaw(conn_str: string, sql: string, params?: any[], cb?: QueryRawCb): Query
    queryRaw(conn_str: string, sql: string, cb: QueryRawCb): Query
    Bit(v:number): any
    BigInt(v:number): any
    Int(v:number): any
    TinyInt(v:number): any
    SmallInt(v:number): any
    Float(v:number): any
    Numeric(v:number): any
    Money(v:number): any
    SmallMoney(v:number): any
    Decimal(v:number): any
    Double(v:number): any
    Real(v:number): any
    WVarChar(v:String) : any
    Char(v:String) : any
    VarChar(v:String) : any
    NChar(v:String) : any
    NVarChar(v:String) : any
    Text(v:String) : any
    NText(v:String) : any
    Xml(v:String) : any
    WLongVarChar(v:string) : any
    UniqueIdentifier(v:String) : any
    VarBinary(v:any) : any
    LongVarBinary(v:any) : any
    Image(v:any) : any
    Time(v:Date) : any
    Time2(v:Date) : any
    Date(v:Date) : any
    DateTime(v:Date) : any
    DateTime2(v:Date) : any
    DateRound(v:Date) : any
    SmallDateTime(v:Date) : any
    DateTimeOffset(v:Date) : any
    PollingQuery(s:string) : QueryDescription
    TimeoutQuery(s:string, to:number) : QueryDescription
    TzOffsetQuery(s:string, offsetMinutes?:number) : QueryDescription,
    TvpFromTable(table:Table) : ProcedureParam
}

export interface Table {
    name:string
    rows: any[]
    columns: TableColumn[]
    addRowsFromObjects(vec:any) : void
}

export interface TableColumnType {
    declaration:string
    length:string
}

export interface TableColumn {
    type_name: string
    column_id: number
    ordered_column: string
    column_name: string
    name: string
    data_type: string
    type_id: string
    declaration: string
    nullable: string
    max_length: number
    precision: number
    scale: 0
    collation: string
    is_output: number
    system_type_id: number
    type:string,
    is_identity: number,
    is_computed: number,
    is_hidden: number,
    generated_always_type: number,
    generated_always_desc: string
}

export interface Connection {
    getUserTypeTable(cb:TableCb):void
    id:number
    setUseUTC(utc:boolean):void
    getUseUTC():boolean
    close(cb: StatusCb): void
    query(sql: string, cb?: QueryCb): Query
    query(sql: string, params?: any[], cb?: QueryCb): Query
    query(description: QueryDescription, cb?: QueryCb): Query
    query(description: QueryDescription, params?: any[], cb?: QueryCb): Query
    queryRaw(description: QueryDescription, cb: QueryRawCb): Query
    queryRaw(description: QueryDescription, params?: any[], cb?: QueryRawCb): Query
    queryRaw(sql: string, params?: any[], cb?: QueryRawCb): Query
    queryRaw(sql: string, cb: QueryRawCb): Query
    beginTransaction(cb?: StatusCb): void
    commit(cb?: StatusCb): void
    rollback(cb?: StatusCb): void
    procedureMgr(): ProcedureManager
    tableMgr(): TableManager
    pollingMode(q: Query, v:boolean, cb?: SimpleCb): void
    cancelQuery(q: Query, cb?: StatusCb): void
    prepare(sql: string, cb: PrepareCb): void
    prepare(description: QueryDescription, cb: PrepareCb): void
    setFilterNonCriticalErrors(flag:boolean):void
}

export interface Query {
    on(name: string, cb: SubmittedEventCb): void
    on(name: string, cb: EventCb): void
    on(name: string, cb: EventColumnCb): void
    cancelQuery(qcb?: StatusCb): void
    pauseQuery(qcb?: StatusCb): void
    resumeQuery(qcb?: StatusCb): void
    isPaused(): boolean
}

export interface ConnectDescription {
    conn_str: string
    conn_timeout: number
}

export interface QueryDescription {
    query_str: string
    query_timeout?: number
    query_polling?: boolean
    query_tz_adjustment?: number
}

export interface Meta {
    name: string
    nullable: boolean
    size: number
    sqlType: string
    type: string
}

export interface Error
{
    message:string
    sqlstate: string
    code: number
}

export interface RawData {
    meta: Meta[]
    rows: Array<any[]>
}
export interface SimpleCb { (): void
}
export interface TableCb { (err: Error, table: Table): void
}
export interface BindCb { (cb: BulkTableMgr): void
}
export interface OpenCb { (err: Error, connection: Connection): void
}
export interface QueryCb { (err?: Error, rows?: any[], more?: boolean): void
}
export interface CallProcedureCb { (err?: Error, rows?: any[], outputParams?:any[]): void
}
export interface QueryRawCb { (err?: Error, raw?: RawData, more?: boolean): void
}
export interface StatusCb { (err?: Error): void
}
export interface PrepareCb { (err?: Error, statement?: PreparedStatement): void
}
export interface EventCb { (data: any): void
}
export interface SubmittedEventCb { (sql: string, params:any[]): void
}
export interface EventColumnCb { (colIndex: number, data:any, more:boolean): void
}
export interface BulkSelectCb { (err: Error, rows: any[]): void
}
export interface DescribeProcedureCb { (description?: ProcedureSummary): void
}
export interface GetProcedureCb { (procedure?: ProcedureDefinition): void
}

export interface BulkMgrSummary {
    insertSignature: string
    whereColumns: TableColumn[]
    updateColumns: TableColumn[]
    selectSignature: string
    deleteSignature: string
    updateSignature: string
    columns: TableColumn[]
    primaryColumns: TableColumn[]
    assignableColumns: TableColumn
}

export interface BulkTableMgr {
    getSummary(): BulkMgrSummary
    asUserType(name:string): string
    selectRows(cols: any[], cb: BulkSelectCb): void
    insertRows(rows: any[], cb: StatusCb): void
    deleteRows(rows: any[], cb: StatusCb): void
    updateRows(rows: any[], cb: StatusCb): void
    setBatchSize(size: number): void
    setWhereCols(cols: any[]): void
    setUpdateCols(cols: any[]): void
    getInsertSignature(): string
    getSelectSignature(): string
    getDeleteSignature(): string
    getUpdateSignature(): string
    getColumnsByName(): TableColumn[]
    getWhereColumns(): TableColumn[]
    getUpdateColumns(): TableColumn[]
    getPrimaryColumns(): TableColumn[]
    getAssignableColumns(): TableColumn[]
}

export interface TableValueParam {
    /*
type_name	column_id	ordered_column	column_name	data_type	nullable	length	precision	scale	collation
dbo.PersonTVP	1	01: vFirstName	vFirstName	varchar		255	0	0	SQL_Latin1_General_CP1_CI_AS
dbo.PersonTVP	2	02: vLastName	vLastName	varchar		255	0	0	SQL_Latin1_General_CP1_CI_AS
dbo.PersonTVP	3	03: vAddress	vAddress	varchar		255	0	0	SQL_Latin1_General_CP1_CI_AS
dbo.PersonTVP	4	04: vCity	vCity	varchar		255	0	0	SQL_Latin1_General_CP1_CI_AS
        */

    name:string
    column_id:number
    ordered_column:string
    column_name:string
    type_id:string
    data_type:string
    nullable:string
    length:number
    precision:number
    scale:number
    collation:number
}

export interface ProcedureParam {
    table_value_param?:TableValueParam[]
    is_user_defined?:boolean
    is_output: boolean
    name: string
    type_id: string
    max_length: number
    order: number
    update_signature: string
    collation: any
    val: any
}

export interface ProcedureDefinition
{
    paramsArray(params: any[]): any[]
    call(params?: any[], cb?: CallProcedureCb): Query
    setTimeout(to:number): void
    setPolling(polling: boolean) : void
    getMeta(): ProcedureSummary
    getName(): string
}

export interface ProcedureSummary {
    select:string
    signature: string
    summary: string
    params: ProcedureParam[]
}

export interface ProcedureManager {
    get(name:string, cb?:GetProcedureCb):void
    callproc(name: string, params?: any[], cb?: CallProcedureCb): Query
    describe(name: string, cb?: DescribeProcedureCb): void
    setTimeout(timeout: number): void
    setPolling(poll:boolean):void;
}

export interface TableManager {
    bind(tableName: string, cb: BindCb): void
}

export interface PreparedStatement {
    preparedQuery(params?: any[], cb ?: QueryCb): Query
    free(cb: StatusCb): void
    getSignature(): string
    getId(): number
    getMeta(): Meta[]
}

export enum QueryEvent {
    meta = 'meta',
    column = 'column',
    partial = 'partial',
    rowCount = 'rowCount',
    row = 'row',
    done = 'done',
    error = 'error',
    warning = 'warning',
    closed = 'closed',
    submitted = 'submitted',
}
