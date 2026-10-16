import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PopupImportSaveComponent } from './popup-import-save.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { Mocked } from 'vitest';
import { createSpyObj } from '../../testing/spy-obj';

const SLOTS_DATA = {
  slots: [
    { index: 1, name: 'Slot 1', empty: true },
    { index: 2, name: 'Slot 2', empty: false },
    { index: 3, name: 'Slot 3', empty: true }
  ]
};

describe('PopupImportSaveComponent', () => {
  let component: PopupImportSaveComponent;
  let fixture: ComponentFixture<PopupImportSaveComponent>;
  let dialogRefSpy: Mocked<MatDialogRef<PopupImportSaveComponent>>;

  beforeEach(async () => {
    dialogRefSpy = createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [PopupImportSaveComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: SLOTS_DATA }
      ]
    }).compileComponents();

    fixture   = TestBed.createComponent(PopupImportSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─── Création ─────────────────────────────────────────────────────────────

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('état initial — mode null, zipFile null, isDragging false', () => {
    expect(component.mode).toBeNull();
    expect(component.zipFile).toBeNull();
    expect(component.zipFileName).toBe('');
    expect(component.isDragging).toBe(false);
    expect(component.selectedSlot).toBeNull();
  });

  it('data injectée — slots disponibles', () => {
    expect(component.data.slots.length).toBe(3);
    expect(component.data.slots[0].index).toBe(1);
  });

  // ─── onZipSelected ────────────────────────────────────────────────────────

  it('onZipSelected — fichier sélectionné → zipFile et zipFileName définis', () => {
    const file = new File(['zip'], 'eval.zip', { type: 'application/zip' });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onZipSelected(event);

    expect(component.zipFile).toBe(file);
    expect(component.zipFileName).toBe('eval.zip');
  });

  it('onZipSelected — aucun fichier → zipFile reste null', () => {
    const event = { target: { files: [] } } as unknown as Event;

    component.onZipSelected(event);

    expect(component.zipFile).toBeNull();
  });

  // ─── onDragOver ───────────────────────────────────────────────────────────

  it('onDragOver → isDragging passe à true et preventDefault appelé', () => {
    const event = { preventDefault: vi.fn() } as unknown as DragEvent;

    component.onDragOver(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBe(true);
  });

  // ─── onDragLeave ──────────────────────────────────────────────────────────

  it('onDragLeave → isDragging passe à false et preventDefault appelé', () => {
    component.isDragging = true;
    const event = { preventDefault: vi.fn() } as unknown as DragEvent;

    component.onDragLeave(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBe(false);
  });

  // ─── onDrop ───────────────────────────────────────────────────────────────

  it('onDrop — fichier déposé → isDragging false et zipFile défini', () => {
    const file = new File(['zip'], 'dropped.zip', { type: 'application/zip' });
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [file] }
    } as unknown as DragEvent;

    component.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragging).toBe(false);
    expect(component.zipFile).toBe(file);
    expect(component.zipFileName).toBe('dropped.zip');
  });

  it('onDrop — pas de fichier dans dataTransfer → zipFile reste null', () => {
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [] }
    } as unknown as DragEvent;

    component.onDrop(event);

    expect(component.zipFile).toBeNull();
  });

  it('onDrop — dataTransfer null → zipFile reste null', () => {
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: null
    } as unknown as DragEvent;

    component.onDrop(event);

    expect(component.zipFile).toBeNull();
  });

  // ─── canConfirm ───────────────────────────────────────────────────────────

  it('canConfirm — mode null → false', () => {
    component.mode = null;
    component.zipFile = new File([''], 'f.zip');
    expect(component.canConfirm()).toBe(false);
  });

  it('canConfirm — zipFile null → false', () => {
    component.mode = 'consult';
    component.zipFile = null;
    expect(component.canConfirm()).toBe(false);
  });

  it('canConfirm — mode consult avec fichier → true', () => {
    component.mode = 'consult';
    component.zipFile = new File([''], 'f.zip');
    expect(component.canConfirm()).toBe(true);
  });

  it('canConfirm — mode save avec fichier mais sans slot → false', () => {
    component.mode = 'save';
    component.zipFile = new File([''], 'f.zip');
    component.selectedSlot = null;
    expect(component.canConfirm()).toBe(false);
  });

  it('canConfirm — mode save avec fichier et slot → true', () => {
    component.mode = 'save';
    component.zipFile = new File([''], 'f.zip');
    component.selectedSlot = 1;
    expect(component.canConfirm()).toBe(true);
  });

  // ─── cancel ───────────────────────────────────────────────────────────────

  it('cancel → dialogRef.close(null)', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledExactlyOnceWith(null);
  });

  // ─── confirm ──────────────────────────────────────────────────────────────

  it('confirm — canConfirm false → dialogRef.close non appelé', () => {
    component.mode = null;
    component.confirm();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('confirm — mode consult avec fichier → close avec zipFile, slotIndex null, mode consult', () => {
    const file = new File(['zip'], 'eval.zip');
    component.mode = 'consult';
    component.zipFile = file;
    component.selectedSlot = null;

    component.confirm();

    expect(dialogRefSpy.close).toHaveBeenCalledExactlyOnceWith({
      zipFile: file,
      slotIndex: null,
      mode: 'consult'
    });
  });

  it('confirm — mode save avec fichier et slot → close avec les bonnes données', () => {
    const file = new File(['zip'], 'eval.zip');
    component.mode = 'save';
    component.zipFile = file;
    component.selectedSlot = 2;

    component.confirm();

    expect(dialogRefSpy.close).toHaveBeenCalledExactlyOnceWith({
      zipFile: file,
      slotIndex: 2,
      mode: 'save'
    });
  });
});
