import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PopupDeleteSaveComponent } from './popup-delete-save.component';
import type { Mocked } from 'vitest';
import { createSpyObj } from '../../testing/spy-obj';

describe('PopupDeleteSaveComponent', () => {
  let component: PopupDeleteSaveComponent;
  let fixture: ComponentFixture<PopupDeleteSaveComponent>;
  let dialogRefSpy: Mocked<MatDialogRef<PopupDeleteSaveComponent>>;

  beforeEach(async () => {
    dialogRefSpy = createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [PopupDeleteSaveComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { slotName: 'TestSlot' } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PopupDeleteSaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Cas 1 ────────────────────────────────────────────────────────────────────
  // Le composant doit être instancié avec les tokens Angular Material injectés :
  // MatDialogRef (pour fermer la boîte de dialogue) et MAT_DIALOG_DATA
  // (pour afficher le nom de la sauvegarde concernée).
  it('devrait être créé avec MatDialogRef et MAT_DIALOG_DATA correctement injectés', () => {
    expect(component).toBeTruthy();
    expect(component.dialogRef).toBe(dialogRefSpy);
    expect(component.data.slotName).toBe('TestSlot');
  });

  // ── Cas 2 ────────────────────────────────────────────────────────────────────
  // download() correspond au choix "télécharger avant de supprimer" :
  // la dialog doit se fermer avec la valeur 'download'.
  it('download() → appelle dialogRef.close(\'download\')', () => {
    component.download();

    expect(dialogRefSpy.close).toHaveBeenCalledExactlyOnceWith('download');
  });

  // ── Cas 3 ────────────────────────────────────────────────────────────────────
  // delete() correspond au choix "supprimer sans télécharger" :
  // la dialog doit se fermer avec la valeur 'delete'.
  it('delete() → appelle dialogRef.close(\'delete\')', () => {
    component.delete();

    expect(dialogRefSpy.close).toHaveBeenCalledExactlyOnceWith('delete');
  });

  // ── Cas 4 ────────────────────────────────────────────────────────────────────
  // cancel() correspond à l'annulation : aucune action n'est effectuée.
  // La dialog doit se fermer avec null pour signaler l'absence d'action.
  it('cancel() → appelle dialogRef.close(null)', () => {
    component.cancel();

    expect(dialogRefSpy.close).toHaveBeenCalledExactlyOnceWith(null);
  });
});
