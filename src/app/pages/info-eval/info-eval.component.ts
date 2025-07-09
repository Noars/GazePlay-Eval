import {AfterViewInit, Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {SaveService} from '../../services/save/save.service';
import {FormatTypeModel} from '../../shared/saveModel';
import {Tooltip} from 'bootstrap';

@Component({
  selector: 'app-info-eval',
  imports: [CommonModule, FormsModule],
  templateUrl: './info-eval.component.html',
  styleUrl: './info-eval.component.css'
})
export class InfoEvalComponent implements AfterViewInit{
  evaluationName: string = '';
  resultType: FormatTypeModel = 'Csv&Xlsx' ;

  constructor(private saveService: SaveService) {
  }

  ngAfterViewInit(): void {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      new Tooltip(tooltipTriggerEl);
    });
  }

  nextStep() {
    this.saveService.saveDataAuto(this.evaluationName, this.resultType);
  }
}
