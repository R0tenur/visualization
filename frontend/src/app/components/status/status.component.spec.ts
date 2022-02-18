import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { Status } from '../../../../../shared/models/status.enum';
import { AppTestingModule } from '../../app-testing.module';
import { DataStudioService } from '../../services/data-studio.service';

import { StatusComponent } from './status.component';

describe('StatusComponent', () => {
  let statusComponent: StatusComponent;
  let dataStudioService: DataStudioService;
  let fixture: ComponentFixture<StatusComponent>;

  const statusSubject$ = new Subject<Status>();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatusComponent],
      imports: [AppTestingModule],
    })
      .compileComponents();
  });

  beforeEach(() => {
    dataStudioService = TestBed.inject(DataStudioService);
    spyOnProperty(dataStudioService, 'Status$').and.returnValue(statusSubject$);
    fixture = TestBed.createComponent(StatusComponent);
    statusComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(statusComponent).toBeTruthy();
  });
  it('should show message for GettingTableData', () => {
    statusSubject$.next(Status.GettingTableData);
    expect(getById('Status-GettingTableData')).toBeTruthy();
  });
  it('should show message for GeneratingSvg', () => {
    statusSubject$.next(Status.GeneratingSvg);
    expect(getById('Status-GeneratingSvg')).toBeTruthy();
  });

  it('should show message for BuildingChart', () => {
    statusSubject$.next(Status.BuildingChart);
    expect(getById('Status-BuildingChart')).toBeTruthy();
  });

  it('should show loading when no status', () => {
    expect(getById('Loading')).toBeTruthy();
  });

  it('should not show loading when status', () => {
    statusSubject$.next(Status.Complete);
    expect(getById('Loading')).toBeFalsy();
  });

  [
    Status.Complete,
    Status.NoDatabase,
    Status.Error].forEach((status: Status) => it(`should not show anything when status is ${status}`, () => {
      statusSubject$.next(Status.Complete);
      expect(getById('Empty')).toBeTruthy();
    }));

  const getById = (id: string) => {
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('#' + id));
  };
});
