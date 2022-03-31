import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { AddRelation, addRelationKey } from '../../models/add-relation.model';
import { builderKey } from '../../models/builder.model';
import { Column } from '../../models/column.model';
import { Relation, relationStateKey } from '../../models/relation.model';
import { Table } from '../../models/table-svg.model';
import { StateInjector } from '../../services/state.token';
import constants from '../../settings/constants';
import { State } from '../../state/state';

@Component({
  selector: 'app-relation',
  templateUrl: './relation.component.html',
  styleUrls: ['./relation.component.scss']
})
export class RelationComponent {
  public constants = constants;
  @ViewChild('searchInput') public searchInput!: ElementRef;
  public readonly searchControl: FormControl;
  public readonly searchResults$: Observable<Table[]>;

  public selectedTable: Table | undefined;
  constructor(
    @Inject(StateInjector(addRelationKey)) public readonly state: State<AddRelation>,
    @Inject(StateInjector(builderKey)) public readonly tableState: State<Table[]>,
    @Inject(StateInjector(relationStateKey)) public readonly relationState: State<Relation[]>,
    private formBuilder: FormBuilder) {
    this.searchControl = this.formBuilder.control('');
    this.searchResults$ = this.searchControl.valueChanges
      .pipe(
        switchMap((searchString: string) => this.tableState.select$.pipe(
          map(x => x.filter(y => y.name.toLowerCase().includes(searchString.toLowerCase()))),
        )));
  }
  public selectTable(table: Table): void {
    this.selectedTable = table;
  }
  public async selectColumn(from: Column, to: Column): Promise<void> {
    const relations = await this.relationState.select$.pipe(take(1)).toPromise();
    const tables = await this.tableState.select$.pipe(take(1)).toPromise();

    const fromTable = tables.find(x => x.name === from.table.name && x.schema === from.table.schema);
    const toTable = tables.find(x => x.name === to.table.name && x.schema === to.table.schema);
    const relation = new Relation(from, to);
    fromTable?.fromRelations.push(relation);
    toTable?.toRelations.push(relation);
    this.relationState.set([...relations ?? [], relation]);
    this.tableState.set([...tables]);
    this.state.clear();
    this.selectedTable = undefined;
  }

  public focusInput(): string {
    this.delay(0).then(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    });

    return '';
  }
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
