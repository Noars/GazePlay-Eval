import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {EvalManualComponent} from '../../components/eval-manual/eval-manual.component';
import {EvalAutomaticComponent} from '../../components/eval-automatic/eval-automatic.component';
import {evalModeModel} from '../../shared/saveModel';

@Component({
  selector: 'app-setup-eval',
    imports: [CommonModule, NgOptimizedImage, EvalManualComponent, EvalAutomaticComponent],
  templateUrl: './setup-eval.component.html',
  styleUrl: './setup-eval.component.css'
})
export class SetupEvalComponent {
  selectedMode: evalModeModel = null;

  constructor(private router: Router) {
  }

  selectMode(mode: evalModeModel) {
    this.selectedMode = mode;
  }

  onSelectedModeChange(mode: null) {
    this.selectedMode = mode;
  }

  backToInfoParticipant() {
    this.router.navigate(['/info-participant']);
  }
}
