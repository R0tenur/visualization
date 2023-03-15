import { Table } from './table-svg.model';
import { Column } from './column.model';
export const relationStateKey = 'relationStateKey';
export class Relation {
  public get tablesHasPositions(): boolean {
    return this.toTable.hasPosition && this.fromTable.hasPosition;
  }
  public get fromArrowXStart(): number {
    return this.fromToTheRight ? this.from.xBox - 14 : this.from.xBox + this.from.width + 14;
  }
  public get fromArrowXEnd(): number {
    return this.fromToTheRight ? this.from.xBox - 6 : this.from.xBox + this.from.width + 6;
  }
  public get fromArrowYUpEnd(): number {
    return this.fromToTheRight ? this.from.yBox + 5 : this.from.yBox + 15;
  }
  public get fromArrowYDownEnd(): number {
    return this.fromToTheRight ? this.from.yBox + 15 : this.from.yBox + 5;
  }

  public get toArrowXStart(): number {
    return this.fromToTheRight ? this.to.xBox + this.to.width + 2 : this.to.xBox - 2;
  }
  public get toArrowXEnd(): number {
    return this.fromToTheRight ? this.to.xBox + this.to.width + 10 : this.to.xBox - 10;
  }
  public get toArrowYUpEnd(): number {
    return this.fromToTheRight ? this.to.yBox + 15 : this.to.yBox + 5;
  }
  public get toArrowYDownEnd(): number {
    return this.fromToTheRight ? this.to.yBox + 5 : this.to.yBox + 15;
  }

  public get fromXStart(): number {
    return this.fromToTheRight ? this.from.xBox - 20 : this.from.xBox + this.from.width + 20;
  }
  public get fromXEnd(): number {
    return this.fromToTheRight ? this.from.xBox : this.from.xBox + this.from.width;
  }
  public get fromX(): number {
    return this.fromXStart;
  }
  public get fromY(): number {
    return this.from.yBox + 10;

  }
  public get toX(): number {
    return this.toXStart;
  }
  public get toXStart(): number {
    return this.fromToTheRight ? this.toXEnd + 20 : this.toXEnd - 20;
  }
  public get toXEnd(): number {
    return this.fromToTheRight ? this.to.xBox + this.to.width : this.to.xBox;
  }
  public get toY(): number {
    return this.to.yBox + 10;
  }
  public get fromTable(): Table {
    return this.from.table;
  }
  private get fromToTheRight(): boolean {
    return this.from.table.x > this.to.table.x + this.to.width / 2;
  }

  constructor(private readonly from: Column, private readonly to: Column) {
    from.table.fromRelations.push(this);
    to.table.toRelations.push(this);
  }
  public get toTable(): Table {
    return this.from.table;
  }
}
