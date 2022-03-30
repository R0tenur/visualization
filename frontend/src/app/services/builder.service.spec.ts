import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { builderKey } from '../models/builder.model';
import { Column } from '../models/column.model';
import { Table } from '../models/table-svg.model';
import { State } from '../state/state';

import { BuilderService } from './builder.service';
import { StateInjector } from './state.token';

describe('BuilderService', () => {
  let service: BuilderService;
  let state: State<Table[]>;
  let stateSubject: BehaviorSubject<Table[]>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: StateInjector(builderKey), useValue: new State<Table[]>() }],
    });
    state = TestBed.inject<State<Table[]>>(StateInjector(builderKey));
    spyOn(state, 'set');
    stateSubject = new BehaviorSubject(undefined as any as Table[]);
    spyOnProperty(state, 'select$').and.returnValue(stateSubject.asObservable());
    service = TestBed.inject(BuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setTable', () => {
    it('should set as new array', () => {
      // Arrange
      const arr = [new Table('table', 'dummy')];
      // Act
      service.setTables(arr);
      expect(state.set).toHaveBeenCalledWith(arr);
    });
  });

  describe('addTable', () => {
    it('should add table', async () => {
      // Arrange
      const arr = [new Table('table', 'dummy')];
      stateSubject.next(arr);
      const newTable = new Table('new table', 'dummy');

      // Act
      await service.addTable(newTable);

      // Assert
      expect(state.set).toHaveBeenCalledWith([...arr, newTable]);
    });
  });

  describe('renameTable', () => {
    it('should rename table', async () => {
      // Arrange
      const table = new Table('table', 'dummy');
      const arr = [table];
      stateSubject.next(arr);
      const newName = 'new name';

      // Act
      await service.renameTable(table, newName);

      // Assert
      expect(state.set).toHaveBeenCalledWith([new Table(newName, 'dummy')]);
    });
  });

  describe('addColumn', () => {
    it('should add column', async () => {
      // Arrange
      const table = new Table('table', 'dummy');
      const arr = [table];
      stateSubject.next(arr);
      const newName = 'new name';

      // Act
      await service.addColumn(table, newName);

      // Assert
      const expected = new Table('table', 'dummy');
      expected.columns.push(new Column(0, table, newName));
      expect(state.set).toHaveBeenCalledWith([expected]);
    });
  });

  describe('renameColumn', () => {
    it('should rename column', async () => {
      // Arrange
      const table = new Table('table', 'dummy');
      const arr = [table];
      stateSubject.next(arr);
      const oldName = 'old name';
      const newName = 'new name';
      await service.addColumn(table, oldName);

      const column = new Column(0, table, oldName);
      // Act
      await service.renameColumn(table, column, newName);

      // Assert
      const expected = new Table('table', 'dummy');
      expected.columns.push(new Column(0, table, newName));
      expect(state.set).toHaveBeenCalledWith([expected]);
    });
  });

});
