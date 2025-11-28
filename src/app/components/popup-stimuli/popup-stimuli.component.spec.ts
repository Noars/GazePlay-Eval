import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupStimuliComponent } from './popup-stimuli.component';

describe('PopupStimuliComponent', () => {
  let component: PopupStimuliComponent;
  let fixture: ComponentFixture<PopupStimuliComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupStimuliComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupStimuliComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
