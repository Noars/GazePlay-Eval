import {Component} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {SaveService} from '../../services/save/save.service';
import {FormatTypeModel} from '../../shared/saveModel';
import {Router} from '@angular/router';

@Component({
  selector: 'app-info-eval',
  imports: [CommonModule, FormsModule],
  templateUrl: './info-eval.component.html',
  styleUrl: './info-eval.component.css'
})
export class InfoEvalComponent{
  evaluationName: string = '';
  resultType: FormatTypeModel = 'Csv&Xlsx' ;

  constructor(private router: Router,private saveService: SaveService) {
  }

  goToInfoPatient() {
    this.saveService.saveDataAuto(this.evaluationName, this.resultType);
    this.router.navigate(['/info-patient']);
  }
}
