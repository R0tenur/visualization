import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Status } from '../../../../shared/models/status.enum';
import { AppTestingModule } from '../app-testing.module';

import { DataStudioService } from './data-studio.service';
import { WINDOW } from './window.token';
import { Subject, Subscription } from 'rxjs';
import { Mermaid } from 'mermaid';
import { MERMAID } from './mermaid.token';
import { Exportable } from '../models/exportable.model';
import { StateInjector } from './state.token';
import { ChartError, ChartErrorKey } from '../models/error.model';
import { State } from '../state/state';

describe('DataStudioService', () => {
  let dataStudioService: DataStudioService;
  let alert: State<ChartError>;
  let windowRef: Window;
  let mermaid: Mermaid;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppTestingModule],
      providers: [{ provide: StateInjector(ChartErrorKey), useValue: new State<ChartError>() }],

    });
    alert = TestBed.inject(StateInjector(ChartErrorKey));
    windowRef = TestBed.inject(WINDOW);
    mermaid = TestBed.inject(MERMAID);
    dataStudioService = TestBed.inject(DataStudioService);
  });

  it('should be created', () => {
    expect(dataStudioService).toBeTruthy();
  });

  describe('isInDataStudio', () => {

    it('should return false when not in data studio', () => {
      // Arrange
      spyOn(windowRef.document, 'getElementsByTagName').withArgs('body').and.returnValue([
        {
          hasAttribute: (_: string) => false,
        },
      ] as any as HTMLCollectionOf<Element>);

      // Act
      const isInDataStudio = dataStudioService.isInDataStudio();

      // Assert
      expect(isInDataStudio).toBeFalse();
    });

    it('should return true when in data studio', () => {
      // Arrange
      spyOn(windowRef.document, 'getElementsByTagName').withArgs('body').and.returnValue([
        {
          hasAttribute: (_: string) => true,
        },
      ] as any as HTMLCollectionOf<Element>);

      // Act
      const isInDataStudio = dataStudioService.isInDataStudio();

      // Assert
      expect(isInDataStudio).toBeTrue();
    });
  });

  describe('isDarkMode', () => {

    it('should return false when not in data studio', () => {
      // Arrange
      spyOn(windowRef.document, 'getElementsByTagName').withArgs('body').and.returnValue([
        {
          getAttribute: (_: string) => 'dummy',
        },
      ] as any as HTMLCollectionOf<Element>);

      // Act
      const isDarkmode = dataStudioService.isDarkMode();

      // Assert
      expect(isDarkmode).toBeFalse();
    });

    it('should return true when in data studio', () => {
      // Arrange
      spyOn(windowRef.document, 'getElementsByTagName').withArgs('body').and.returnValue([
        {
          getAttribute: (_: string) => 'vscode-dark',
        },
      ] as any as HTMLCollectionOf<Element>);

      // Act
      const isDarkMode = dataStudioService.isDarkMode();

      // Assert
      expect(isDarkMode).toBeTrue();
    });
  });
  it('should trigger error alert when status error', fakeAsync(() => {
    // Arrange
    spyOn(alert, 'set');
    const statusSubscription = dataStudioService.Status$.subscribe();

    const status = Status.Error;
    const errors = ['Dummy error'];
    const rawData = 'rawData';

    const event = createEvent({
      status,
      errors,
      rawData
    });

    // Act
    windowRef.dispatchEvent(event);
    tick();

    // Assert
    expect(alert.set).toHaveBeenCalledWith({ status, errors, rawData: JSON.stringify(rawData) });
    statusSubscription.unsubscribe();
  }));
  describe('Database$', () => {
    let database: Exportable;
    let databaseSubscription: Subscription;
    beforeEach(() => {
      databaseSubscription = dataStudioService.Database$.subscribe(e => database = e);
    });
    afterEach(() => {
      if (databaseSubscription) {
        databaseSubscription.unsubscribe();
      }
    });
    it('should render mermaid to svg', fakeAsync(() => {
      // Arrange
      spyOn(alert, 'set');
      const markdown = 'dummyMarkdown';
      const svg = 'dummySVG';

      spyOn(mermaid, 'render').and.callFake(createFakeRenderCallback(svg));

      const event = createEvent({
        status: Status.Complete,
        chart: markdown,
      });

      // Act
      windowRef.dispatchEvent(event);
      tick();

      // Assert
      expect(alert.set).not.toHaveBeenCalled();
      expect(database).toEqual({ svg, mermaid: markdown });
    }));

    it('should propagate mermaid errors to alert', fakeAsync(() => {
      // Arrange
      spyOn(alert, 'set');
      const markdown = 'dummyMarkdown';
      const errorMsg = 'errorMessage';

      spyOn(mermaid, 'render').and.throwError(errorMsg);

      const event = createEvent({
        status: Status.Complete,
        chart: markdown,

      });

      // Act
      windowRef.dispatchEvent(event);
      tick();

      // Assert
      expect(alert.set).toHaveBeenCalled();
    }));
  });

  const createEvent = (data: any) => {
    const event = new CustomEvent('message') as any;
    event.data = data;
    return event as Event;
  };
  const createFakeRenderCallback = (returnedSvg: string) => {
    const fakeCallback =
      (
        _: string,
        __: string,
        cb?: (
          svgCode: string,
          bindFunctions: (element: Element) => void
        ) => void) => {
        if (cb) {
          cb(returnedSvg, (___: Element) => { }); // NOSONAR - this is a fake callback
        }
        return '';
      };

    return fakeCallback;

  };
});
