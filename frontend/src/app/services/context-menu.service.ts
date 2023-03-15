import { Inject, Injectable } from '@angular/core';
import { AddRelation, addRelationKey } from '../models/add-relation.model';
import { Column } from '../models/column.model';
import { ContextMenu, ContextMenuItem, contextMenuStateKey } from '../models/context-menu.model';
import { Position } from '../models/position.model';
import { Rename, renameKey } from '../models/rename.model';
import { Table } from '../models/table-svg.model';
import { BuilderService } from '../services/builder.service';

import { State } from '../state/state';
import { StateInjector } from './state.token';

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {
  private tableIndex = 0;
  private colunmnIndex = 0;
  constructor(
    @Inject(StateInjector(contextMenuStateKey)) public readonly contextMenuState: State<ContextMenu>,
    @Inject(StateInjector(renameKey)) public readonly renameState: State<Rename>,
    public readonly builderState: BuilderService,
    @Inject(StateInjector(addRelationKey)) public readonly columnRelationState: State<AddRelation>,
  ) { }

  public table(x: number, y: number, table: Table): boolean {
    const menu = this.baseMenu(x, y);

    menu.items.push(this.addColumnItem(table));
    menu.items.push(this.addTableItem());
    menu.items.push(this.addRenameTableItem({ x, y }, table));

    this.contextMenuState.set(menu);
    return false;
  }
  public column(x: number, y: number, column: Column): boolean {
    const menu = this.baseMenu(x, y);

    menu.items.push(this.addColumnItem(column.table));
    menu.items.push({
      label: 'Add relation', shortcut: '⌘ +', event: (() => this.columnRelationState.set({
        position: {
          x,
          y,
        },
        column
      })).bind(this)
    });
    menu.items.push(this.addTableItem());
    menu.items.push(this.addRenameColumnItem({ x, y }, column.table, column));
    menu.items.push(this.addRenameTableItem({ x, y }, column.table));
    this.contextMenuState.set(menu);
    return false;
  }

  public none(x: number, y: number): boolean {
    const menu = this.baseMenu(x, y);

    menu.items.push(this.addTableItem());
    this.contextMenuState.set(menu);

    return false;
  }
  public clear(): void {
    this.contextMenuState.clear();
  }
  private addTableItem(): ContextMenuItem {
    return {
      label: 'Add table',
      event: (() => this.builderState.addTable(
        new Table('untitled' + this.tableIndex++, 'dbo'))).bind(this)
    };
  }
  private addColumnItem(table: Table): ContextMenuItem {
    return {
      label: 'Add column',
      event: (() => this.builderState.addColumn(table, 'untitled' + this.colunmnIndex++)).bind(this)
    };
  }

  private addRenameTableItem(position: Position, table: Table): ContextMenuItem {
    return {
      label: 'Rename table',
      event: (() => this.renameState.set({ position, table, column: undefined })).bind(this)
    };
  }
  private addRenameColumnItem(position: Position, table: Table, column: Column): ContextMenuItem {
    return {
      label: 'Rename column',
      event: (() => this.renameState.set({ position, table, column })).bind(this)
    };
  }
  private baseMenu(x: number, y: number): ContextMenu {
    return {
      position: {
        x,
        y,
      },
      items: []
    };
  }
}
