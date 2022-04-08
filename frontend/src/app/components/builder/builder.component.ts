import { Component, Inject } from '@angular/core';
import { builderKey } from '../../models/builder.model';
import { Table } from '../../models/table-svg.model';
import { ShortcutService } from '../../services/shortcut.service';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  providers: [ShortcutService],
})
export class BuilderComponent {
  constructor(
    @Inject(StateInjector(builderKey)) public readonly builderState: State<Table[]>,
    readonly shortCuts: ShortcutService,
  ) { }
}
