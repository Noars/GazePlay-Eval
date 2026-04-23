import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveAutomaticComponent } from './save-automatic.component';

describe('SaveAutomaticComponent', () => {
  let component: SaveAutomaticComponent;
  let fixture: ComponentFixture<SaveAutomaticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveAutomaticComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveAutomaticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
