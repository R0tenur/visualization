import { TestBed } from '@angular/core/testing';

import { DataStudioService } from './data-studio.service';

describe('DataStudioService', () => {
  let service: DataStudioService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataStudioService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
