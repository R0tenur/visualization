import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AddRelation, addRelationKey } from '../../models/add-relation.model';
import { builderKey } from '../../models/builder.model';
import { Column } from '../../models/column.model';
import { Table } from '../../models/table-svg.model';
import { BuilderService } from '../../services/builder.service';
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
    @Inject(StateInjector(builderKey)) private readonly tableState: State<Table[]>,
    private readonly builderService: BuilderService,
    private readonly formBuilder: FormBuilder) {
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
    await this.builderService.addRelation(from, to);
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
