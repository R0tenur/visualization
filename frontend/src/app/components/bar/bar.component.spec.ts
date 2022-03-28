import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppTestingModule } from '../../app-testing.module';

import { BarComponent } from './bar.component';

describe('BarComponent', () => {
  let component: BarComponent;
  let fixture: ComponentFixture<BarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTestingModule],
      declarations: [BarComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(BarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('should navigate to path', () => {
    // Act
    component.navigate('/builder');
    // Assert
    expect(router.navigate).toHaveBeenCalledWith(['/builder']);
  });
});
