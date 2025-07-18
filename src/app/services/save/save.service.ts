import { Injectable } from '@angular/core';
import {formatTypeModel, saveModel, saveModelDefault} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_LIST} from '../../shared/dataBaseConfig';
import {screenTypeModel} from '../../shared/screenModel';

@Injectable({
  providedIn: 'root'
})
export class SaveService {

  dataAuto: Omit<saveModel, 'createdAt' | 'version'> = {
    nomEval: '',
    format: 'Csv&Xlsx',
    infoParticipant: [],
    globalParamsStimuli: [],
    listScreens: []
  };

  newSaveDataAuto(){
    this.dataAuto = saveModelDefault;
    this.saveToSlot(0, this.dataAuto);
  }

  saveDataAuto(nomEval: string, format: formatTypeModel, infoParticipant: string[], globalParamsStimuli: string[], listScreens: screenTypeModel[]){
    this.dataAuto = {
      nomEval: nomEval,
      format: format,
      infoParticipant: infoParticipant,
      globalParamsStimuli: globalParamsStimuli,
      listScreens: listScreens
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
