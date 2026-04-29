import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { PopupDeleteSaveComponent } from '../../components/popup-delete-save/popup-delete-save.component';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import { FormatTypeConfig } from '../../shared/dataBaseConfig';
import { Router } from '@angular/router';
import {DatePipe} from '@angular/common';
import {DownloadService} from '../../services/download/download.service';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';

@Component({
  selector: 'app-sauvegarde',
  imports: [MatTooltip, DatePipe],
  templateUrl: './sauvegarde.component.html',
  styleUrl: './sauvegarde.component.css'
})
export class SauvegardeComponent implements OnInit {

  slots: { index: FormatTypeConfig; data: saveModel | null }[] = [];
  selectedSlot: FormatTypeConfig | null = null;
  hasUnsavedEval: boolean = false;

  constructor(
    private dialog: MatDialog,
    private loadService: LoadService,
    public saveService: SaveService,
    private autoSaveService: AutoSaveService,
    public router: Router,
    private downloadService: DownloadService,
    private overwriteGuard: OverwriteGuardService
  ) {}

  ngOnInit(): void {
    this.slots = ([1, 2, 3] as FormatTypeConfig[]).map(i => ({
      index: i,
      data: this.loadService.getSlot(i) // récupération des données dans les différents slots
    }));

    const autoSave = this.loadService.getSlot(0);
    this.hasUnsavedEval = autoSave !== null && autoSave.nomEval !== '';
  }

  /**
   * Sélectionne ou désélectionne un slot au clic de l'utilisateur, selon l'index donné.
   * @param index l'index du slot sélectionné (0, 1, 2, 3).
   */
  selectSlot(index: FormatTypeConfig): void {
    if (this.slots.find(s => s.index === index)?.data === null) return;
    this.selectedSlot = this.selectedSlot === index ? null : index; // toggle
  }

  /**
   * Charge le slot correspondant à l'index donné dans le slot dynamique pour pouvoir le modifier.
   * @param index l'index du slot sélectionné (0, 1, 2, 3).
   */
  async editSlot(index: FormatTypeConfig): Promise<void> {
    const save = this.loadService.getSlot(index);
    if (!save) return;

    if (!await this.overwriteGuard.check(0, save.nomEval)) return;

    const step = save.step >= 0 ? save.step : 3;
    this.saveService.dataAuto = {
      nomEval: save.nomEval,
      format: save.format,
      infoParticipant: save.infoParticipant,
      globalParamsTransitionScreen: save.globalParamsTransitionScreen,
      globalParamsInstructionScreen: save.globalParamsInstructionScreen,
      globalParamsStimuliScreen: save.globalParamsStimuliScreen,
      listScreens: save.listScreens,
      step: step
    };
    this.saveService.activeSlotIndex = index;
    this.saveService.saveToSlot(0, this.saveService.dataAuto); // Sauvegarde dans le slot dynamique
    this.autoSaveService.tryResume();
  }

  async saveToSlot(
    slot: { index: FormatTypeConfig; data: saveModel | null },
    dataToSave?: Omit<saveModel, 'createdAt' | 'version'>
  ): Promise<void> {
    if (slot.data !== null) {
      if (!await this.overwriteGuard.check(slot.index, slot.data.nomEval)) return;
    }

    const autoSave = this.loadService.getSlot(0);
    const data = dataToSave ?? autoSave ?? this.saveService.dataAuto;

    const uniqueName = this.getUniqueEvalName(data.nomEval, slot.index);
    if (uniqueName !== data.nomEval) {
      data.nomEval = uniqueName;
    }

    this.saveService.saveToSlot(slot.index, data);
    this.ngOnInit();
  }

  /**
   * Retourne un nom d'évaluation unique parmi les slots nommés (1, 2, 3).
   * Si le nom existe déjà dans un autre slot, ajoute " 1", " 2", etc. jusqu'à trouver un nom libre.
   * @param nomEval le nom initial de l'évaluation.
   * @param targetSlotIndex l'index du slot de destination (exclu de la vérification).
   */
  private getUniqueEvalName(nomEval: string, targetSlotIndex: FormatTypeConfig): string {
    const existingNames = new Set<string>();
    for (const i of [1, 2, 3] as FormatTypeConfig[]) {
      if (i === targetSlotIndex) continue;
      const slot = this.loadService.getSlot(i);
      if (slot?.nomEval) existingNames.add(slot.nomEval);
    }

    if (!existingNames.has(nomEval)) return nomEval;

    let counter = 1;
    while (existingNames.has(`${nomEval} ${counter}`)) counter++;
    return `${nomEval} ${counter}`;
  }

  getSlotAuto() {
    return this.loadService.getSlot(0);
  }

  /**
   * Génère et télécharge un fichier ZIP du slot via le *DownloadService*.
   * @param slot le slot désiré (1, 2, 3).
   */
  downloadSlot(slot: { index: FormatTypeConfig; data: saveModel | null }): void {
    console.log('[downloadSlot] slot:', slot);
    if (!slot.data) return; // Si le slot est vide
    this.downloadService.generateSlotZip(slot.data);
  }

  /**
   * Affiche la popup de suppression de sauvegarde.
   * @param slot contient l'index du slot et sa donnée.
   */
  openDeletePopup(slot: { index: FormatTypeConfig; data: saveModel | null }): void {
    const dialogRef = this.dialog.open(PopupDeleteSaveComponent, {
      data: { slotName: slot.data?.nomEval ?? `Slot ${slot.index}` },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.saveService.clearSlot(slot.index); // suppresion des données dans le slot de l'index
        this.ngOnInit(); // rafraîchit les slots
        this.selectedSlot = null; // le slot est désélectionné.
      }
      if (result === 'download' && slot.data) {
        this.downloadService.generateSlotZip(slot.data);
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
   * Sauvegarde l'évaluation actuelle dans le slot dynamique.
   */
  saveLastEval(): void {
    this.saveService.saveToSlot(0, this.saveService.dataAuto);
  }
}
