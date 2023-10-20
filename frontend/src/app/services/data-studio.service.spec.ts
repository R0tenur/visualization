import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Status } from '../../../../shared/models/status.enum';
import { AppTestingModule } from '../app-testing.module';
import { AlertService } from './alert.service';

import { DataStudioService } from './data-studio.service';
import { WINDOW } from './window.token';
import { Subscription } from 'rxjs';
import { MERMAID } from './mermaid.token';
import { Exportable } from '../models/exportable.model';

describe('DataStudioService', () => {
  let dataStudioService: DataStudioService;
  let alert: AlertService;
  let windowRef: Window;
  let mermaid: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppTestingModule],
    });
    alert = TestBed.inject(AlertService);
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
      spyOn(windowRef.document, 'getElementsByTagName')
        .withArgs('body')
        .and.returnValue([
          {
            hasAttribute: (attribute: string) => false,
          },
        ] as any as HTMLCollectionOf<Element>);

      // Act
      const isInDataStudio = dataStudioService.isInDataStudio();

      // Assert
      expect(isInDataStudio).toBeFalse();
    });

    it('should return true when in data studio', () => {
      // Arrange
      spyOn(windowRef.document, 'getElementsByTagName')
        .withArgs('body')
        .and.returnValue([
          {
            hasAttribute: (attribute: string) => true,
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
      spyOn(windowRef.document, 'getElementsByTagName')
        .withArgs('body')
        .and.returnValue([
          {
            getAttribute: (attribute: string) => 'dummy',
          },
        ] as any as HTMLCollectionOf<Element>);

      // Act
      const isDarkmode = dataStudioService.isDarkMode();

      // Assert
      expect(isDarkmode).toBeFalse();
    });

    it('should return true when in data studio', () => {
      // Arrange
      spyOn(windowRef.document, 'getElementsByTagName')
        .withArgs('body')
        .and.returnValue([
          {
            getAttribute: (attribute: string) => 'vscode-dark',
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
    spyOn(alert, 'showError');
    const statusSubscription = dataStudioService.Status$.subscribe();

    const status = Status.Error;
    const errors = ['Dummy error'];
    const rawData = 'rawData';

    const event = createEvent({
      status,
      errors,
      rawData,
    });

    // Act
    windowRef.dispatchEvent(event);
    tick();

    // Assert
    expect(alert.showError).toHaveBeenCalledWith({
      status,
      errors,
      rawData: JSON.stringify(rawData),
    });
    statusSubscription.unsubscribe();
  }));
  describe('Database$', () => {
    let database: Exportable;
    let databaseSubscription: Subscription;
    beforeEach(() => {
      databaseSubscription = dataStudioService.Database$.subscribe(
        (e: Exportable) => (database = e)
      );
    });
    afterEach(() => {
      if (databaseSubscription) {
        databaseSubscription.unsubscribe();
      }
    });
    it('should render mermaid to svg', fakeAsync(() => {
      // Arrange
      spyOn(alert, 'showError');
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
      expect(alert.showError).not.toHaveBeenCalled();
      expect(database).toEqual({ svg, mermaid: markdown });
    }));

    it('should propagate mermaid errors to alert', fakeAsync(() => {
      // Arrange
      spyOn(alert, 'showError');
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
      expect(alert.showError).toHaveBeenCalled();
    }));
  });

  const createEvent = (data: any) => {
    const event = new CustomEvent('message') as any;
    event.data = data;
    return event as Event;
  };
  const createFakeRenderCallback = (returnedSvg: string) => {
    const fakeCallback = (
      _: string,
      __: string,
      cb?: (svgCode: string, bindFunctions: (element: Element) => void) => void
    ) => {
      if (cb) {
        cb(returnedSvg, (element: Element) => {});
      }
      return '';
    };

    return fakeCallback;
  };
});
