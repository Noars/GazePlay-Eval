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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
