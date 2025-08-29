import { TestBed } from '@angular/core/testing';

import { UpdateScreensService } from './update-screens.service';

describe('UpdateScreensService', () => {
  let service: UpdateScreensService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateScreensService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
