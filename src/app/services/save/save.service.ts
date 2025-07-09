import { Injectable } from '@angular/core';
import {FormatTypeModel, saveModel, saveModelDefault} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_LIST} from '../../shared/ddbConfig';

@Injectable({
  providedIn: 'root'
})
export class SaveService {

  dataAuto: Omit<saveModel, 'createdAt' | 'version'> = {
    nomEval: '',
    format: 'Csv&Xlsx',
    infoPatient: []
  };

  newSaveDataAuto(){
    this.dataAuto = saveModelDefault;
    this.saveToSlot(0, this.dataAuto);
  }

  saveDataAuto(nomEval: string, format: FormatTypeModel, infoPatient: string[]){
    this.dataAuto = {
      nomEval: nomEval,
      format: format,
      infoPatient: infoPatient,
    };
    this.saveToSlot(0, this.dataAuto);
  }

  saveToSlot(slotIndex: FormatTypeConfig, data: Omit<saveModel, 'createdAt' | 'version'>): void {
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
  }
}
