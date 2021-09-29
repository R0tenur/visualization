import { TestBed } from '@angular/core/testing';

import { FakeDbService } from './fake-db.service';

describe('FakeDbService', () => {
  let service: FakeDbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FakeDbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
