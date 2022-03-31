import constants from '../settings/constants';
import { SvgPosition } from './svg-position.model';
import { Table } from './table-svg.model';

export class Column implements SvgPosition {
  public readonly width = constants.tableWidth;
  public readonly height = constants.columnHeight;
  public get xBox(): number {
    return this.table.x;
  }
  public get xText(): number {
    return this.table.x + constants.padding;
  }
  public get yBox(): number {
    return this.table.y + this.table.titleHeight + (this.height * (this.index));
  }
  public get yText(): number {
    return this.table.y + this.table.titleHeight + (this.height * (this.index) + constants.padding);
  }
  constructor(
    public readonly index: number,
    public readonly table: Table,
    public name: string) { }
}
