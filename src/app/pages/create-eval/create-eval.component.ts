import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {CdkDrag, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {SaveService} from '../../services/save/save.service';
import {transitionScreenModel, transitionScreenConstModel, screenTypeModel} from '../../shared/screenModel';
import {ModifyScreenComponent} from '../../components/modify-screen/modify-screen.component';

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
  idScreen: number = 1;
  editNameScreenDisable: boolean = true;

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
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.listScreens);
  }

  loadData(){
    this.listScreens = this.saveService.dataAuto.listScreens;
  }

  addScreen() {
    const newScreen: transitionScreenModel = {
      name: 'Ecran ' + this.idScreen++,
      type: transitionScreenConstModel,
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

  getNameCurrentScreen() {
    return this.selectedScreen?.name ?? '';
  }

  onModifyScreenChange(event: boolean){
    this.isModifyScreen = event;
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
}
