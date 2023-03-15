import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { AppTestingModule } from '../app-testing.module';
import { AddRelation, addRelationKey } from '../models/add-relation.model';
import { Highlighted, highlightedKey } from '../models/highlighted.model';
import { State } from '../state/state';
import { BuilderService } from './builder.service';

import { shortcutsDisabledKey, ShortcutService } from './shortcut.service';
import { StateInjector } from './state.token';
import { WINDOW } from './window.token';

describe('ShortcutService', () => {
  let service: ShortcutService;
  let builderService: BuilderService;
  let windowRef: Window;
  let highlightedState: State<Highlighted>;
  let highlightedSubject: BehaviorSubject<Highlighted>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppTestingModule],
      providers: [
        ShortcutService,
        { provide: StateInjector(highlightedKey), useValue: new State<Highlighted>() },
        { provide: StateInjector(addRelationKey), useValue: new State<AddRelation>() },
        { provide: StateInjector(shortcutsDisabledKey), useValue: new State<boolean>() },
      ]
    });
    builderService = TestBed.inject(BuilderService);
    windowRef = TestBed.inject(WINDOW);
    highlightedState = TestBed.inject(StateInjector(highlightedKey));
    highlightedSubject = new BehaviorSubject(undefined as any as Highlighted);
    spyOnProperty(highlightedState, 'select$').and.returnValue(highlightedSubject.asObservable());
    service = TestBed.inject(ShortcutService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  describe('keypress t', () => {
    it('should add table with no position when noting is highlighted', () => {
      // Arrange
      spyOn(builderService, 'addTable').and.returnValue(Promise.resolve());
      const event = createEvent({ key: 't' });

      // Act
      windowRef.dispatchEvent(event);

      // Assert
      expect(builderService.addTable).toHaveBeenCalledOnceWith();
    });

    it('should add table with highligted position as reference', async () => {
      // Arrange
      spyOn(builderService, 'addTable').and.returnValue(Promise.resolve());
      highlightedSubject.next({ width: 100, x: 100, y: 100 } as any as Highlighted);

      const event = createEvent({ key: 't' });

      // Act
      await delay(7);
      windowRef.dispatchEvent(event);
      await delay(7);
      // Assert
      expect(builderService.addTable).toHaveBeenCalledOnceWith(undefined, { x: 250, y: 100 });
    });
  });

  describe('keypress c', () => {
    it('should not add column when nothing highlighted', () => {
      // Arrange
      spyOn(builderService, 'addColumn').and.returnValue(Promise.resolve());
      const event = createEvent({ key: 'c' });

      // Act
      windowRef.dispatchEvent(event);

      // Assert
      expect(builderService.addColumn).not.toHaveBeenCalled();
    });

  });


  const createEvent = (data: any) => {
    const event = new CustomEvent('keydown') as any;
    return { ...event, ...data } as Event;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

});
