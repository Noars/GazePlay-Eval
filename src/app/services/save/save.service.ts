import {inject, Injectable} from '@angular/core';
import {formatTypeModel, saveModel, saveModelDefault} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_LIST} from '../../shared/dataBaseConfig';
import {screenTypeModel} from '../../shared/screenModel';
import {SlotReservation, TabSessionService} from '../../core/tab/tab-session.service';

/** Évaluation de travail (sans les métadonnées ajoutées à l'écriture). */
export type WorkingEval = Omit<saveModel, 'createdAt' | 'version'>;

/**
 * État de l'évaluation en cours et écriture des sauvegardes.
 *
 * - `dataAuto` : évaluation de travail, partagée par toutes les pages de l'onglet ;
 * - slot 0 : évaluation en cours **de cet onglet** (`TabSessionService`, sessionStorage), publiée
 *   aussi dans `saveAuto` (localStorage) comme dernière évaluation en cours ;
 * - slots 1-3 (`save1`…`save3`, localStorage) : sauvegardes nommées, partagées par les onglets ;
 * - `activeSlotIndex` : emplacement lié à l'évaluation de cet onglet.
 *
 * Le format JSON des sauvegardes (`shared/saveModel.ts`) est inchangé.
 */
@Injectable({
  providedIn: 'root'
})
export class SaveService {

  defaultEvalName: string = "Nouvelle Evaluation";

  private readonly tab = inject(TabSessionService);

  /** Emplacement nommé (1-3) lié à l'évaluation de cet onglet, ou `null`. */
  get activeSlotIndex(): FormatTypeConfig | null {
    return this.tab.slot;
  }

  /** Équivaut à `setActiveSlot` (sans réservation préalable). */
  set activeSlotIndex(slotIndex: FormatTypeConfig | null) {
    this.setActiveSlot(slotIndex);
  }

  /**
   * Vrai dès que `dataAuto` contient réellement l'évaluation en cours (onglet repris, nouvelle
   * évaluation, ouverture ou import). Sinon, `dataAuto` n'est qu'un modèle vide : il ne doit
   * alors jamais être recopié dans un emplacement.
   */
  private workspaceLoaded = false;

  dataAuto: WorkingEval = {
    nomEval: '',
    format: 'Csv&Xlsx',
    infoParticipant: [],
    globalParamsTransitionScreen: [],
    globalParamsInstructionScreen: [],
    globalParamsStimuliScreen: [],
    listScreens: [],
    step: 0
  };

  constructor() {
    this.tab.ensureInitialized();
    // L'onglet a déjà son évaluation (rechargement, doublon, ou reprise au démarrage) : elle est
    // chargée tout de suite, même si l'on arrive directement sur une étape.
    if (this.tab.working) {
      this.loadIntoWorkspace(structuredClone(this.tab.working));
    }
  }

  /** Vrai si l'évaluation de travail a été chargée ou créée dans cette page. */
  get hasLoadedWorkspace(): boolean {
    return this.workspaceLoaded;
  }

  newSaveDataAuto(){
    this.dataAuto = structuredClone(saveModelDefault);
    this.workspaceLoaded = true;
    this.setActiveSlot(null);
    this.saveToSlot(0, this.dataAuto);
  }

  saveDataAuto(nomEval: string,
               format: formatTypeModel,
               infoParticipant: string[],
               globalParamsTransitionScreen: any[],
               globalParamsInstructionScreen: any[],
               globalParamsStimuliScreen: string[],
               listScreens: screenTypeModel[],
               step: number){
    this.dataAuto = {
      nomEval: nomEval,
      format: format,
      infoParticipant: infoParticipant,
      globalParamsTransitionScreen: globalParamsTransitionScreen,
      globalParamsInstructionScreen: globalParamsInstructionScreen,
      globalParamsStimuliScreen: globalParamsStimuliScreen,
      listScreens: listScreens,
      step: step
    };
    this.workspaceLoaded = true;
    this.saveToSlot(0, this.dataAuto);
  }

  /**
   * Remplace l'évaluation de travail par le contenu d'une sauvegarde.
   * @param save sauvegarde lue depuis un emplacement.
   * @param step étape à enregistrer (par défaut celle de la sauvegarde).
   */
  loadIntoWorkspace(save: saveModel, step: number = save.step): void {
    this.dataAuto = {
      nomEval: save.nomEval,
      format: save.format,
      infoParticipant: save.infoParticipant,
      globalParamsTransitionScreen: save.globalParamsTransitionScreen,
      globalParamsInstructionScreen: save.globalParamsInstructionScreen,
      globalParamsStimuliScreen: save.globalParamsStimuliScreen,
      listScreens: save.listScreens,
      step
    };
    this.workspaceLoaded = true;
  }

  /**
   * Écrit une sauvegarde : slot 0 = évaluation en cours de l'onglet, 1-3 = emplacements nommés.
   * @throws si le stockage est plein ou indisponible (l'appelant affiche l'erreur).
   */
  saveToSlot(slotIndex: FormatTypeConfig, data:any): void {
    const saveData: saveModel = {
      ...data,
      createdAt: new Date().toISOString(),
      version: 1
    };
    if (slotIndex === 0) {
      this.tab.writeWorking(saveData);
      return;
    }
    localStorage.setItem(SAVE_SLOT_LIST[slotIndex], JSON.stringify(saveData));
  }

  clearSlot(slotIndex: FormatTypeConfig): void {
    if (slotIndex === 0) {
      this.tab.clearWorking();
      return;
    }
    localStorage.removeItem(SAVE_SLOT_LIST[slotIndex]);
    if (this.activeSlotIndex === slotIndex) {
      this.setActiveSlot(null);
    }
  }

  /**
   * Lie (ou délie avec `null`) l'évaluation de cet onglet à un emplacement nommé, en adoptant
   * la réservation obtenue au préalable avec `reserveSlot`.
   */
  setActiveSlot(slotIndex: FormatTypeConfig | null, reservation?: SlotReservation | null): void {
    this.tab.setSlot(slotIndex, reservation);
  }

  /**
   * Réserve un emplacement pour cet onglet avant de le lier, sans toucher au lien actuel.
   * `null` si un autre onglet ouvert est en train de le modifier.
   */
  reserveSlot(slotIndex: FormatTypeConfig): Promise<SlotReservation | null> {
    return this.tab.reserveSlot(slotIndex);
  }

  /** Vrai si un autre onglet ouvert modifie actuellement cet emplacement. */
  isSlotOpenElsewhere(slotIndex: FormatTypeConfig): Promise<boolean> {
    return this.tab.isSlotOpenElsewhere(slotIndex);
  }

  getEvalName(){
    if(this.dataAuto.nomEval != ''){
      return this.dataAuto.nomEval;
    }else {
      return this.defaultEvalName;
    }
  }
}
