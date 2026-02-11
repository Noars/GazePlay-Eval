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
import {PopupStimuliComponent} from '../popup-stimuli/popup-stimuli.component';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule,
  ],
  templateUrl: './modify-screen.component.html',
  standalone: true,
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent implements OnInit{

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<{ screen: screenTypeModel, flag: boolean }>();

  actualTypeScreen: string = "";
  typeFile: string = "";
  nameFile: string = "";
  haveInstructionFile: boolean = false;
  haveStimuliSoundFile: boolean = false;
  instructionFile: any = "";
  stimuliFile: any = "";
  textToRead: string = '';

  constructor(private updateScreenService: UpdateScreensService, private saveService: SaveService, private dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.actualTypeScreen = this.screenToModify.type;
    this.haveInstructionFile = this.checkInstructionFileExist();
    this.haveStimuliSoundFile = this.checkStimuliSoundFileExist();
  }

  changeTypeScreen(type: string) {
    this.actualTypeScreen = type;
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
        this.haveInstructionFile = this.checkInstructionFileExist();
        break;

      case stimuliScreenConstModel :
        let newStimuliScreen: stimuliScreenModel = structuredClone(defaultStimuliScreenModel);
        newStimuliScreen = this.updateScreenService.updateStimuliScreen(newStimuliScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsStimuliScreen);
        this.screenToModify = newStimuliScreen;
        this.haveStimuliSoundFile = this.checkStimuliSoundFileExist();
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
      this.haveInstructionFile = false;
      this.instructionFile = "";
    }
  }

  getInstructionFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.screenToModify.type === instructionScreenConstModel ) {
      this.screenToModify.values[4] = input.files[0].name;
      this.screenToModify.values[5] = input.files[0];
      this.haveInstructionFile = true;
      this.nameFile = input.files[0].name;
      this.instructionFile =  URL.createObjectURL(input.files[0]);
    }else {
      this.haveInstructionFile = false;
    }
  }

  getStimuliSoundFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.screenToModify.type === stimuliScreenConstModel ) {
      this.screenToModify.values[10] = input.files[0].name;
      this.screenToModify.values[11] = input.files[0];
      this.haveStimuliSoundFile = true;
      this.nameFile = input.files[0].name;
      this.stimuliFile =  URL.createObjectURL(input.files[0]);
      this.typeFile = "Son";
    }else {
      this.haveStimuliSoundFile = false;
    }
  }

  checkInstructionFileExist(){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.typeFile = this.screenToModify.values[3];
      if (this.typeFile === 'Texte'){
        this.textToRead = this.screenToModify.values[4];
        return false;
      }else {
        if (this.screenToModify.values[4] !== ''){
          this.nameFile = this.screenToModify.values[4];
          this.instructionFile = URL.createObjectURL(this.screenToModify.values[5]);
          return true;
        }else {
          return false;
        }
      }
    } else {
      return false;
    }
  }

  checkStimuliSoundFileExist(){
    if (this.screenToModify.type === stimuliScreenConstModel){
      this.typeFile = "Son";
      if (this.screenToModify.values[10] !== ''){
        this.nameFile = this.screenToModify.values[10];
        this.stimuliFile = URL.createObjectURL(this.screenToModify.values[11]);
        return true;
      }else {
        return false;
      }
    }else {
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

  get totalCells(): number[] {
    return Array.from({ length: this.screenToModify.values[0] * this.screenToModify.values[1] }, (_, i) => i + 1);
  }

  numberCellChanged(){
    let numberCells = this.screenToModify.values[0] * this.screenToModify.values[1];
    const listScreen = this.screenToModify.values[12];
    const numberKey = Object.keys(listScreen).length;
    if (numberKey < numberCells){
      for (let i = numberKey; i < numberCells; i++){
        listScreen[i] = {
          imageName: "",
          imageFile: undefined,
          soundName: "",
          soundFile: undefined,
          goodAnswer: false,
        }
      }
    }else {
      for (const keyNumber in listScreen){
        if (Number(keyNumber) >= numberCells){
          delete listScreen[keyNumber];
        }
      }
    }
  }

  openPopup(cellNumber: number) {
    const listScreen = this.screenToModify.values[12];
    this.dialog.open(PopupStimuliComponent, {
      data: {
        cell: cellNumber,
        screen: listScreen
      },
      panelClass: 'popup-stimuli',
      disableClose: true
    });
  }

  backToScreenList(){
    this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
  }

  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;
  protected readonly Number = Number;
}
