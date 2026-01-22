import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';

@Component({
  selector: 'app-date-display',
  imports: [CommonModule],
  templateUrl: './date-display.component.html',
  styleUrl: './date-display.component.css'
})
export class DateDisplayComponent {
  currentDate: Date | null = null;

  constructor(private router: Router) {
  }

  showDate() {
    this.currentDate = new Date();
  }

  backToInfoEval() {
    this.router.navigate(['/info-eval']);
  }

  goToInfoParticipant() {
    this.router.navigate(['/info-participant']);
  }
}
