import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyScreenComponent } from './modify-screen.component';

describe('ModifyScreenComponent', () => {
  let component: ModifyScreenComponent;
  let fixture: ComponentFixture<ModifyScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModifyScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModifyScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
