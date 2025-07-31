import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalInstructionScreenComponent } from './global-instruction-screen.component';

describe('GlobalInstructionScreenComponent', () => {
  let component: GlobalInstructionScreenComponent;
  let fixture: ComponentFixture<GlobalInstructionScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalInstructionScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalInstructionScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
