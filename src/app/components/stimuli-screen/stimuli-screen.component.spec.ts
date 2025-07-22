import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StimuliScreenComponent } from './stimuli-screen.component';

describe('StimuliScreenComponent', () => {
  let component: StimuliScreenComponent;
  let fixture: ComponentFixture<StimuliScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StimuliScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StimuliScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
