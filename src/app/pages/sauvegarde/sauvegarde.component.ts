import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { PopupDeleteSaveComponent } from '../../components/popup-delete-save/popup-delete-save.component';

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
}