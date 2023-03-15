import { Component, Inject } from '@angular/core';
import { ContextMenu, ContextMenuItem, contextMenuStateKey } from '../../models/context-menu.model';
import { StateInjector } from '../../services/state.token';
import constants from '../../settings/constants';
import { State } from '../../state/state';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss']
})
export class ContextMenuComponent {
  constants = constants;
  constructor(@Inject(StateInjector(contextMenuStateKey)) public readonly state: State<ContextMenu>) { }
  public handleEvent(item: ContextMenuItem): void {
    item.event();
    this.state.clear();
  }
}
