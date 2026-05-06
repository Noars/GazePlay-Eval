import {Injectable, OnDestroy} from '@angular/core';
import {FlashService} from '../flash-message/flash.service';
import {optionsModel} from '../../shared/optionsModel';

@Injectable({ providedIn: 'root' })
export class OptionService {

  constructor() {}

  public getOptions():optionsModel | null {
    const raw = localStorage.getItem('options');
    if (!raw) return null; // pas d'options

    try {
      return JSON.parse(raw) as optionsModel;
    } catch (e) {
      // Le JSON est illisible (données corrompues ou format incompatible) : on traite comme vide
      console.error(`Erreur de lecture des options (durée des flash messages) : `, e);
      return null;
    }
  }

  public setOptions(optionsData:optionsModel): void {
    try {
      localStorage.setItem('options', JSON.stringify(optionsData))
    } catch (e) {
      throw e;
    }
  }
}
