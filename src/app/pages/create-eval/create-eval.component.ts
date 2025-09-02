import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {CdkDrag, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {SaveService} from '../../services/save/save.service';
import {
  transitionScreenModel,
  screenTypeModel,
  defaultTransitionScreenModel,
} from '../../shared/screenModel';
import {ModifyScreenComponent} from '../../components/modify-screen/modify-screen.component';
import {UpdateScreensService} from '../../services/updateScreens/update-screens.service';

@Component({
  selector: 'app-create-eval',
  imports: [ReactiveFormsModule, FormsModule, CdkDropList, CdkDrag, CdkDragHandle, ModifyScreenComponent],
  templateUrl: './create-eval.component.html',
  styleUrl: './create-eval.component.css'
})
export class CreateEvalComponent implements OnInit{

  isModifyScreen: boolean = false;
  listScreens: screenTypeModel[] = [];
  selectedScreen: screenTypeModel | null = null;
  indexSelectedScreen: number = -1;
  idScreen: number = 1;
  editNameScreenDisable: boolean = true;

  constructor(private router: Router, private saveService: SaveService, private updateScreenService: UpdateScreensService) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  savaData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.saveService.dataAuto.infoParticipant,
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.listScreens);
  }

  loadData(){
    this.listScreens = this.saveService.dataAuto.listScreens;
  }

  addScreen() {
    let newScreen: transitionScreenModel = structuredClone(defaultTransitionScreenModel);
    newScreen = this.updateScreenService.updateTransitionScreen(newScreen, 'Ecran ' + this.idScreen++, this.saveService.dataAuto.globalParamsTransitionScreen);
    this.selectedScreen = newScreen;
    this.listScreens.push(newScreen);
  }

  selectScreen(screen: screenTypeModel, index: number) {
    this.selectedScreen = screen;
    this.indexSelectedScreen = index;
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

  getNameCurrentScreen() {
    return this.selectedScreen?.name ?? '';
  }

  onModifyScreenChange(event: { screen: screenTypeModel, flag: boolean }){
    this.savaData();
    this.selectedScreen = event.screen;
    this.listScreens[this.indexSelectedScreen] = event.screen;
    this.isModifyScreen = event.flag;
  }

  drop(event: any) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const field = this.listScreens.splice(previousIndex, 1)[0];
    this.listScreens.splice(currentIndex, 0, field);
    this.indexSelectedScreen = currentIndex;
  }

  backToSetupEval() {
    this.savaData();
    this.router.navigate(['/setup-eval']);
  }

  goToDownloadEval() {
    //this.router.navigate(['/download-eval']);
  }
}
