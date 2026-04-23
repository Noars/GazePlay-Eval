import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupImportSaveComponent } from './popup-import-save.component';

describe('PopupImportSaveComponent', () => {
  let component: PopupImportSaveComponent;
  let fixture: ComponentFixture<PopupImportSaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PopupImportSaveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupImportSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
