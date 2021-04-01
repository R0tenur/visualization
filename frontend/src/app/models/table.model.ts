export interface Database {
  name: string;
  tables: Table[];
}

export interface Table {
  name: string;
  columns: Column[];
  position?: TableCoordinates;
}
export interface Column {
  name: string;
  dataType: string;
  key?: boolean;
  reference?: any;
  position?: TableCoordinates;
}
export interface Reference {
  table: string;
  column: string;
}

export interface TableCoordinates {
  x: number;
  y: number;
}

export interface Relation {
  via: TableCoordinates[];
  from: TableCoordinates;
  to: TableCoordinates;
}
