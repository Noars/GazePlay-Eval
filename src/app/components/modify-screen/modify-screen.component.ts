import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  transitionScreenConstModel,
  transitionScreenModel,
  defaultTransitionScreenModel,
  defaultInstructionScreenModel,
  defaultStimuliScreenModel,
  instructionScreenConstModel,
  instructionScreenModel,
  screenTypeModel,
  stimuliScreenConstModel,
  stimuliScreenModel
} from '../../shared/screenModel';
import {FormsModule} from '@angular/forms';
import {UpdateScreensService} from '../../services/updateScreens/update-screens.service';
import {SaveService} from '../../services/save/save.service';

@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule
  ],
  templateUrl: './modify-screen.component.html',
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent{

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<{ screen: screenTypeModel, flag: boolean }>();

  constructor(private updateScreenService: UpdateScreensService, private saveService: SaveService) {
  }

  changeTypeScreen(type: string) {
    switch (type){
      case transitionScreenConstModel :
        let newTransitionScreen: transitionScreenModel = structuredClone(defaultTransitionScreenModel);
        newTransitionScreen = this.updateScreenService.updateTransitionScreen(newTransitionScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsTransitionScreen);
        this.screenToModify = newTransitionScreen;
        break;

      case instructionScreenConstModel :
        let newInstructionScreen: instructionScreenModel = structuredClone(defaultInstructionScreenModel);
        newInstructionScreen = this.updateScreenService.updateInstructionScreen(newInstructionScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsInstructionScreen);
        this.screenToModify = newInstructionScreen;
        break;

      case stimuliScreenConstModel :
        const newStimuliScreen: stimuliScreenModel = structuredClone(defaultStimuliScreenModel);
        newStimuliScreen.name = this.screenToModify.name;
        this.screenToModify = newStimuliScreen;
        break;

      default :
        break;
    }
  }

  backToScreenList(){

    this.selectedScreenChange.emit({screen: this.screenToModify, flag: true});
  }

  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;
}
