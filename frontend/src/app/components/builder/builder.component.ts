import { Component, Inject } from '@angular/core';
import { builderKey } from '../../models/builder.model';
import { Relation, relationStateKey } from '../../models/relation.model';
import { Table } from '../../models/table-svg.model';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html'
})
export class BuilderComponent {
  constructor(
    @Inject(StateInjector(builderKey)) public readonly builderState: State<Table[]>) {}
}
