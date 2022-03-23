import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ContextMenu, contextMenuStateKey } from '../../models/context-menu.model';
import { ContextMenuService } from '../../services/context-menu.service';
import { StateInjector } from '../../services/state.token';
import { State } from '../../state/state';

import { ContextMenuComponent } from './context-menu.component';

describe('ContextMenuComponent', () => {
  let component: ContextMenuComponent;
  let fixture: ComponentFixture<ContextMenuComponent>;
  let state: State<ContextMenu>;
  let contextMenuSubject: BehaviorSubject<ContextMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContextMenuComponent],
      providers: [{ provide: StateInjector(contextMenuStateKey), useValue: new State<ContextMenu>() }],

    })
    .compileComponents();
  });

  beforeEach(() => {
    contextMenuSubject = new BehaviorSubject<ContextMenu>(undefined as any as ContextMenu);
    state = TestBed.inject(StateInjector(contextMenuStateKey));
    spyOnProperty(state, 'select$').and.returnValue(contextMenuSubject.asObservable());
    fixture = TestBed.createComponent(ContextMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not show menu when not open', () => {
    expect(fixture.nativeElement.querySelector('.context-menu')).toBeFalsy();
  });

  it('should show menu when value', () => {
    // Act
    contextMenuSubject.next({items: [], position: { x: 1, y: 1 }});
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('.context-menu')).toBeTruthy();
  });

  it('should trigger event when clicked', fakeAsync(() => {
    // Arragne
    const menuItem = { label: 'dummy', event: jasmine.createSpy() };
    spyOn(state, 'clear');

    // Act
    contextMenuSubject.next({ items: [menuItem], position: { x: 1, y: 1 } });
    fixture.detectChanges();
    tick();
    const listItem = fixture.nativeElement.querySelector('li');
    listItem.click();
    tick();

    // Assert
    expect(menuItem.event).toHaveBeenCalled();
    expect(state.clear).toHaveBeenCalled();
  }));
});
