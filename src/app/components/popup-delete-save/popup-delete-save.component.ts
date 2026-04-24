import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

/**
 * Popup de confirmation avant suppression d'une sauvegarde.
 * Propose à l'utilisateur de télécharger l'évaluation avant de la supprimer définitivement.
 *
 * Valeurs de fermeture possibles :
 *   'download' — l'utilisateur veut télécharger avant de supprimer
 *   'delete'   — l'utilisateur confirme la suppression sans télécharger
 *   null       — l'utilisateur a annulé, aucune action à effectuer
 */
@Component({
  selector: 'app-popup-delete-save',
  templateUrl: './popup-delete-save.component.html',
  styleUrl: './popup-delete-save.component.css',
  standalone: true,
  imports: []
})
export class PopupDeleteSaveComponent {

  constructor(
    public dialogRef: MatDialogRef<PopupDeleteSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { slotName: string } // nom de l'évaluation à supprimer
  ) {}

  /** L'utilisateur souhaite télécharger l'évaluation avant suppression. */
  download() {
    this.dialogRef.close('download');
  }

  /** L'utilisateur annule : aucune suppression effectuée. */
  cancel() {
    this.dialogRef.close(null);
  }

  /** L'utilisateur confirme la suppression définitive sans télécharger. */
  delete() {
    this.dialogRef.close('delete');
  }
}
