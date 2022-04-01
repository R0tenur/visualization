import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTestingModule } from '../../app-testing.module';
import { Column } from '../../models/column.model';
import { Table } from '../../models/table-svg.model';
import { BuilderService } from '../../services/builder.service';

import { RelationComponent } from './relation.component';

describe('RelationComponent', () => {
  let component: RelationComponent;
  let fixture: ComponentFixture<RelationComponent>;
  let builderService: BuilderService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RelationComponent], imports: [AppTestingModule]
    })
    .compileComponents();
  });

  beforeEach(() => {
    builderService = TestBed.inject(BuilderService);
    spyOn(builderService, 'addRelation');
    fixture = TestBed.createComponent(RelationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  describe('selectTable ', () => {
    it('should set the selected table', () => {
      // Arrange
      const table = new Table('table', 'schema');
      // Act
      component.selectTable(table);
      // Assert
      expect(component.selectedTable).toEqual(table);
    });
  });
  describe('selectColumn ', () => {
    it('should set the selected column', () => {
      // Arrange
      const column1 = new Column(0, {} as Table, 'column1');
      const column2 = new Column(0, {} as Table, 'column2');
      // Act
      component.selectColumn(column1, column2);
      // Assert
      expect(builderService.addRelation).toHaveBeenCalledWith(column1, column2);
      expect(component.selectedTable).toBeUndefined();
    });
  });
});
