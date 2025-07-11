import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {EvalManualComponent} from '../../components/eval-manual/eval-manual.component';
import {EvalAutomaticComponent} from '../../components/eval-automatic/eval-automatic.component';

@Component({
  selector: 'app-setup-eval',
    imports: [CommonModule, NgOptimizedImage, EvalManualComponent, EvalAutomaticComponent],
  templateUrl: './setup-eval.component.html',
  styleUrl: './setup-eval.component.css'
})
export class SetupEvalComponent {
  selectedMode: 'manuel' | 'auto' | null = null;

  constructor(private router: Router) {
  }

  selectMode(mode: 'manuel' | 'auto' | null) {
    this.selectedMode = mode;
  }

  onSelectedModeChange(mode: null) {
    this.selectedMode = mode;
  }

  backToInfoPatient() {
    this.router.navigate(['/info-patient']);
  }
}
