import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {DatePipe} from '@angular/common';
import {saveModel} from '../../shared/saveModel';

/**
 * Popup d'avertissement affiché lorsqu'une action est sur le point d'écraser
 * une sauvegarde existante. Donne à l'utilisateur le choix de télécharger
 * la sauvegarde menacée avant de continuer.
 *
 * Valeurs de fermeture possibles :
 *   'download'  — l'utilisateur télécharge la sauvegarde existante puis l'opération continue
 *   'overwrite' — l'utilisateur accepte l'écrasement sans télécharger
 *   null        — l'utilisateur annule, l'opération est abandonnée
 */
@Component({
  selector: 'app-popup-overwrite-save',
  templateUrl: './popup-overwrite-save.component.html',
  styleUrl: './popup-overwrite-save.component.css',
  standalone: true,
  imports: [DatePipe]
})
export class PopupOverwriteSaveComponent {

  constructor(
    public dialogRef: MatDialogRef<PopupOverwriteSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      save: saveModel;    // sauvegarde qui sera écrasée
      slotLabel: string;  // libellé du slot concerné (ex: 'Emplacement 1')
    }
  ) {}

  /** L'utilisateur veut télécharger la sauvegarde existante avant que l'opération continue. */
  download() {
    this.dialogRef.close('download');
  }

  /** L'utilisateur accepte d'écraser la sauvegarde sans la télécharger. */
  overwrite() {
    this.dialogRef.close('overwrite');
  }

  /** L'utilisateur annule : l'opération déclencheuse est abandonnée. */
  cancel() {
    this.dialogRef.close(null);
  }
}
