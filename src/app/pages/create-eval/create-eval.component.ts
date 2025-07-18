import {Component, OnInit} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {ScreenModel} from '../../shared/screenModel';
import {CdkDrag, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';
import {SaveService} from '../../services/save/save.service';

@Component({
  selector: 'app-create-eval',
  imports: [ReactiveFormsModule, FormsModule, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './create-eval.component.html',
  styleUrl: './create-eval.component.css'
})
export class CreateEvalComponent implements OnInit{

  listScreens: ScreenModel[] = [];
  selectedScreen: ScreenModel | null = null;
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
    const newScreen: ScreenModel = {
      name: 'Ecran ' + this.idScreen++,
      type: 'black',
    };
    this.listScreens.push(newScreen);
    this.selectScreen(newScreen);
  }

  selectScreen(screen: ScreenModel) {
    this.selectedScreen = screen;
  }

  editNameScreen(screen: ScreenModel, value: boolean) {
    this.selectedScreen = screen;
    if (this.selectedScreen === screen) {
      this.editNameScreenDisable = value;
    }
  }

  exitInputScreen() {
    this.editNameScreenDisable = true;
  }

  removeScreen(screen: ScreenModel) {
    if (this.selectedScreen === screen) {
      this.selectedScreen = null;
    }
    this.listScreens = this.listScreens.filter(s => s !== screen);
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
