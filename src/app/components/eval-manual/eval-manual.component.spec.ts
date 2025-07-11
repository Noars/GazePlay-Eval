import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvalManualComponent } from './eval-manual.component';

describe('EvalManualComponent', () => {
  let component: EvalManualComponent;
  let fixture: ComponentFixture<EvalManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvalManualComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvalManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
