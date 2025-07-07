import { Injectable } from '@angular/core';
import {saveModel} from '../../shared/saveModel';
import {SAVE_SLOT_LIST} from '../../shared/saveConfig';

@Injectable({
  providedIn: 'root'
})
export class LoadService {

  getSlot(slotIndex: 0 | 1 | 2 | 3): saveModel | null {
    const slotKey = SAVE_SLOT_LIST[slotIndex];
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as saveModel;
    } catch (e) {
      console.error(`Erreur de lecture du slot ${slotKey}`, e);
      return null;
    }
  }
}
