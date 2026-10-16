import {inject, Injectable} from '@angular/core';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_LIST} from '../../shared/dataBaseConfig';
import {TabSessionService} from '../../core/tab/tab-session.service';

@Injectable({providedIn: 'root'})
export class LoadService {
  private readonly tab = inject(TabSessionService);

  /**
   * Récupère la sauvegarde stockée dans un slot donné.
   * Retourne null si le slot est vide ou si le JSON est corrompu.
   *
   * @param slotIndex Index du slot à lire (0 = évaluation en cours de cet onglet, 1-3 = slots nommés)
   * @returns La sauvegarde désérialisée (une copie), ou null si absente ou invalide
   */
  getSlot(slotIndex: FormatTypeConfig): saveModel | null {
    if (slotIndex === 0) {
      this.tab.ensureInitialized();
      return this.tab.working ? structuredClone(this.tab.working) : null;
    }
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
