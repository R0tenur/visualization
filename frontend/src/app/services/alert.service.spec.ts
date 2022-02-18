import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { Status } from '../../../../shared/models/status.enum';
import { ChartError } from '../models/error.model';

import { AlertService } from './alert.service';

describe('AlertService', () => {
  let alertService: AlertService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    alertService = TestBed.inject(AlertService);
  });

  it('should be created', () => {
    expect(alertService).toBeTruthy();
  });
  describe('showError', () => {
    it('should trigger alert', done => {
      // Arrange
      const chartError = createChartError();

      // Act
      alertService.showError(chartError);
      alertService.Alert$.pipe(take(1)).subscribe(alert => {
        // Assert
        expect(alert).toBe(chartError);
        done();
      });
    });
  });

  describe('dismissError', () => {
    it('should dismiss alert', (done) => {
      // Arrange
      const chartError = createChartError();
      // Act
      alertService.showError(chartError);
      alertService.dismissError();
      alertService.Alert$.pipe(take(1)).subscribe(alert => {
        // Assert
        expect(alert).toBeUndefined();
        done();
      });
    });
  });

  const createChartError = (errorMessage: string = 'err') => {
    const errors = [errorMessage];
    const rawData = 'rawData';
    const status = Status.Error;
    const chartError: ChartError = { errors, rawData, status };
    return chartError;
  };
});
