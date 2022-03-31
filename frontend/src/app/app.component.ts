import { Component, Inject } from '@angular/core';
import { DataStudioService } from './services/data-studio.service';
import { ContextMenuService } from './services/context-menu.service';
import { StateInjector } from './services/state.token';
import { Rename, renameKey } from './models/rename.model';
import { State } from './state/state';
import { AddRelation, addRelationKey } from './models/add-relation.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    public readonly dataStudioService: DataStudioService,
    public readonly contextMenu: ContextMenuService,
    @Inject(StateInjector(renameKey)) private readonly rename: State<Rename>,
    @Inject(StateInjector(addRelationKey)) private readonly addRelation: State<AddRelation>,
  ) { }

  public clearOverlays(): void {
    this.contextMenu.clear();
    this.rename.clear();
    this.addRelation.clear();
  }

}
