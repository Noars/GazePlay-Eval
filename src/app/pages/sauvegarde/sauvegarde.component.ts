import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import {PopupDeleteSaveComponent} from '../../components/popup-delete-save/popup-delete-save.component';
import {PopupImportSaveComponent} from '../../components/popup-import-save/popup-import-save.component';

@Component({
  selector: 'app-sauvegarde',
  imports: [
    MatTooltip
  ],
  templateUrl: './sauvegarde.component.html',
  styleUrl: './sauvegarde.component.css'
})
export class SauvegardeComponent {

  constructor(private dialog: MatDialog) {}

  openDeletePopup(slotName: string) {
    const dialogRef = this.dialog.open(PopupDeleteSaveComponent, {
      data: { slotName },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'delete')   { /* supprimer le slot */ }
      if (result === 'download') { /* télécharger avant suppression */ }
    });
  }

  openImportPopup() {
    const dialogRef = this.dialog.open(PopupImportSaveComponent, {
      data: {
        slots: [
          { index: 0, name: 'Slot 1', empty: true },
          { index: 1, name: 'Slot 2', empty: false },
          { index: 2, name: 'Slot 3', empty: true },
        ]
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Fichier zip :', result.zipFile);
        console.log('Slot choisi :', result.slotIndex);
      }
    });
  }
}


