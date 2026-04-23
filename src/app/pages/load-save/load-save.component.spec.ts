import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadSaveComponent } from './load-save.component';

describe('LoadSaveComponent', () => {
  let component: LoadSaveComponent;
  let fixture: ComponentFixture<LoadSaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadSaveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
