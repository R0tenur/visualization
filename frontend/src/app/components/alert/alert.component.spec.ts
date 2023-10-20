import { ComponentFixture, fakeAsync, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, Subject } from 'rxjs';
import { Status } from '../../../../../shared/models/status.enum';
import { AppTestingModule } from '../../app-testing.module';
import { ChartError } from '../../models/error.model';
import { AlertService } from '../../services/alert.service';
import { DataStudioService } from '../../services/data-studio.service';

import { AlertComponent } from './alert.component';

describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;
  let alertService: AlertService;
  let dataStudioService: DataStudioService;
  const alertSubject: Subject<ChartError> = new Subject<ChartError>();
  const markdownSubject: BehaviorSubject<string> = new BehaviorSubject<string>(
    undefined as any as string
  );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertComponent],
      imports: [AppTestingModule],
    }).compileComponents();
  });
  afterEach(() => alertSubject.next(undefined));

  beforeEach(() => {
    alertService = TestBed.inject(AlertService);
    spyOnProperty(alertService, 'Alert$').and.returnValue(
      alertSubject.asObservable()
    );

    dataStudioService = TestBed.inject(DataStudioService);
    spyOnProperty(dataStudioService, 'Markdown$').and.returnValue(
      markdownSubject.asObservable()
    );

    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show nothing when no error', () => {
    // Assert
    expect(fixture.debugElement.query(By.css('#alert'))).toBeFalsy();
  });

  it('should show dialog on error', () => {
    // Act
    alertSubject.next(createChartError());
    fixture.detectChanges();
    // Assert
    expect(fixture.debugElement.query(By.css('#alert'))).toBeTruthy();
  });

  it('should not show "export mermaid" on any error', () => {
    // Act
    alertSubject.next(createChartError());
    fixture.detectChanges();
    // Assert
    expect(
      fixture.debugElement.query(By.css('#textSizeExceededError'))
    ).toBeFalsy();
  });

  it('should show specific message on "Maximum text size in diagram exceeded"', () => {
    const error = 'Maximum text size in diagram exceeded';
    // Act
    alertSubject.next(createChartError(error));
    fixture.detectChanges();
    // Assert
    expect(
      fixture.debugElement.query(By.css('#textSizeExceededError'))
    ).toBeTruthy();
  });

  it('should show markdown download button for "Maximum text size in diagram exceeded" when markdown present', fakeAsync(() => {
    const error = 'Maximum text size in diagram exceeded';
    markdownSubject.next('some awesome markdown');
    // Act
    alertSubject.next(createChartError(error));
    fixture.detectChanges();
    // Assert
    expect(
      fixture.debugElement.query(By.css('#textSizeExceededErrorBtn'))
    ).toBeTruthy();
  }));

  const createChartError = (errorMessage: string = 'err') => {
    const errors = [errorMessage];
    const rawData = 'rawData';
    const status = Status.Error;
    const chartError: ChartError = { errors, rawData, status };
    return chartError;
  };
});
