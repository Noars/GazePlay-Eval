import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-newpage-eval',
  imports: [],
  templateUrl: './newpage.component.html',
  styleUrl: './newpage.component.css'
})
export class NewpageComponent{
  dateHeure: string = ''; // String pour l'affichage de la date et de l'heure

  constructor(private router: Router) {
  }

  backToInfoEval() {
    this.router.navigate(['/info-eval']);
  }

  goToInfoParticipant() {
    this.router.navigate(['/info-participant']);
  }

  /**
   * Récupère et renvoie la date actuelle ainsi que l'heure (en formant Français)
   */
  getDateEtHeure() {
    const now = new Date();

    // Format JJ/MM/AAAA HH:MM:SS
    this.dateHeure = now.toLocaleString('fr-FR');
  }
}
