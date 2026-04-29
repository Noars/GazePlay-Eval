import { Component, OnInit, OnDestroy } from '@angular/core';
import { Offcanvas } from 'bootstrap';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LoadZipService } from '../../services/load-zip/load-zip.service';
import { LoadService} from '../../services/load/load.service';
import { PopupImportSaveComponent } from '../popup-import-save/popup-import-save.component';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit, OnDestroy {

  // Stocke l'instance du menu latéral
  private offcanvasInstance!: Offcanvas;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private loadServiceZip: LoadZipService,
    private autoSaveService: AutoSaveService,
    private loadService: LoadService,
    private overwriteGuard: OverwriteGuardService
  ) {}

  // Executé dans le component est créé
  ngOnInit(): void {
    const offcanvasEl = document.getElementById('menu')!;

    // créé l'élement ou le récupère (donc pas de doublon)
    this.offcanvasInstance = Offcanvas.getOrCreateInstance(offcanvasEl, {
      backdrop: true,
      scroll: false
    });

    // mise en écoute de l'événement du canvas dissimulé pour pouvoir le supprimer
    offcanvasEl.addEventListener('hide.bs.offcanvas', () => {
      this.removeElement();
    });
  }

  // Executé quand le component est détruit
  ngOnDestroy(): void {
    this.offcanvasInstance?.dispose();
  }

  /**
   * Ferme le menu latéral et supprime le backdrop gris en fond.
   */
  private closeMenu(): void {
    const offcanvasEl = document.getElementById('menu');
    if (!offcanvasEl) return;

    const instance = Offcanvas.getInstance(offcanvasEl);
    instance?.hide();

    this.removeElement();
  }

  /**
   * Supprime le backdrop gris derrière le menu afin d'éviter qu'il reste si on clique ailleurs sur la page.
   */
  private removeElement(): void {
    document.querySelectorAll('.offcanvas-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open', 'offcanvas-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }

  goToSauvegarde() {
    this.closeMenu();
    this.router.navigate(['/sauvegarde']);
  }

  goToLoadSave() {
    this.closeMenu();
    this.router.navigate(['/load-save']);
  }

  goToGuide() {
    this.closeMenu();
    this.router.navigate(['/no-page']);
  }

  goToOptions() {
    this.closeMenu();
    this.router.navigate(['/no-page']);
  }

  /**
   * Ouvre la pop-up pour importer un fichier ZIP dans le site.
   */
  openImportPopup() {
    const dialogRef = this.dialog.open(PopupImportSaveComponent, {
      data: {
        slots: [
          { index: 1, name: this.loadService.getSlot(1)?.nomEval, empty: this.loadService.getSlot(1) === null },
          { index: 2, name: this.loadService.getSlot(2)?.nomEval, empty: this.loadService.getSlot(2) === null },
          { index: 3, name: this.loadService.getSlot(3)?.nomEval, empty: this.loadService.getSlot(3) === null },
        ]
      },
      disableClose: true // empêche l'utilisateur de cliquer hors de la popup
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return; // annulation de l'import

      if (!await this.overwriteGuard.check(0)) return; // Si l'import correspond à un slot

      if (result.mode === 'save') {
        if (!await this.overwriteGuard.check(result.slotIndex as FormatTypeConfig)) return;
        await this.loadServiceZip.loadZipToSlot(result.zipFile, result.slotIndex as FormatTypeConfig);
      } else {
        await this.loadServiceZip.loadZip(result.zipFile);
      }

      this.autoSaveService.tryResume(); // Enmène l'utilisateur au step enregistré
    });
  }
}
