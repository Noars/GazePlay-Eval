import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoEvalComponent } from './info-eval.component';

describe('InfoEvalComponent', () => {
  let component: InfoEvalComponent;
  let fixture: ComponentFixture<InfoEvalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoEvalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
