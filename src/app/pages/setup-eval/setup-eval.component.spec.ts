import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupEvalComponent } from './setup-eval.component';

describe('SetupEvalComponent', () => {
  let component: SetupEvalComponent;
  let fixture: ComponentFixture<SetupEvalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupEvalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetupEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
