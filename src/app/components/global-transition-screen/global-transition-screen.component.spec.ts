import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalTransitionScreenComponent } from './global-transition-screen.component';

describe('GlobalTransitionScreenComponent', () => {
  let component: GlobalTransitionScreenComponent;
  let fixture: ComponentFixture<GlobalTransitionScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalTransitionScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalTransitionScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
