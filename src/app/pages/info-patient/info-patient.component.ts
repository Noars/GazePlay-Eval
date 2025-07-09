import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';
import {SaveService} from '../../services/save/save.service';

@Component({
  selector: 'app-info-patient',
  imports: [CommonModule, FormsModule, DragDropModule, MatTooltip],
  templateUrl: './info-patient.component.html',
  styleUrl: './info-patient.component.css'
})
export class InfoPatientComponent {

  fields: string[] = [];
  tooltipText: string = 'Ces informations sont stockées en local sur l’ordinateur que vous utilisez.\n \n' +
    'Aucune information n’est stockée de notre côté : nous n’avons pas accès à ces informations sauf si vous partagez les fichiers avec nous ensuite.\n \n' +
    'Il est important de vous assurer de la conformité RGPD des données que vous stockez et partagez.';

  constructor(private router: Router,
              private saveService: SaveService) {
  }

  addField() {
    this.fields.push('');
  }

  removeField(index: number) {
    this.fields.splice(index, 1);
  }

  drop(event: any) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const field = this.fields.splice(previousIndex, 1)[0];
    this.fields.splice(currentIndex, 0, field);
  }

  backToInfoEval() {
    this.saveService.saveDataAuto(this.saveService.dataAuto.nomEval, this.saveService.dataAuto.format, this.fields);
    this.router.navigate(['/info-eval']);
  }
}
