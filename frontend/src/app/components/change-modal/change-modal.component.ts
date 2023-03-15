import { Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MonoTypeOperatorFunction, Observable, Subscription } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { Column } from '../../models/column.model';
import { Rename, renameKey } from '../../models/rename.model';
import { SqlType } from '../../models/sql-type.enum';
import { Table } from '../../models/table-svg.model';
import { BuilderService } from '../../services/builder.service';
import { shortcutsDisabledKey } from '../../services/shortcut.service';
import { StateInjector } from '../../services/state.token';
import constants from '../../settings/constants';
import { State } from '../../state/state';

@Component({
  selector: 'app-change-modal',
  templateUrl: './change-modal.component.html',
  styleUrls: ['./change-modal.component.scss']
})
export class ChangeModalComponent {
  public readonly SqlType = SqlType;
  public constants = constants;
  public readonly sqlTypeKeys;
  public readonly columnChangeGroup: Observable<FormGroup>;
  public readonly tableChangeGroup: Observable<FormGroup>;
  @ViewChild('renameInput') public renameInput!: ElementRef;
  private selected = false;

  constructor(
    @Inject(StateInjector(renameKey)) public readonly state: State<Rename>,
    @Inject(StateInjector(shortcutsDisabledKey)) private readonly shortcutDisabledState: State<boolean>,
    private readonly builderService: BuilderService,
    readonly formBuilder: FormBuilder) {
    this.sqlTypeKeys = Object.keys(this.SqlType);

    this.tableChangeGroup = state.select$.pipe(
      filter(rename => !!rename),
      this.disableShortcuts(),
      map(x => new FormGroup({
        name: new FormControl(x.table?.name ?? ''),
        schema: new FormControl(x.table?.schema ?? ''),
      })));

    this.columnChangeGroup = state.select$.pipe(
      filter(rename => rename && !!rename?.column),
      this.disableShortcuts(),
      map(x => new FormGroup({
        name: new FormControl(x.column?.name ?? ''),
        type: new FormControl(x.column?.data.type ?? ''),
      })));

  }
  public setName(rename: Rename, newName: string): void {
    this.state.clear();
    this.shortcutDisabledState.set(false);
    this.selected = false;
    if (rename.table) {
      if (rename.column) {
        this.builderService.editColumn(rename.table, rename.column, newName, rename.column.data);
        return;
      }
      this.builderService.editTable(rename.table, newName);
    }
  }
  public onColumnSubmit(column: Column, form: any): void {
    console.log(form);
    this.builderService.editColumn(column.table, column, form.name, form);
    this.shortcutDisabledState.set(false);
    this.selected = false;
    this.state.clear();
  }

  public onTableSubmit(table: Table, form: FormGroup): void {
    this.builderService.editTable(table, form.value.name);
    this.shortcutDisabledState.set(false);
    this.selected = false;
    this.state.clear();
  }

  private disableShortcuts(): MonoTypeOperatorFunction<Rename> {
    return tap(() => this.shortcutDisabledState.set(true));
  }
  // public focusInput(): string {
  //   this.delay(0).then(() => {
  //     if (this.renameInput) {
  //       this.renameInput.nativeElement.focus();
  //       if (!this.selected) {
  //         this.shortcutDisabledState.set(true);
  //         this.renameInput.nativeElement.select();
  //         this.selected = true;
  //       }
  //     }
  //   });

  //   return '';
  // }
  public isColumn(rename: Rename): boolean {
    return !!rename.column;
  }
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
