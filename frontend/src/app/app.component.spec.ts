import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { AppTestingModule } from './app-testing.module';
import { AppComponent } from './app.component';
import { DataStudioService } from './services/data-studio.service';
import { of } from 'rxjs';

describe('AppComponent', () => {
  const databaseName = 'database';
  let dataStudioService: DataStudioService;
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [AppTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    dataStudioService = TestBed.inject(DataStudioService);
    spyOnProperty(dataStudioService, 'Database$').and.returnValue(
      of({
        svg: '<svg></svg>',
        mermaid: 'mermaid',
      })
    );

    spyOnProperty(dataStudioService, 'DatabaseName$').and.returnValue(
      of(databaseName)
    );
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  describe('database', () => {
    it('should get the database name', fakeAsync(() => {
      // Assert
      expect(
        fixture.nativeElement.querySelector('#dbName').textContent.trim()
      ).toBe(databaseName);
    }));
  });

  describe('toggleViews', () => {
    it('should toggle the views', () => {
      // Arrange
      spyOn(dataStudioService, 'loadCommand');

      // Act
      component.toggleViews();

      // Assert
      expect(component.options.showViews).toBeTrue();
      expect(dataStudioService.loadCommand).toHaveBeenCalledWith({
        showViews: true,
        showTables: true,
      });
    });
  });

  describe('export', () => {
    it('should export the data', () => {
      // Arrange
      spyOn(dataStudioService, 'saveCommand');

      // Act
      component.exportSvg('svg', 'markdown');

      // Assert
      expect(dataStudioService.saveCommand).toHaveBeenCalledWith({
        chart: 'svg',
        mermaid: 'markdown',
      });
    });
  });
});
