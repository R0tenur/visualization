import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppTestingModule } from '../../app-testing.module';

import { RelationComponent } from './relation.component';

describe('RelationComponent', () => {
  let component: RelationComponent;
  let fixture: ComponentFixture<RelationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RelationComponent], imports: [AppTestingModule]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RelationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
