
import { Column } from './column.model';
import { Position } from './position.model';
import { Table } from './table-svg.model';

export const renameKey = 'renameModel';
export interface Rename {
  position: Position;
  table?: Table;
  column?: Column;
}
