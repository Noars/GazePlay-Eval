import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-page-intermediaire',
  templateUrl: './page-intermediaire.component.html',
  styleUrl: './page-intermediaire.component.css'
})

export class PageIntermediaireComponent implements OnInit{
  // attributs
  private currentDate: Date;
  heure: string | null = null;

  constructor(private router: Router) {
    // initialisation
    this.currentDate = new Date();
  }

  ngOnInit(): void {
    // mets à jour la date dès le chargement de la page
        this.updateCurrentDate();
    }

// fonction pour mettre à jour la date
  updateCurrentDate() {
    setInterval(() => {
      this.currentDate = new Date();
    }, 1000)
  }

  printDate() {
// affiche l'heure avec le bon format
    this.heure = "Il est " + this.currentDate.toLocaleTimeString() + " le " + this.currentDate.toLocaleDateString();


  }
// logique de navigation
  goToInfoParticipant() {
    this.router.navigate(['/info-participant']);
  }

  BackToInfoEval() {
    this.router.navigate(['/info-eval']);
  }

}
