import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { Rename, renameKey } from '../../models/rename.model';
import { BuilderService } from '../../services/builder.service';
import { StateInjector } from '../../services/state.token';
import constants from '../../settings/constants';
import { State } from '../../state/state';

@Component({
  selector: 'app-rename-modal',
  templateUrl: './rename-modal.component.html',
  styleUrls: ['./rename-modal.component.scss']
})
export class RenameModalComponent {
  public constants = constants;
  @ViewChild('renameInput') public renameInput!: ElementRef;
  constructor(
    @Inject(StateInjector(renameKey)) public readonly state: State<Rename>,
    private readonly builderService: BuilderService) { }
  public setName(rename: Rename, newName: string): void {
    this.state.clear();
    if (rename.table) {
      if (rename.column) {
        this.builderService.renameColumn(rename.table, rename.column, newName);
        return;
      }
      this.builderService.renameTable(rename.table, newName);
    }

  }
  public focusInput(): string {
    this.delay(0).then(() => {
      if (this.renameInput)
      {
        this.renameInput.nativeElement.focus();
      }
    });

    return '';
  }
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
