import {
  Component,
  EventEmitter,
  Input, OnInit,
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
import {GlobalTransitionScreenComponent} from '../global-transition-screen/global-transition-screen.component';

@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule,
    GlobalTransitionScreenComponent
  ],
  templateUrl: './modify-screen.component.html',
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent implements OnInit{

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<{ screen: screenTypeModel, flag: boolean }>();

  typeFile: string = "";
  haveFile: boolean = false;
  file: any = "";
  textToRead: string = '';

  constructor(private updateScreenService: UpdateScreensService, private saveService: SaveService) {
  }

  ngOnInit(): void {
    this.haveFile = this.checkFileExist();
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
        this.haveFile = this.checkFileExist();
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

  changeTypeFile(type: string){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.screenToModify.values[3] = type;
      this.screenToModify.values[4] = "";
      this.typeFile = type;
      this.haveFile = false;
      this.file = "";
    }
  }

  getFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.screenToModify.type === instructionScreenConstModel ) {
      this.screenToModify.values[4] = input.files[0];
      this.haveFile = true;
      this.file =  URL.createObjectURL(input.files[0]);
    }else {
      this.haveFile = false;
    }
  }

  checkFileExist(){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.typeFile = this.screenToModify.values[3];
      if (this.typeFile === 'Texte'){
        this.textToRead = this.screenToModify.values[4];
        return false;
      }else {
        if (this.screenToModify.values[4] !== ''){
          this.file = URL.createObjectURL(this.screenToModify.values[4]);
          return true;
        }else {
          return false;
        }
      }
    } else {
      return false;
    }
  }

  getText(event: string){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.textToRead = event;
      this.screenToModify.values[4] = event;
    }
  }

  playText() {
    if (!this.textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(this.textToRead);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  addStimuli(){
    this.screenToModify.values[8].push(["",""]);
  }

  deleteStimuli(index: number){
    this.screenToModify.values[8].splice(index, 1);
  }

  getStimuliFiles(event: Event, index: number){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.screenToModify.values[8][index][1] = input.files[0];
    }
  }

  backToScreenList(){
    this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
  }

  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;
  protected readonly Number = Number;
}
