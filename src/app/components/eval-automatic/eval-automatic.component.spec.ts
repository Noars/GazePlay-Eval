import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvalAutomaticComponent } from './eval-automatic.component';

describe('EvalAutomaticComponent', () => {
  let component: EvalAutomaticComponent;
  let fixture: ComponentFixture<EvalAutomaticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvalAutomaticComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvalAutomaticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
