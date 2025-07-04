import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-info-eval',
  imports: [CommonModule, FormsModule],
  templateUrl: './info-eval.component.html',
  styleUrl: './info-eval.component.css'
})
export class InfoEvalComponent {
  evaluationName: string = '';
  resultType: string = 'csv_xlsx';

  nextStep() {
    // Tu peux gérer ici la sauvegarde temporaire ou passer à l'étape suivante
    console.log('Nom:', this.evaluationName);
    console.log('Type de résultat:', this.resultType);
  }
}
