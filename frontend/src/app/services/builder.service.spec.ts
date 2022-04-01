import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { builderKey } from '../models/builder.model';
import { Column } from '../models/column.model';
import { Relation, relationStateKey } from '../models/relation.model';
import { Table } from '../models/table-svg.model';
import { State } from '../state/state';

import { BuilderService } from './builder.service';
import { StateInjector } from './state.token';

describe('BuilderService', () => {
  let service: BuilderService;
  let tableState: State<Table[]>;
  let relationState: State<Relation[]>;
  let stateSubject: BehaviorSubject<Table[]>;
  let relationSubject: BehaviorSubject<Relation[]>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: StateInjector(builderKey), useValue: new State<Table[]>(),
        },
        {
          provide: StateInjector(relationStateKey), useValue: new State<Relation[]>(),
        }],
    });
    tableState = TestBed.inject<State<Table[]>>(StateInjector(builderKey));
    relationState = TestBed.inject<State<Relation[]>>(StateInjector(relationStateKey));
    relationSubject = new BehaviorSubject(undefined as any as Relation[]);
    spyOn(tableState, 'set');
    spyOn(relationState, 'set');
    stateSubject = new BehaviorSubject(undefined as any as Table[]);
    spyOnProperty(tableState, 'select$').and.returnValue(stateSubject.asObservable());
    spyOnProperty(relationState, 'select$').and.returnValue(relationSubject.asObservable());
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
      expect(tableState.set).toHaveBeenCalledWith(arr);
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
      expect(tableState.set).toHaveBeenCalledWith([...arr, newTable]);
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
      expect(tableState.set).toHaveBeenCalledWith([new Table(newName, 'dummy')]);
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
      expect(tableState.set).toHaveBeenCalledWith([expected]);
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
      expect(tableState.set).toHaveBeenCalledWith([expected]);
    });
  });

  describe('addRelation', () => {
    it('should add relation between columns', async () => {
      // Arrange
      const table1 = new Table('table', 'dummy');
      const column1 = new Column(0, table1, 'column1');
      table1.columns.push(column1);

      const table2 = new Table('table', 'dummy');
      const column2 = new Column(0, table2, 'column2');
      table2.columns.push(column2);

      const arr = [table1, table2];
      stateSubject.next(arr);

      // Act
      await service.addRelation(column1, column2);

      // Assert
      expect(relationState.set).toHaveBeenCalledWith([new Relation(column1, column2)]);
    });
  });

});
