import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {CdkDrag, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {SaveService} from '../../services/save/save.service';
import {
  blackScreenModel, blackScreenConstModel, defaultBlackScreenModel,
  instructionScreenModel, instructionScreenConstModel, defaultInstructionScreenModel,
  stimuliScreenModel, stimuliScreenConstModel, defaultStimuliScreenModel,
  endScreenModel, endScreenConstModel,defaultEndScreenModel,
  screenTypeModel
} from '../../shared/screenModel';

@Component({
  selector: 'app-create-eval',
  imports: [ReactiveFormsModule, FormsModule, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './create-eval.component.html',
  styleUrl: './create-eval.component.css'
})
export class CreateEvalComponent implements OnInit{

  listScreens: screenTypeModel[] = [];
  selectedScreen: screenTypeModel | null = null;
  idScreen = 1;
  editNameScreenDisable = true;

  constructor(private router: Router, private saveService: SaveService) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  savaData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.saveService.dataAuto.infoParticipant,
      this.saveService.dataAuto.globalParamsStimuli,
      this.listScreens);
  }

  loadData(){
    this.listScreens = this.saveService.dataAuto.listScreens;
  }

  addScreen() {
    const newScreen: blackScreenModel = {
      name: 'Ecran ' + this.idScreen++,
      type: blackScreenConstModel,
    };
    this.listScreens.push(newScreen);
    this.selectScreen(newScreen);
  }

  selectScreen(screen: screenTypeModel) {
    this.selectedScreen = screen;
  }

  editNameScreen(screen: screenTypeModel, value: boolean) {
    this.selectedScreen = screen;
    if (this.selectedScreen === screen) {
      this.editNameScreenDisable = value;
    }
  }

  exitInputScreen() {
    this.editNameScreenDisable = true;
  }

  removeScreen(screen: screenTypeModel) {
    if (this.selectedScreen === screen) {
      this.selectedScreen = null;
    }
    this.listScreens = this.listScreens.filter(s => s !== screen);
  }

  changeTypeScreen(type: string) {
    switch (type){
      case blackScreenConstModel :
        const newBlackScreen: blackScreenModel = defaultBlackScreenModel;
        newBlackScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newBlackScreen;
        break;

      case instructionScreenConstModel :
        const newInstructionScreen: instructionScreenModel = defaultInstructionScreenModel;
        newInstructionScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newInstructionScreen;
        break;

      case stimuliScreenConstModel :
        const newStimuliScreen: stimuliScreenModel = defaultStimuliScreenModel;
        newStimuliScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newStimuliScreen;
        break;

      case endScreenConstModel :
        const newEndScreen: endScreenModel = defaultEndScreenModel;
        newEndScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newEndScreen;
        break;

      default :
        this.selectedScreen = null;
        break;
    }
  }

  drop(event: any) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const field = this.listScreens.splice(previousIndex, 1)[0];
    this.listScreens.splice(currentIndex, 0, field);
  }

  backToSetupEval() {
    this.savaData();
    this.router.navigate(['/setup-eval']);
  }

  goToDownloadEval() {
    //this.router.navigate(['/download-eval']);
  }

  protected readonly blackScreenConstModel = blackScreenConstModel;
  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly endScreenConstModel = endScreenConstModel;
}
