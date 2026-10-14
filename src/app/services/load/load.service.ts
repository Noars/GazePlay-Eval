import {Injectable} from '@angular/core';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_LIST} from '../../shared/dataBaseConfig';

@Injectable({providedIn: 'root'})
export class LoadService {

  /**
   * Récupère la sauvegarde stockée dans un slot donné depuis le localStorage.
   * Retourne null si le slot est vide ou si le JSON est corrompu.
   *
   * @param slotIndex Index du slot à lire (0 = auto-save, 1-3 = slots nommés)
   * @returns La sauvegarde désérialisée, ou null si absente ou invalide
   */
  getSlot(slotIndex: FormatTypeConfig): saveModel | null {
    const slotKey = SAVE_SLOT_LIST[slotIndex]; // traduit l'index en clé localStorage (ex: 'save1')
    let raw: string | null;
    try {
      raw = localStorage.getItem(slotKey);
    } catch (e) {
      console.error(`Stockage local inaccessible (slot ${slotKey})`, e);
      return null;
    }
    if (!raw) return null; // slot vide

    try {
      return JSON.parse(raw) as saveModel;
    } catch (e) {
      // Le JSON est illisible (données corrompues ou format incompatible) : on traite comme vide
      console.error(`Erreur de lecture du slot ${slotKey}`, e);
      return null;
    }
  }
}
