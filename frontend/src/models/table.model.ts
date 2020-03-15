export interface ITable {
    name: string,
    columns: IColumn[],
    position?: TableCoordinates,
}
export interface IColumn {
    name: string,
    dataType: string,
    key?: boolean,
    reference?: any,
    position?: TableCoordinates,
}
export interface Reference {
    table: string,
    column:string,
}

export interface TableCoordinates {
    x: number;
    y: number;
}

export interface Relation {
    via: TableCoordinates[]
    from: TableCoordinates,
    to: TableCoordinates
}