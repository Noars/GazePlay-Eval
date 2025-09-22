import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DownloadEvalComponent } from './download-eval.component';

describe('DownloadEvalComponent', () => {
  let component: DownloadEvalComponent;
  let fixture: ComponentFixture<DownloadEvalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DownloadEvalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DownloadEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
