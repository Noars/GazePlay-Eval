import { Component } from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {ScreenModel} from '../../shared/screenModel';
import {CdkDrag, CdkDragHandle, CdkDropList} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-create-eval',
  imports: [ReactiveFormsModule, FormsModule, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './create-eval.component.html',
  styleUrl: './create-eval.component.css'
})
export class CreateEvalComponent {

  screens: ScreenModel[] = [];
  selectedScreen: ScreenModel | null = null;
  idScreen = 1;
  editNameScreenDisable = true;

  constructor(private router: Router,) {
  }

  addScreen() {
    const newScreen: ScreenModel = {
      name: 'Ecran ' + this.idScreen++,
      type: 'black',
    };
    this.screens.push(newScreen);
    this.selectScreen(newScreen);
  }

  selectScreen(screen: ScreenModel) {
    this.selectedScreen = screen;
  }

  editNameScreen(screen: ScreenModel, value: boolean) {
    if (this.selectedScreen === screen) {
      this.editNameScreenDisable = value;
    }
  }

  removeScreen(screen: ScreenModel) {
    this.screens = this.screens.filter(s => s !== screen);
    if (this.selectedScreen === screen) {
      this.selectedScreen = null;
    }
  }

  drop(event: any) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const field = this.screens.splice(previousIndex, 1)[0];
    this.screens.splice(currentIndex, 0, field);
  }

  backToSetupEval() {
    this.router.navigate(['/setup-eval']);
  }

  goToDownloadEval() {
    //this.router.navigate(['/download-eval']);
  }
}
