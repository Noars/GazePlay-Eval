import {Injectable} from '@angular/core';
import {formatTypeModel, saveModel, saveModelDefault} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_LIST} from '../../shared/dataBaseConfig';
import {screenTypeModel} from '../../shared/screenModel';

/** Évaluation de travail (sans les métadonnées ajoutées à l'écriture). */
export type WorkingEval = Omit<saveModel, 'createdAt' | 'version'>;

/**
 * Clé sessionStorage de l'emplacement nommé (1-3) actuellement en cours d'édition.
 * sessionStorage est propre à l'onglet et survit au rechargement de la page : un
 * rechargement ne « détache » donc plus l'évaluation de son emplacement.
 */
const ACTIVE_SLOT_SESSION_KEY = 'gazeplay-eval.active-slot';

/**
 * État de l'évaluation en cours et écriture des sauvegardes localStorage.
 *
 * - `dataAuto` : évaluation de travail, partagée par toutes les pages ;
 * - slot 0 (`saveAuto`) : copie persistante de `dataAuto`, réécrite à chaque étape ;
 * - slots 1-3 (`save1`…`save3`) : sauvegardes nommées.
 *
 * Le format JSON des sauvegardes (`shared/saveModel.ts`) est inchangé.
 */
@Injectable({
  providedIn: 'root'
})
export class SaveService {

  defaultEvalName: string = "Nouvelle Evaluation";

  /** Emplacement nommé (1-3) lié à l'évaluation en cours, ou `null`. */
  activeSlotIndex: FormatTypeConfig | null = this.readActiveSlot();

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

  newSaveDataAuto(){
    this.dataAuto = structuredClone(saveModelDefault);
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
  }

  /**
   * Écrit une sauvegarde dans un emplacement localStorage.
   * @throws si le stockage est plein ou indisponible (l'appelant affiche l'erreur).
   */
  saveToSlot(slotIndex: FormatTypeConfig, data:any): void {
    const slotKey = SAVE_SLOT_LIST[slotIndex];
    const saveData: saveModel = {
      ...data,
      createdAt: new Date().toISOString(),
      version: 1
    };
    localStorage.setItem(slotKey, JSON.stringify(saveData));
  }

  clearSlot(slotIndex: FormatTypeConfig): void {
    const slotKey = SAVE_SLOT_LIST[slotIndex];
    localStorage.removeItem(slotKey);
    if (slotIndex !== 0 && this.activeSlotIndex === slotIndex) {
      this.setActiveSlot(null);
    }
  }

  /** Lie (ou délie avec `null`) l'évaluation en cours à un emplacement nommé. */
  setActiveSlot(slotIndex: FormatTypeConfig | null): void {
    this.activeSlotIndex = slotIndex;
    try {
      if (slotIndex === null) {
        sessionStorage.removeItem(ACTIVE_SLOT_SESSION_KEY);
      } else {
        sessionStorage.setItem(ACTIVE_SLOT_SESSION_KEY, String(slotIndex));
      }
    } catch {
      // sessionStorage indisponible : le lien ne sera simplement pas conservé au rechargement.
    }
  }

  getEvalName(){
    if(this.dataAuto.nomEval != ''){
      return this.dataAuto.nomEval;
    }else {
      return this.defaultEvalName;
    }
  }

  private readActiveSlot(): FormatTypeConfig | null {
    try {
      const raw = Number(sessionStorage.getItem(ACTIVE_SLOT_SESSION_KEY));
      return raw === 1 || raw === 2 || raw === 3 ? raw : null;
    } catch {
      return null;
    }
  }
}
