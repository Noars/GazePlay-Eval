import {Component, EventEmitter, Input, Output} from '@angular/core';
import {
  blackScreenConstModel,
  blackScreenModel,
  defaultBlackScreenModel, defaultEndScreenModel,
  defaultInstructionScreenModel,
  defaultStimuliScreenModel, endScreenConstModel, endScreenModel,
  instructionScreenConstModel,
  instructionScreenModel,
  screenTypeModel,
  stimuliScreenConstModel,
  stimuliScreenModel
} from '../../shared/screenModel';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule
  ],
  templateUrl: './modify-screen.component.html',
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent {

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<boolean>();

  changeTypeScreen(type: string) {
    switch (type){
      case blackScreenConstModel :
        const newBlackScreen: blackScreenModel = defaultBlackScreenModel;
        newBlackScreen.name = this.screenToModify.name
        this.screenToModify = newBlackScreen;
        break;

      case instructionScreenConstModel :
        const newInstructionScreen: instructionScreenModel = defaultInstructionScreenModel;
        newInstructionScreen.name = this.screenToModify.name;
        this.screenToModify = newInstructionScreen;
        break;

      case stimuliScreenConstModel :
        const newStimuliScreen: stimuliScreenModel = defaultStimuliScreenModel;
        newStimuliScreen.name = this.screenToModify.name;
        this.screenToModify = newStimuliScreen;
        break;

      case endScreenConstModel :
        const newEndScreen: endScreenModel = defaultEndScreenModel;
        newEndScreen.name = this.screenToModify.name;
        this.screenToModify = newEndScreen;
        break;

      default :
        break;
    }
  }

  backToScreenList(){
    this.selectedScreenChange.emit(false);
  }

  protected readonly blackScreenConstModel = blackScreenConstModel;
  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly endScreenConstModel = endScreenConstModel;
}
