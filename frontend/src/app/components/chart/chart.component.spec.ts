import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTestingModule } from '../../app-testing.module';
import { Column } from '../../models/column.model';
import { Table } from '../../models/table-svg.model';
import { BuilderService } from '../../services/builder.service';
import { ContextMenuService } from '../../services/context-menu.service';

import { ChartComponent } from './chart.component';

describe('ChartComponent', () => {
  let component: ChartComponent;
  let fixture: ComponentFixture<ChartComponent>;
  let builderService: BuilderService;
  let contextMenuService: ContextMenuService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChartComponent],
      imports: [AppTestingModule]
    })
      .compileComponents();
  });

  beforeEach(() => {
    builderService = TestBed.inject(BuilderService);
    contextMenuService = TestBed.inject(ContextMenuService);
    spyOn(builderService, 'setTables');
    fixture = TestBed.createComponent(ChartComponent);
    component = fixture.componentInstance;
    component.tables = [];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  describe('contextMenu', () => {
    const table = new Table('table', 'schema');
    const clientx = 400;
    const clienty = 400;
    const mouseEvent = new MouseEvent('MouseEvent', {
      clientX: clientx,
      clientY: clienty,
    });
    beforeEach(() => {
      spyOn(contextMenuService, 'none');
      spyOn(contextMenuService, 'table');
      spyOn(contextMenuService, 'column');
    });
    it('should call none when no table or column', () => {
      // Act
      component.contextMenu(mouseEvent);
      // Assert
      expect(contextMenuService.none).toHaveBeenCalledOnceWith(mouseEvent.clientX, mouseEvent.clientY);
      expect(contextMenuService.table).not.toHaveBeenCalled();
      expect(contextMenuService.column).not.toHaveBeenCalled();
    });

    it('should call table when no column', () => {
      // Act
      component.contextMenu(mouseEvent, table);
      // Assert
      expect(contextMenuService.table).toHaveBeenCalledOnceWith(mouseEvent.clientX, mouseEvent.clientY, table);
      expect(contextMenuService.none).not.toHaveBeenCalled();
      expect(contextMenuService.column).not.toHaveBeenCalled();
    });

    it('should call column', () => {
      // Arrange
      const column = new Column(0, table, 'name');
      // Act
      component.contextMenu(mouseEvent, table, column);
      // Assert
      expect(contextMenuService.column).toHaveBeenCalledOnceWith(mouseEvent.clientX, mouseEvent.clientY, column);
      expect(contextMenuService.table).not.toHaveBeenCalled();
      expect(contextMenuService.none).not.toHaveBeenCalled();
    });
  });
  describe('drag and drop', () => {
    let table: Table;

    beforeEach(() => {
      table = new Table('table', 'schema');
    });

    it('should change coordinates for table', () => {
      // Arrange
      table.x = 100;
      table.y = 100;

      const startEvent = new MouseEvent('DragStart', { clientX: 100, clientY: 100 });
      const dragEvent = new MouseEvent('DragStart', { clientX: 10, clientY: 10 });
      const endEvent = new MouseEvent('DragStart', { clientX: 0, clientY: 0 });

      // Act
      component.dragStart(startEvent, table);
      component.drag(dragEvent);
      component.dragEnd(endEvent);
      // Assert
      expect(table.x).toBe(10);
      expect(table.y).toBe(10);
    });
  });
  describe('refreshZoom', () => {

    it('should zoom out', () => {
      // Arrange
      const initalScale = component.scale;
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: 10
      });
      // Act
      component.refreshZoom(wheelEvent);
      // Assert
      expect(component.scale).toBe(initalScale - 0.1);
    });

    it('should zoom in', () => {
      // Arrange
      const initalScale = component.scale;
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: -10
      });
      // Act
      component.refreshZoom(wheelEvent);
      // Assert
      expect(component.scale).toBe(initalScale + 0.1);
    });

    it('should not go out of lower bound', () => {
      // Arrange
      const initalScale = component.scale;
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: 1000
      });
      // Act
      component.refreshZoom(wheelEvent);
      // Assert
      expect(component.scale).toBe(0.1);
    });

    it('should not go out of upper bound', () => {
      // Arrange
      const initalScale = component.scale;
      const wheelEvent = new WheelEvent('WheelEvent', {
        deltaY: -1000
      });
      // Act
      component.refreshZoom(wheelEvent);
      // Assert
      expect(component.scale).toBe(4);
    });
  });
});
