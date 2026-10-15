import {inject, Injectable, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {PopupImportSaveComponent} from '../../components/popup-import-save/popup-import-save.component';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {LoadService} from '../load/load.service';
import {LoadZipService} from '../load-zip/load-zip.service';
import {SaveService} from '../save/save.service';
import {OverwriteGuardService} from '../overwrite-guard/overwrite-guard.service';
import {AutoSaveService} from '../auto-save/auto-save.service';
import {FlashService} from '../flash-message/flash.service';
import {I18nService} from '../../core/i18n/i18n.service';
import {SlotReservation} from '../../core/tab/tab-session.service';

/** Résultat renvoyé par la fenêtre d'import. */
export interface ImportDialogResult {
  zipFile: File;
  slotIndex: number | null;
  mode: 'consult' | 'save';
}

/**
 * Parcours complet d'import d'une archive `.gpSave` / `.zip` :
 *  1. fenêtre de choix (fichier, mode, emplacement) ;
 *  2. protection de l'évaluation en cours et de l'emplacement cible (OverwriteGuard) ;
 *  3. import (LoadZipService) puis reprise de l'évaluation importée.
 *
 * Utilisé par le menu et par la page « Guide · Importation » (auparavant dupliqué).
 */
@Injectable({providedIn: 'root'})
export class ImportFlowService {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly loadService = inject(LoadService);
  private readonly loadZipService = inject(LoadZipService);
  private readonly saveService = inject(SaveService);
  private readonly overwriteGuard = inject(OverwriteGuardService);
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly flashService = inject(FlashService);
  private readonly i18n = inject(I18nService);

  /** Vrai pendant la lecture de l'archive (affichage d'un indicateur de chargement). */
  readonly importing = signal(false);

  /**
   * Ouvre la fenêtre d'import et réalise l'import choisi.
   * @returns `true` si une évaluation a été importée.
   */
  async start(): Promise<boolean> {
    const result = await firstValueFrom(
      this.dialog.open<PopupImportSaveComponent, unknown, ImportDialogResult | null>(PopupImportSaveComponent, {
        data: {slots: this.describeSlots()},
        disableClose: true,
        panelClass: ['gp-dialog-panel', 'gp-dialog-panel--wide'],
        autoFocus: 'first-tabbable',
        ariaLabelledBy: 'import-title',
      }).afterClosed()
    );
    if (!result) return false;

    // Emplacement cible ouvert dans un autre onglet : ouverture sans enregistrement proposée.
    let reservation: SlotReservation | null = null;
    let mode = result.mode;
    if (mode === 'save' && result.slotIndex !== null) {
      const reserved = await this.overwriteGuard.reserveForImport(result.slotIndex as FormatTypeConfig);
      if (reserved === null) return false;
      if (reserved === 'open') mode = 'consult';
      else reservation = reserved;
    }

    if (!await this.overwriteGuard.check(0)) {
      reservation?.release();
      return false;
    }

    this.importing.set(true);
    try {
      if (mode === 'save' && result.slotIndex !== null) {
        const slotIndex = result.slotIndex as FormatTypeConfig;
        if (!await this.overwriteGuard.check(slotIndex)) {
          reservation?.release();
          return false;
        }
        await this.loadZipService.loadZipToSlot(result.zipFile, slotIndex);
        const uniqueName = this.overwriteGuard.getUniqueEvalName(this.saveService.dataAuto.nomEval, slotIndex);
        if (uniqueName !== this.saveService.dataAuto.nomEval) {
          this.saveService.dataAuto.nomEval = uniqueName;
          this.saveService.saveToSlot(slotIndex, this.saveService.dataAuto);
          this.saveService.saveToSlot(0, this.saveService.dataAuto);
        }
        this.saveService.setActiveSlot(slotIndex, reservation);
      } else {
        await this.loadZipService.loadZip(result.zipFile);
        this.saveService.setActiveSlot(null);
      }
    } catch (error) {
      reservation?.release();
      console.error('Import impossible :', error);
      this.flashService.show('error', this.i18n.t('import.error'));
      return false;
    } finally {
      this.importing.set(false);
    }

    this.flashService.show('success', this.i18n.t('import.success', {name: this.saveService.getEvalName()}));
    await this.router.navigate(['/home']);
    this.autoSaveService.tryResume(true);
    return true;
  }

  private describeSlots() {
    return ([1, 2, 3] as FormatTypeConfig[]).map(index => {
      const slot = this.loadService.getSlot(index);
      return {index, name: slot?.nomEval ?? '', empty: slot === null};
    });
  }
}
