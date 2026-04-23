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

  private offcanvasInstance!: Offcanvas;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private loadServiceZip: LoadZipService,
    private autoSaveService: AutoSaveService,
    private loadService: LoadService,
    private overwriteGuard: OverwriteGuardService
  ) {}

  ngOnInit(): void {
    const offcanvasEl = document.getElementById('menu')!;


    this.offcanvasInstance = Offcanvas.getOrCreateInstance(offcanvasEl, {
      backdrop: true,
      scroll: false
    });

    offcanvasEl.addEventListener('hide.bs.offcanvas', () => {
      this.removeElement();
    });
  }

  ngOnDestroy(): void {
    this.offcanvasInstance?.dispose();
  }

  private closeMenu(): void {
    const offcanvasEl = document.getElementById('menu');
    if (!offcanvasEl) return;

    const instance = Offcanvas.getInstance(offcanvasEl);
    instance?.hide();

    this.removeElement();
  }

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

  openImportPopup() {
    const dialogRef = this.dialog.open(PopupImportSaveComponent, {
      data: {
        slots: [
          { index: 1, name: this.loadService.getSlot(1)?.nomEval, empty: this.loadService.getSlot(1) === null },
          { index: 2, name: this.loadService.getSlot(2)?.nomEval, empty: this.loadService.getSlot(2) === null },
          { index: 3, name: this.loadService.getSlot(3)?.nomEval, empty: this.loadService.getSlot(3) === null },
        ]
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;

      if (!await this.overwriteGuard.check(0)) return;

      if (result.mode === 'save') {
        if (!await this.overwriteGuard.check(result.slotIndex as FormatTypeConfig)) return;
        await this.loadServiceZip.loadZipToSlot(result.zipFile, result.slotIndex as FormatTypeConfig);
      } else {
        await this.loadServiceZip.loadZip(result.zipFile);
      }

      this.autoSaveService.tryResume();
    });
  }
}
