import { Injectable } from '@angular/core';
import {instructionScreenModel, stimuliScreenModel, transitionScreenModel} from '../../shared/screenModel';

@Injectable({
  providedIn: 'root'
})
export class UpdateScreensService {

  updateTransitionScreen(screenT: transitionScreenModel, name: string, value: any){
    screenT.name = name;
    screenT.values[0] = value[0];
    screenT.values[1] = value[1];
    screenT.values[2] = value[2];
    screenT.values[3] = value[3];
    screenT.values[4] = value[4];

    return screenT;
  }

  updateInstructionScreen(screenI: instructionScreenModel, name: string, value: any){
    screenI.name = name;
    screenI.values[0] = value[0];
    screenI.values[1] = value[1];
    screenI.values[2] = value[2];
    screenI.values[3] = value[3];
    screenI.values[6] = value[4];
    screenI.values[7] = value[5];

    return screenI;
  }

  updateStimuliScreen(screenS: stimuliScreenModel, name: string, value: any){
    screenS.name = name;
    screenS.values[0] = value[0];
    screenS.values[1] = value[1];
    screenS.values[2] = value[2];
    screenS.values[3] = value[3];
    screenS.values[4] = value[4];
    screenS.values[5] = value[5];
    screenS.values[6] = value[6];
    screenS.values[7] = value[7];

    return screenS;
  }
}
