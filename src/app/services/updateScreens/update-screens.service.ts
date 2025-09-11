import { Injectable } from '@angular/core';
import {instructionScreenModel, stimuliScreenModel, transitionScreenModel} from '../../shared/screenModel';

@Injectable({
  providedIn: 'root'
})
export class UpdateScreensService {

  updateTransitionScreen(screen: transitionScreenModel, name: string, value: any){
    screen.name = name;
    screen.values[0] = value[0];
    screen.values[1] = value[1];
    screen.values[2] = value[2];
    screen.values[3] = value[3];
    screen.values[4] = value[4];

    return screen;
  }

  updateInstructionScreen(screen: instructionScreenModel, name: string, value: any){
    screen.name = name;
    screen.values[0] = value[0];
    screen.values[1] = value[1];
    screen.values[2] = value[2];
    screen.values[3] = value[3];
    screen.values[5] = value[4];
    screen.values[6] = value[5];

    return screen;
  }

  updateStimuliScreen(screen: stimuliScreenModel, name: string, value: any){
    screen.name = name;

  }
}
