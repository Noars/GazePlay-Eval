import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStimuliScreenComponent } from './global-stimuli-screen.component';

describe('GlobalStimuliScreenComponent', () => {
  let component: GlobalStimuliScreenComponent;
  let fixture: ComponentFixture<GlobalStimuliScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalStimuliScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalStimuliScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
