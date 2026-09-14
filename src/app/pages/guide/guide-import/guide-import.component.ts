import {Router, RouterLink} from '@angular/router';
import {Component} from '@angular/core';
import {PopupImportSaveComponent} from '../../../components/popup-import-save/popup-import-save.component';
import {FormatTypeConfig} from '../../../shared/dataBaseConfig';
import {LoadService} from '../../../services/load/load.service';
import {MatDialog} from '@angular/material/dialog';
import {LoadZipService} from '../../../services/load-zip/load-zip.service';
import {AutoSaveService} from '../../../services/auto-save/auto-save.service';
import {SaveService} from '../../../services/save/save.service';
import {OverwriteGuardService} from '../../../services/overwrite-guard/overwrite-guard.service';

@Component({
  selector: 'app-guide-import',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './guide-import.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideImportComponent {
  constructor(
    private dialog: MatDialog,
    private loadServiceZip: LoadZipService,
    private autoSaveService: AutoSaveService,
    private loadService: LoadService,
    private saveService: SaveService,
    private overwriteGuard: OverwriteGuardService,
  ) {}

  /**
   * Redirige l'utilisateur vers la page d'accueil pour qu'il puisse
   * accéder au menu latéral et à la pop-up d'importation.
   */
  openImportPopup() {
    const dialogRef = this.dialog.open(PopupImportSaveComponent, {
      data: {
        slots: [
          {index: 1, name: this.loadService.getSlot(1)?.nomEval, empty: this.loadService.getSlot(1) === null},
          {index: 2, name: this.loadService.getSlot(2)?.nomEval, empty: this.loadService.getSlot(2) === null},
          {index: 3, name: this.loadService.getSlot(3)?.nomEval, empty: this.loadService.getSlot(3) === null},
        ]
      },
      disableClose: true, // empêche l'utilisateur de cliquer hors de la popup
      panelClass: 'scrollable-dialog' // classe custom pour laisser le scroll
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return; // annulation de l'import

      if (!await this.overwriteGuard.check(0)) return; // Si l'import correspond à un slot

      if (result.mode === 'save') {
        const slotIndex = result.slotIndex as FormatTypeConfig;
        if (!await this.overwriteGuard.check(slotIndex)) return;
        await this.loadServiceZip.loadZipToSlot(result.zipFile, slotIndex);
        const uniqueName = this.overwriteGuard.getUniqueEvalName(this.saveService.dataAuto.nomEval, slotIndex);
        if (uniqueName !== this.saveService.dataAuto.nomEval) {
          this.saveService.dataAuto.nomEval = uniqueName;
          this.saveService.saveToSlot(slotIndex, this.saveService.dataAuto);
          this.saveService.saveToSlot(0, this.saveService.dataAuto);
        }
      } else {
        await this.loadServiceZip.loadZip(result.zipFile);
      }

      this.autoSaveService.tryResume(true);
    });
  }
}
