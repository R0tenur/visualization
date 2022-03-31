import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { Column } from '../../models/column.model';
import { Rename, renameKey } from '../../models/rename.model';
import { Table } from '../../models/table-svg.model';
import { BuilderService } from '../../services/builder.service';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';

import { RenameModalComponent } from './rename-modal.component';

describe('RenameModalComponent', () => {
  let component: RenameModalComponent;
  let fixture: ComponentFixture<RenameModalComponent>;
  let renameState: State<Rename>;
  let renameStateSubject: BehaviorSubject<Rename>;
  let builderService: BuilderService;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RenameModalComponent],
      providers: [{ provide: StateInjector(renameKey), useValue: new State<Rename>() }],
    })
      .compileComponents();
  });

  beforeEach(() => {
    renameStateSubject = new BehaviorSubject(undefined as any as Rename);
    renameState = TestBed.inject<State<Rename>>(StateInjector(renameKey));
    builderService = TestBed.inject(BuilderService);
    spyOnProperty(renameState, 'select$').and.returnValue(renameStateSubject.asObservable());
    fixture = TestBed.createComponent(RenameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not be visible when no rename', () => {
    // Assert
    expect(fixture.nativeElement.querySelector('rename')).toBeFalsy();
  });

  it('should be visible when rename', () => {
    // Act
    renameStateSubject.next({ position, table: new Table('table', 'dummy') });
    fixture.detectChanges();
    // Assert
    expect(fixture.nativeElement.querySelector('.rename')).toBeTruthy();
  });


  describe('setName', () => {
    it('should clear state when set', () => {
      // Arrange
      spyOn(renameState, 'clear');
      // Act
      component.setName({ position, table: new Table('table', 'dummy') }, 'new name');
      // Assert
      expect(renameState.clear).toHaveBeenCalled();
    });
    it('should rename table when no column', () => {
      // Arrange
      spyOn(builderService, 'renameTable').and.returnValue(Promise.resolve());
      spyOn(builderService, 'renameColumn').and.returnValue(Promise.resolve());
      const table = new Table('table', 'dummy');
      // Act
      component.setName({ position, table }, 'new name');
      // Assert
      expect(builderService.renameTable).toHaveBeenCalledOnceWith(table, 'new name');
      expect(builderService.renameColumn).not.toHaveBeenCalled();
    });
    it('should rename column when exists', () => {
      // Arrange
      spyOn(builderService, 'renameTable').and.returnValue(Promise.resolve());
      spyOn(builderService, 'renameColumn').and.returnValue(Promise.resolve());
      const table = new Table('table', 'dummy');
      const column = new Column(0, table, 'dummy');
      // Act
      component.setName({ position, table, column }, 'new name');
      // Assert
      expect(builderService.renameTable).not.toHaveBeenCalled();
      expect(builderService.renameColumn).toHaveBeenCalledOnceWith(table, column, 'new name');
    });

    it('should do nothing when no table or column', () => {
      // Arrange
      spyOn(builderService, 'renameTable').and.returnValue(Promise.resolve());
      spyOn(builderService, 'renameColumn').and.returnValue(Promise.resolve());
      // Act
      component.setName({ position }, 'new name');
      // Assert
      expect(builderService.renameTable).not.toHaveBeenCalled();
      expect(builderService.renameColumn).not.toHaveBeenCalled();
    });
  });

  const position = {
    x: 0,
    y: 0,
  };
});
