import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupDeleteSave } from './popup-delete-save.component';

describe('PopupDeleteSave', () => {
  let component: PopupDeleteSave;
  let fixture: ComponentFixture<PopupDeleteSave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupDeleteSave]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupDeleteSave);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
