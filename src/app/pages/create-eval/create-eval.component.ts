import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {CommonModule, NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-create-eval',
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './create-eval.component.html',
  styleUrl: './create-eval.component.css'
})
export class CreateEvalComponent {
  selectedMode: 'manuel' | 'auto' | null = null;

  constructor(private router: Router) {
  }

  selectMode(mode: 'manuel' | 'auto') {
    this.selectedMode = mode;
  }

  backToInfoPatient() {
    this.router.navigate(['/info-patient']);
  }
}
