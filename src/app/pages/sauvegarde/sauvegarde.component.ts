import {Component, OnInit} from '@angular/core';
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
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';

type Slot = { index: FormatTypeConfig; data: saveModel | null };

/**
 * Gestion des trois emplacements de sauvegarde : enregistrer l'évaluation en cours,
 * la remplacer, l'ouvrir, la télécharger (`.gpSave`) ou la supprimer.
 */
@Component({
  selector: 'app-sauvegarde',
  imports: [DatePipe],
  templateUrl: './sauvegarde.component.html',
  styleUrl: './sauvegarde.component.css'
})
export class SauvegardeComponent implements OnInit {

  slots: Slot[] = [];
  hasUnsavedEval: boolean = false;
  evalInProgress: boolean | undefined;
  autoSave: saveModel | null = null;
  tooltipCurrentEval: string = "Vous êtes actuellement en train de modifier cette évaluation. Vos modifications sont sauvegardées dans cet emplacement."

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
      this.flashMessageService.show('warning', 'Vous avez une évaluation qui n\'a pas encore été sauvegardée. Pensez à l\'enregistrer pour ne pas la perdre !');
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

    if (this.autoSave !== null && this.autoSave.nomEval !== '') {
      const alreadySaved = this.slots.some(s => s.data?.nomEval === this.autoSave!.nomEval);
      this.hasUnsavedEval = !alreadySaved;
    } else {
      this.hasUnsavedEval = false;
    }
  }

  /**
   * Charge le slot correspondant à l'index donné dans le slot dynamique pour pouvoir le modifier.
   * @param index l'index du slot sélectionné (1, 2, 3).
   */
  async editSlot(index: FormatTypeConfig): Promise<void> {
    const save = this.loadService.getSlot(index);
    if (!save) return;

    if (!await this.overwriteGuard.check(0, save.nomEval)) return;

    const step = save.step >= 0 ? save.step : 3;
    this.saveService.loadIntoWorkspace(save, step);
    this.saveService.setActiveSlot(index);
    this.saveService.saveToSlot(0, this.saveService.dataAuto); // Sauvegarde dans le slot dynamique
    this.autoSaveService.tryResume(true);
  }

  /**
   * Enregistre l'évaluation en cours (ou `dataToSave`) dans un emplacement, avec un nom
   * unique parmi les emplacements nommés.
   */
  async saveToSlot(slot: Slot, dataToSave?: Omit<saveModel, 'createdAt' | 'version'>): Promise<void> {
    if (slot.data !== null) {
      if (!await this.overwriteGuard.check(slot.index, slot.data.nomEval)) return;
    }

    // on lit depuis le slot dynamique si pas de données passées
    const autoSave = this.loadService.getSlot(0);
    const data = dataToSave ?? autoSave ?? this.saveService.dataAuto;

    const uniqueName = this.overwriteGuard.getUniqueEvalName(data.nomEval, slot.index);
    if (uniqueName !== data.nomEval) {
      data.nomEval = uniqueName;
    }

    try {
      this.saveService.saveToSlot(slot.index, data);
    } catch (error) {
      console.error('Sauvegarde impossible :', error);
      this.flashMessageService.show('error', 'L\'évaluation n\'a pas pu être sauvegardée : le stockage du navigateur est peut-être plein.');
      return;
    }
    this.flashMessageService.show('success', 'Votre évaluation a été sauvegardée avec succès.');
    this.refresh();
  }

  /**
   * Génère et télécharge un fichier `.gpSave` du slot via le *DownloadService*.
   * @param slot le slot désiré (1, 2, 3).
   */
  async downloadSlot(slot: Slot): Promise<void> {
    if (!slot.data) {
      this.flashMessageService.show('error', 'L\'évaluation n\'a pas pu être téléchargée car elle ne contient aucune donnée.');
      return;
    }
    const ok = await this.downloadService.generateSlotZip(slot.data);
    if (ok === false) {
      this.flashMessageService.show('error', 'Le téléchargement de l\'évaluation a échoué.');
    } else {
      this.flashMessageService.show('info', 'L\'évaluation a été téléchargée.');
    }
  }

  /**
   * Affiche la fenêtre de suppression d'une sauvegarde. Les médias de l'évaluation ne sont
   * supprimés que s'ils ne sont plus utilisés par aucune autre sauvegarde.
   * @param slot contient l'index du slot et sa donnée.
   */
  openDeletePopup(slot: Slot): void {
    const dialogRef = this.dialog.open(PopupDeleteSaveComponent, {
      data: {slotName: slot.data?.nomEval || `Emplacement ${slot.index}`},
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
        this.flashMessageService.show('success', 'L\'évaluation a été supprimée avec succès.');
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
      title: 'Abandonner l\'évaluation en cours ?',
      message: [
        'Les modifications qui n\'ont pas été enregistrées dans un emplacement seront définitivement perdues.',
        'Vos emplacements de sauvegarde ne sont pas modifiés.',
      ],
      confirmLabel: 'Abandonner les modifications',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.saveService.clearSlot(0);
    this.saveService.setActiveSlot(null);
    this.flashMessageService.show('success', 'Les dernières modifications ont été supprimées avec succès.');
    this.refresh();
  }
}
