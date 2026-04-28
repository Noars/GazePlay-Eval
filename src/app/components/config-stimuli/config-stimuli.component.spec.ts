import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfigStimuliComponent } from './config-stimuli.component';

describe('ConfigStimuliComponent', () => {
  let component: ConfigStimuliComponent;
  let fixture: ComponentFixture<ConfigStimuliComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfigStimuliComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfigStimuliComponent);
    component = fixture.componentInstance;
    component.data = { cell: 0, screen: { 0: { imageName: '', imageFile: undefined, soundName: '', soundFile: undefined, goodAnswer: false } }, rows: 1, cols: 1 };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
