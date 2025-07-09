import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {Router} from '@angular/router';

@Component({
  selector: 'app-info-patient',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './info-patient.component.html',
  styleUrl: './info-patient.component.css'
})
export class InfoPatientComponent {

  fields: string[] = [];

  constructor(private router: Router) {
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
    this.router.navigate(['/info-eval']);
  }
}
