// menu.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LoadZipService } from '../../services/load-zip/load-zip.service';
import { PopupImportSaveComponent } from '../popup-import-save/popup-import-save.component';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private loadService: LoadZipService
  ) {}

  goToSauvegarde() {
    this.router.navigate(['/sauvegarde']);
  }

  goToLoadSave() {
    this.router.navigate(['/load-save']);
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

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;

      await this.loadService.loadZip(result.zipFile);

      if (result.mode === 'save') {
        // TODO: persister dans le slot result.slotIndex
        console.log('Sauvegarde dans le slot :', result.slotIndex);
      }

      this.router.navigate(['/create-eval']);
    });
  }
}