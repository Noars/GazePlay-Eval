import {Component, inject, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {PopupDeleteSaveComponent} from '../../components/popup-delete-save/popup-delete-save.component';
import {LoadService} from '../../services/load/load.service';
import {SaveService} from '../../services/save/save.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {Router} from '@angular/router';
import {DatePipe} from '@angular/common';
import {DownloadService} from '../../services/download/download.service';
import {isEmptyEvaluation, OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {I18nService} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

type Slot = { index: FormatTypeConfig; data: saveModel | null };

/**
 * Gestion des trois emplacements de sauvegarde : enregistrer l'évaluation en cours,
 * la remplacer, l'ouvrir, la télécharger (`.gpSave`) ou la supprimer.
 */
@Component({
  selector: 'app-sauvegarde',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './sauvegarde.component.html',
  styleUrl: './sauvegarde.component.css'
})
export class SauvegardeComponent implements OnInit {

  slots: Slot[] = [];
  hasUnsavedEval: boolean = false;
  evalInProgress: boolean | undefined;
  autoSave: saveModel | null = null;
  private readonly i18n = inject(I18nService);

  constructor(
    private dialog: MatDialog,
    private loadService: LoadService,
    public saveService: SaveService,
    private autoSaveService: AutoSaveService,
    private flashMessageService: FlashService,
    public router: Router,
    private downloadService: DownloadService,
    private overwriteGuard: OverwriteGuardService,
    private mediaCleanup: MediaCleanupService,
    private confirmService: ConfirmService,
  ) {}

  /**
   * Charge les données dans les slots
   */
  ngOnInit(): void {
    this.refresh();
    if (this.hasUnsavedEval) {
      this.flashMessageService.show('warning', this.i18n.t('saves.unsavedWarning'));
    }
  }

  /** Relit les emplacements depuis le stockage local. */
  refresh(): void {
    this.autoSave = this.loadService.getSlot(0);
    this.evalInProgress = this.autoSave !== null;
    this.slots = ([1, 2, 3] as FormatTypeConfig[]).map(i => ({
      index: i,
      data: this.loadService.getSlot(i)
    }));

    // « En lieu sûr » : liée à un emplacement, ou identique au contenu de l'un d'eux
    // (un emplacement homonyme mais différent ne compte pas).
    if (this.autoSave !== null && !isEmptyEvaluation(this.autoSave)) {
      const linked = this.saveService.activeSlotIndex !== null
        && this.slots.some(s => s.index === this.saveService.activeSlotIndex && s.data !== null);
      this.hasUnsavedEval = !linked && this.overwriteGuard.findSlotHolding(this.autoSave) === null;
    } else {
      this.hasUnsavedEval = false;
    }
  }

  /**
   * Charge le slot correspondant à l'index donné dans le slot dynamique pour pouvoir le modifier.
   * @param index l'index du slot sélectionné (1, 2, 3).
   */
  async editSlot(index: FormatTypeConfig): Promise<void> {
    if (!this.loadService.getSlot(index)) return;

    // Emplacement ouvert dans un autre onglet : copie non liée proposée (ou annulation).
    const opening = await this.overwriteGuard.reserveForOpening(index);
    if (!opening) return;
    const reservation = opening.mode === 'link' ? opening.reservation : null;

    if (!await this.overwriteGuard.check(0)) {
      reservation?.release();
      return;
    }
    // relu après la vérification : l'évaluation en cours vient peut-être d'y être reportée
    const save = this.loadService.getSlot(index);
    if (!save) {
      reservation?.release();
      return;
    }

    const step = save.step >= 0 ? save.step : 3;
    this.saveService.loadIntoWorkspace(save, step);
    this.saveService.setActiveSlot(reservation ? index : null, reservation);
    this.saveService.saveToSlot(0, this.saveService.dataAuto); // Sauvegarde dans le slot dynamique
    this.autoSaveService.tryResume(true);
  }

  /**
   * Enregistre l'évaluation en cours (ou `dataToSave`) dans un emplacement, avec un nom
   * unique parmi les emplacements nommés, puis lie l'évaluation en cours à cet emplacement :
   * ses modifications suivantes y seront reportées automatiquement.
   */
  async saveToSlot(slot: Slot, dataToSave?: Omit<saveModel, 'createdAt' | 'version'>): Promise<void> {
    // Un emplacement modifié dans un autre onglet ne peut pas recevoir l'évaluation de celui-ci.
    const reservation = await this.overwriteGuard.reserveForWriting(slot.index);
    if (!reservation) return;
    if (slot.data !== null) {
      if (!await this.overwriteGuard.check(slot.index, {replacingWithCurrent: true})) {
        reservation.release();
        return;
      }
    }

    // on lit depuis le slot dynamique si pas de données passées
    const autoSave = this.loadService.getSlot(0);
    const data = dataToSave ?? autoSave ?? this.saveService.dataAuto;

    const uniqueName = this.overwriteGuard.getUniqueEvalName(data.nomEval, slot.index);
    const renamed = uniqueName !== data.nomEval;
    if (renamed) {
      data.nomEval = uniqueName;
    }

    try {
      this.saveService.saveToSlot(slot.index, data);
      if (renamed) {
        // l'évaluation en cours prend le même nom, sinon le prochain report le défairait
        this.saveService.saveToSlot(0, data);
        if (this.saveService.hasLoadedWorkspace) this.saveService.dataAuto.nomEval = uniqueName;
      }
      this.saveService.setActiveSlot(slot.index, reservation);
    } catch (error) {
      reservation.release();
      console.error('Sauvegarde impossible :', error);
      this.flashMessageService.show('error', this.i18n.t('saves.saveError'));
      return;
    }
    this.flashMessageService.show('success', this.i18n.t('saves.saveSuccess'));
    this.refresh();
  }

  /**
   * Génère et télécharge un fichier `.gpSave` du slot via le *DownloadService*.
   * @param slot le slot désiré (1, 2, 3).
   */
  async downloadSlot(slot: Slot): Promise<void> {
    if (!slot.data) {
      this.flashMessageService.show('error', this.i18n.t('saves.downloadEmpty'));
      return;
    }
    const ok = await this.downloadService.generateSlotZip(slot.data);
    if (ok === false) {
      this.flashMessageService.show('error', this.i18n.t('saves.downloadError'));
    } else {
      this.flashMessageService.show('info', this.i18n.t('saves.downloaded'));
    }
  }

  /**
   * Affiche la fenêtre de suppression d'une sauvegarde. Les médias de l'évaluation ne sont
   * supprimés que s'ils ne sont plus utilisés par aucune autre sauvegarde.
   * @param slot contient l'index du slot et sa donnée.
   */
  async openDeletePopup(slot: Slot): Promise<void> {
    // Supprimer un emplacement modifié dans un autre onglet : refusé (l'autre onglet le recréerait).
    if (!await this.overwriteGuard.ensureNotOpenElsewhere(slot.index)) return;
    const dialogRef = this.dialog.open(PopupDeleteSaveComponent, {
      data: {slotName: slot.data?.nomEval || this.i18n.t('saves.slot', {n: slot.index})},
      disableClose: true,
      panelClass: 'gp-dialog-panel',
      autoFocus: '.js-cancel',
      ariaLabelledBy: 'delete-title',
      ariaDescribedBy: 'delete-message',
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result === 'delete') {
        const slotName = this.loadService.getSlot(slot.index)?.nomEval ?? '';
        this.saveService.clearSlot(slot.index);
        this.refresh();
        this.flashMessageService.show('success', this.i18n.t('saves.deleted'));
        try {
          await this.mediaCleanup.cleanupProject(slotName);
        } catch (error) {
          console.warn('Nettoyage des médias ignoré :', error);
        }
      }
      if (result === 'download' && slot.data) {
        await this.downloadSlot(slot);
      }
    });
  }

  /**
   * Vérifie qu'on ne va pas écraser le slot dynamique, puis renvoie vers la création d'évaluation.
   */
  async newEval(): Promise<void> {
    if (!await this.overwriteGuard.check(0)) return;
    this.saveService.newSaveDataAuto();
    this.router.navigate(['/info-eval']);
  }

  /**
   * Supprime le contenu de la sauvegarde automatique (évaluation en cours), après confirmation.
   * Les emplacements nommés ne sont pas touchés.
   */
  async deleteAutoSave(): Promise<void> {
    if (!this.evalInProgress) return;
    const confirmed = await this.confirmService.confirm({
      title: this.i18n.t('saves.discard.title'),
      message: [
        this.i18n.t('saves.discard.message1'),
        this.i18n.t('saves.discard.message2'),
      ],
      confirmLabel: this.i18n.t('saves.discard.confirm'),
      tone: 'danger',
    });
    if (!confirmed) return;

    this.saveService.clearSlot(0);
    this.saveService.setActiveSlot(null);
    this.flashMessageService.show('success', this.i18n.t('saves.discarded'));
    this.refresh();
  }
}
