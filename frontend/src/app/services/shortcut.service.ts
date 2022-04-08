import { Inject, Injectable, OnDestroy } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { AddRelation, addRelationKey } from '../models/add-relation.model';
import { Column } from '../models/column.model';
import { Highlighted, highlightedKey } from '../models/highlighted.model';
import { Table } from '../models/table-svg.model';
import { State } from '../state/state';
import { BuilderService } from './builder.service';
import { StateInjector } from './state.token';
import { WINDOW } from './window.token';

export const shortcutsDisabledKey = 'shortcutsDisabled';
@Injectable()
export class ShortcutService implements OnDestroy {
  private readonly shortcuts: Record<string, () => void> = {
    t: () => this.highlighted ?
      this.builderService.addTable(
        undefined,
        { x: this.highlighted.x + this.highlighted.width + 50, y: this.highlighted.y }) : this.builderService.addTable(),
    c: () => this.highlighted instanceof Column ? this.builderService.addColumn(this.highlighted.table, 'newColumn') :
      this.highlighted instanceof Table ? this.builderService.addColumn(this.highlighted, 'newColumn') : null,
    r: () => this.highlighted instanceof Column ?
      this.relationState.set({ column: this.highlighted, position: { x: this.highlighted.x, y: this.highlighted.y } }) : null,

  };
  private shortcutsDisabled = false;
  private highlighted!: Highlighted;
  private readonly shortcutSubscription = new Subscription();
  private readonly highlightedSubscription = new Subscription();
  private readonly disbledSubscription = new Subscription();
  constructor(
    @Inject(WINDOW) private readonly window: Window,
    @Inject(StateInjector(highlightedKey)) private readonly highlightedState: State<Highlighted>,
    @Inject(StateInjector(addRelationKey)) private readonly relationState: State<AddRelation>,
    @Inject(StateInjector(shortcutsDisabledKey)) private readonly shortcutDisbaledState: State<boolean>,
    private readonly builderService: BuilderService) {
    this.shortcutSubscription = fromEvent<KeyboardEvent>(this.window.document, 'keydown').pipe(
      filter(e => !this.shortcutsDisabled && this.shortcuts.hasOwnProperty(e.key)))
      .subscribe(e => this.shortcuts[e.key]());

    this.highlightedSubscription = this.highlightedState.select$.subscribe(highlighted => this.highlighted = highlighted);

    this.disbledSubscription = this.shortcutDisbaledState.select$.subscribe(disabled => this.shortcutsDisabled = disabled);
  }
  public ngOnDestroy(): void {
    this.highlightedSubscription.unsubscribe();
    this.shortcutSubscription.unsubscribe();
    this.disbledSubscription.unsubscribe();
  }
}
