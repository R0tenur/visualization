import { Inject, Injectable } from '@angular/core';
import { take } from 'rxjs/operators';
import { builderKey } from '../models/builder.model';
import { Column } from '../models/column.model';
import { Table } from '../models/table-svg.model';
import { State } from '../state/state';
import { StateInjector } from './state.token';

@Injectable({
  providedIn: 'root'
})
export class BuilderService {

  constructor(@Inject(StateInjector(builderKey)) public readonly state: State<Table[]>) {
    this.state.set([]);
  }
  public setTables(tables: Table[]): void {
    this.state.set([...tables]);
  }
  public async addTable(table: Table): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      this.state.set([...tables, table]);
    }
  }

  public async renameTable(table: Table, newName: string): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      const tableIndex = tables.findIndex(t => t.name === table.name && t.schema === table.schema);
      tables[tableIndex].name = newName;
      this.state.set(tables);
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

      this.state.set(tables);
    }
  }

  public async renameColumn(table: Table, column: Column, newName: string): Promise<void> {
    const tables = await this.getTables();
    if (tables) {
      const tableRef = tables.find(t => t.name === table.name && t.schema === table.schema);
      if (!tableRef) { return; }

      tableRef.columns[column.index].name = newName;

      this.state.set(tables);
    }
  }
  private async getTables(): Promise<Table[]> {
    const tables = await this.state.select$.pipe(take(1)).toPromise();

    return [...tables];
  }
}
