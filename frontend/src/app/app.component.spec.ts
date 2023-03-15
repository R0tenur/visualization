import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTestingModule } from './app-testing.module';
import { AppComponent } from './app.component';
import { AddRelation, addRelationKey } from './models/add-relation.model';
import { Rename, renameKey } from './models/rename.model';
import { ContextMenuService } from './services/context-menu.service';
import { StateInjector } from './services/state.token';
import { State } from './state/state';

describe('AppComponent', () => {
  let renameState: State<Rename>;
  let addRelationState: State<AddRelation>;
  let contextMenu: ContextMenuService;
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      imports: [
        AppTestingModule
      ],
      providers: [
        { provide: StateInjector(renameKey), useValue: new State<Rename>() },
        { provide: StateInjector(addRelationKey), useValue: new State<AddRelation>() },
       ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    renameState = TestBed.inject<State<Rename>>(StateInjector(renameKey));
    addRelationState = TestBed.inject<State<AddRelation>>(StateInjector(addRelationKey));
    contextMenu = TestBed.inject(ContextMenuService);
    spyOn(renameState, 'clear');
    spyOn(addRelationState, 'clear');
    spyOn(contextMenu, 'clear');
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {

    expect(component).toBeTruthy();
  });
  describe('clearOverlays', () => {
    it('should clear all modal states', () => {
      // Act
      component.clearOverlays();

      // Assert
      expect(renameState.clear).toHaveBeenCalled();
      expect(addRelationState.clear).toHaveBeenCalled();
      expect(contextMenu.clear).toHaveBeenCalled();
    });
  });

});
