import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AppTestingModule } from '../../app-testing.module';
import { Column } from '../../models/column.model';
import { Rename, renameKey } from '../../models/rename.model';
import { Table } from '../../models/table-svg.model';
import { BuilderService } from '../../services/builder.service';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';

import { ChangeModalComponent } from './change-modal.component';

describe('ChangeModalComponent', () => {
  let component: ChangeModalComponent;
  let fixture: ComponentFixture<ChangeModalComponent>;
  let renameState: State<Rename>;
  let renameStateSubject: BehaviorSubject<Rename>;
  let builderService: BuilderService;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChangeModalComponent],
      imports: [AppTestingModule],
      providers: [{ provide: StateInjector(renameKey), useValue: new State<Rename>() }],
    })
      .compileComponents();
  });

  beforeEach(() => {
    renameStateSubject = new BehaviorSubject(undefined as any as Rename);
    renameState = TestBed.inject<State<Rename>>(StateInjector(renameKey));
    builderService = TestBed.inject(BuilderService);
    spyOnProperty(renameState, 'select$').and.returnValue(renameStateSubject.asObservable());
    fixture = TestBed.createComponent(ChangeModalComponent);
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
      spyOn(builderService, 'editTable').and.returnValue(Promise.resolve());
      spyOn(builderService, 'editColumn').and.returnValue(Promise.resolve());
      const table = new Table('table', 'dummy');
      // Act
      component.setName({ position, table }, 'new name');
      // Assert
      expect(builderService.editTable).toHaveBeenCalledOnceWith(table, 'new name');
      expect(builderService.editColumn).not.toHaveBeenCalled();
    });
    it('should rename column when exists', () => {
      // Arrange
      spyOn(builderService, 'editTable').and.returnValue(Promise.resolve());
      spyOn(builderService, 'editColumn').and.returnValue(Promise.resolve());
      const table = new Table('table', 'dummy');
      const column = new Column(0, table, 'dummy');
      // Act
      component.setName({ position, table, column }, 'new name');
      // Assert
      expect(builderService.editTable).not.toHaveBeenCalled();
      expect(builderService.editColumn).toHaveBeenCalledOnceWith(table, column, 'new name', column.data);
    });

    it('should do nothing when no table or column', () => {
      // Arrange
      spyOn(builderService, 'editTable').and.returnValue(Promise.resolve());
      spyOn(builderService, 'editColumn').and.returnValue(Promise.resolve());
      // Act
      component.setName({ position }, 'new name');
      // Assert
      expect(builderService.editTable).not.toHaveBeenCalled();
      expect(builderService.editColumn).not.toHaveBeenCalled();
    });
  });

  const position = {
    x: 0,
    y: 0,
  };
});
