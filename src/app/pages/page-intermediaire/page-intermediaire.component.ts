import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-page-intermediaire',
  templateUrl: './page-intermediaire.component.html',
  styleUrl: './page-intermediaire.component.css'
})

export class PageIntermediaireComponent {

  constructor(private router: Router) {
  }

  goToInfoParticipant() {
    this.router.navigate(['/info-participant']);
  }

  BackToInfoEval() {
    this.router.navigate(['/info-eval']);
  }

}
