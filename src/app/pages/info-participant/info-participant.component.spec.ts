import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoParticipantComponent } from './info-participant.component';

describe('InfoParticipantComponent', () => {
  let component: InfoParticipantComponent;
  let fixture: ComponentFixture<InfoParticipantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoParticipantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoParticipantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
