import constants from '../settings/constants';
import { Column } from './column.model';
import { Relation } from './relation.model';

export class Table {
  public get x(): number {
    return this.xPosition ?? 0;
  }
  public set x(value: number) {
    this.xPosition = value;
  }
  public get xText(): number {
    return this.x + constants.padding;
  }
  public get y(): number {
    return this.yPosition ?? 0;
  }
  public set y(value: number) {
    this.yPosition = value;
  }
  public get yText(): number {
    return this.y + constants.padding;
  }
  public get yBox(): number {
    return this.y;
  }
  public get height(): number {
    return this.titleHeight + this.columns.length * constants.columnHeight + (this.columns.length ? constants.columnHeight * .5 : 0);
  }
  public get bottomPosition(): number {
    return this.y + this.height;
  }
  public get rightXPosition(): number {
    return this.x + this.width;
  }
  public get hasPosition(): boolean {
    return this.xPosition !== undefined && this.yPosition !== undefined;
  }

  public readonly fromRelations: Relation[] = [];
  public readonly toRelations: Relation[] = [];
  public readonly columns: Column[] = [];
  public readonly width = constants.tableWidth;
  public readonly titleHeight = constants.titleHeight;

  private xPosition: number | undefined;
  private yPosition: number | undefined;
  constructor(
    public name: string,
    public readonly schema: string) {
  }
  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}

