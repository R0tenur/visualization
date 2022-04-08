import { Component, ElementRef, HostListener, Inject, Input, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Table } from '../../models/table-svg.model';
import { Relation, relationStateKey } from '../../models/relation.model';
import { ContextMenuService } from '../../services/context-menu.service';
import { Column } from '../../models/column.model';
import { BuilderService } from '../../services/builder.service';
import { WINDOW } from '../../services/window.token';
import constants from '../../settings/constants';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';
import { Highlighted, highlightedKey } from '../../models/highlighted.model';

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.svg'
})
export class ChartComponent {
  public readonly constants = constants;

  @ViewChild('svg')
  svg!: ElementRef<SVGElement>;
  @Input()
  public tables: Table[] = [];

  public get viewBoxString$(): Observable<string> {
    return this.viewBox.pipe(map(x => `${x.x / this.scale} ${x.y / this.scale} ${x.w / this.scale} ${x.h / this.scale}`));

  }

  private viewBox: BehaviorSubject<any> = new BehaviorSubject(undefined);
  public svgSize: any = { w: 0, h: 0 };
  public scale = 0.8;

  private dragging: Table | undefined;
  private dragDeltaX = 0;
  private dragDeltaY = 0;

  constructor(
    @Inject(WINDOW) private readonly window: Window,
    @Inject(StateInjector(relationStateKey)) public readonly relationState: State<Relation[]>,
    private readonly builderService: BuilderService,
    private readonly contextMenuService: ContextMenuService,
    @Inject(StateInjector(highlightedKey)) public readonly highlightedState: State<Highlighted>) {
    this.svgSize = { w: this.window.innerWidth, h: this.window.innerHeight };
    this.viewBox.next({ x: 0, y: 0, ...this.svgSize });
    this.scale = 0.8;
  }

  public contextMenu(e: MouseEvent, table?: Table, column?: Column): boolean {
    if (column) {
      return this.contextMenuService.column(e.clientX, e.clientY, column);
    }
    if (table) {
      return this.contextMenuService.table(e.clientX, e.clientY, table);
    }
    return this.contextMenuService.none(e.clientX, e.clientY);

  }
  public dragStart(e: MouseEvent, table: Table): void {
    this.dragging = table;
    this.dragDeltaX = e.x - table.x;
    this.dragDeltaY = e.y - table.y;

  }
  public drag(e: MouseEvent): void {
    if (this.dragging) {
      const deltaX = e.x - this.dragDeltaX;
      const deltaY = e.y - this.dragDeltaY;

      this.dragging.x = deltaX;
      this.dragging.y = deltaY;
    }
  }
  public dragEnd(_: MouseEvent): void {
    if (this.dragging) {
      this.builderService.setTables(this.tables);
      this.dragging = undefined;
      this.dragDeltaX = 0;
      this.dragDeltaY = 0;
    }
  }
  @HostListener('body:wheel', ['$event'])
  public refreshZoom(e: WheelEvent): void {

    this.scale += (-e.deltaY / 100);

    if (this.scale < 0.1) {
      this.scale = 0.1;
    }

    if (this.scale > 4) {
      this.scale = 4;
    }
    this.viewBox.next(this.viewBox.value);
  }
  public highlight(highight: Highlighted): void {
    this.highlightedState.set(highight);
  }
  public unHiglight(): void {
    this.highlightedState.clear();
  }
}


export interface DatabaseTable {
  Name: string;
  Schema: string;
  Columns: DatabaseColumn[];
}

export interface DatabaseColumn {
  Name: string;
  ReferenceColumn: string;
  ReferenceTable: string;
  ForeignKey: string;
}


