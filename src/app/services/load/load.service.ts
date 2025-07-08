import { Injectable } from '@angular/core';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig, MaxSlots, SAVE_SLOT_LIST} from '../../shared/saveConfig';

@Injectable({
  providedIn: 'root'
})
export class LoadService {

  getSlot(slotIndex: FormatTypeConfig): saveModel | null {
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

  getAllSlots() {
    let allSlots: [saveModel | null, saveModel | null, saveModel | null] = [null, null, null];
    for (let i = 0; i < MaxSlots; i++){
      const raw = localStorage.getItem(SAVE_SLOT_LIST[i])
      if (!raw) {
        allSlots[i] = null;
      }else {
        allSlots[i] = JSON.parse(raw) as saveModel;
      }
    }
    return allSlots;
  }
}
