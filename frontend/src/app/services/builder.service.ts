import { Inject, Injectable } from '@angular/core';
import { take } from 'rxjs/operators';
import { builderKey } from '../models/builder.model';
import { Column } from '../models/column.model';
import { Relation, relationStateKey } from '../models/relation.model';
import { Table } from '../models/table-svg.model';
import { State } from '../state/state';
import { StateInjector } from './state.token';

@Injectable({
  providedIn: 'root'
})
export class BuilderService {

  constructor(
    @Inject(StateInjector(builderKey)) public readonly tableState: State<Table[]>,
    @Inject(StateInjector(relationStateKey)) public readonly relationState: State<Relation[]>,) {
    this.tableState.set([]);
  }
  public setTables(tables: Table[]): void {
    this.tableState.set([...tables]);
  }
  public async addTable(table: Table): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      this.tableState.set([...tables, table]);
    }
  }

  public async renameTable(table: Table, newName: string): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      const tableIndex = tables.findIndex(t => t.name === table.name && t.schema === table.schema);
      tables[tableIndex].name = newName;
      this.tableState.set(tables);
    }
  }
  public async addColumn(table: Table, columnName: string): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      const tableRef = tables.find(t => t.name === table.name && t.schema === table.schema);
      if (!tableRef) { return; }

      const column = new Column(
        tableRef.columns.length,
        tableRef,
        columnName);

      tableRef.columns.push(column);

      this.tableState.set(tables);
    }
  }

  public async addRelation(from: Column, to: Column): Promise<void> {
    const relations = await this.relationState.select$.pipe(take(1)).toPromise();
    const tables = await this.getTables();

    const fromTable = tables.find(x => x.name === from.table.name && x.schema === from.table.schema);
    const toTable = tables.find(x => x.name === to.table.name && x.schema === to.table.schema);

    const relation = new Relation(from, to);
    fromTable?.fromRelations.push(relation);
    toTable?.toRelations.push(relation);
    this.relationState.set([...relations ?? [], relation]);
    this.tableState.set([...tables]);
  }

  public async renameColumn(table: Table, column: Column, newName: string): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      const tableRef = tables.find(t => t.name === table.name && t.schema === table.schema);
      if (!tableRef) { return; }

      tableRef.columns[column.index].name = newName;

      this.tableState.set(tables);
    }
  }
  private async getTables(): Promise<Table[]> {
    const tables = await this.tableState.select$.pipe(take(1)).toPromise();

    return [...tables];
  }
}
