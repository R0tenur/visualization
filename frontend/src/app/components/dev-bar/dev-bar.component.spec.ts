import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTestingModule } from '../../app-testing.module';

import { DevBarComponent } from './dev-bar.component';

describe('DevBarComponent', () => {
  let component: DevBarComponent;
  let fixture: ComponentFixture<DevBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DevBarComponent],
      imports: [AppTestingModule],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DevBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
