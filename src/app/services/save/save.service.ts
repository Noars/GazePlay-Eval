import { Injectable } from '@angular/core';
import {FormatType, saveModel} from '../../shared/saveModel';
import {SAVE_SLOT_LIST} from '../../shared/saveConfig';

@Injectable({
  providedIn: 'root'
})
export class SaveService {

  dataAuto: Omit<saveModel, 'createdAt' | 'version'>;

  saveDataAuto(nomEval: string, format: FormatType){
    this.dataAuto = {
      nomEval: nomEval,
      format: format,
    };

    this.saveToSlot(0, this.dataAuto);
  }

  saveToSlot(slotIndex: 0 | 1 | 2 | 3, data: Omit<saveModel, 'createdAt' | 'version'>): void {
    const slotKey = SAVE_SLOT_LIST[slotIndex];
    const saveData: saveModel = {
      ...data,
      createdAt: new Date().toISOString(),
      version: 1
    };
    localStorage.setItem(slotKey, JSON.stringify(saveData));
  }

  clearSlot(slotIndex: 0 | 1 | 2 | 3): void {
    const slotKey = SAVE_SLOT_LIST[slotIndex];
    localStorage.removeItem(slotKey);
  }
}
