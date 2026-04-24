import { Injectable } from '@angular/core';
import { saveModel } from '../../shared/saveModel';
import { FormatTypeConfig, MaxSlots, SAVE_SLOT_LIST } from '../../shared/dataBaseConfig';

@Injectable({ providedIn: 'root' })
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
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null; // slot vide

    try {
      return JSON.parse(raw) as saveModel;
    } catch (e) {
      // Le JSON est illisible (données corrompues ou format incompatible) : on traite comme vide
      console.error(`Erreur de lecture du slot ${slotKey}`, e);
      return null;
    }
  }

  /**
   * Récupère les sauvegardes des trois slots nommés (1, 2, 3) en une seule passe.
   * Le slot 0 (auto-save) n'est pas inclus dans ce résultat.
   *
   * @returns Tuple de trois éléments correspondant aux slots 1, 2 et 3,
   *          chaque élément étant la sauvegarde du slot ou null si vide
   */
  getAllSlots(): [saveModel | null, saveModel | null, saveModel | null] {
    const allSlots: [saveModel | null, saveModel | null, saveModel | null] = [null, null, null];
    for (let i = 0; i < MaxSlots; i++) {
      const raw = localStorage.getItem(SAVE_SLOT_LIST[i]);
      allSlots[i] = raw ? JSON.parse(raw) as saveModel : null;
    }
    return allSlots;
  }
}
