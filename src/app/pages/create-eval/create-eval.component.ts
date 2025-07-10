import { Component } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-create-eval',
  imports: [],
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
