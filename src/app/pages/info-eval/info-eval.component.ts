import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {SaveService} from '../../services/save/save.service';
import {FormatType} from '../../shared/saveModel';

@Component({
  selector: 'app-info-eval',
  imports: [CommonModule, FormsModule],
  templateUrl: './info-eval.component.html',
  styleUrl: './info-eval.component.css'
})
export class InfoEvalComponent {
  evaluationName: string = '';
  resultType: FormatType = 'Csv&Xlsx' ;

  constructor(private saveService: SaveService) {
  }

  nextStep() {
    this.saveService.saveDataAuto(this.evaluationName, this.resultType);
  }
}
