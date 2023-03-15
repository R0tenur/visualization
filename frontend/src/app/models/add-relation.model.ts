import { Column } from './column.model';
import { Position } from './position.model';
export const addRelationKey = 'columnRelationKey';

export interface AddRelation {
  column: Column;
  position: Position;
}
