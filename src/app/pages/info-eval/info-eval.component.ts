import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {SaveService} from '../../services/save/save.service';
import {formatTypeModel, saveModelDefault} from '../../shared/saveModel';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-info-eval',
  imports: [CommonModule, FormsModule, MatTooltip],
  templateUrl: './info-eval.component.html',
  styleUrl: './info-eval.component.css'
})
export class InfoEvalComponent implements OnInit{
  evaluationName: string = saveModelDefault.nomEval;
  resultType: formatTypeModel = saveModelDefault.format;
  tooltipText: string = 'Ce nom apparaîtra dans le nom des fichiers de résultats et dans Gazeplay pour choisir l’évaluation si vous en avez en avez plusieurs';

  constructor(private router: Router,private saveService: SaveService) {
  }

  ngOnInit(): void {
    this.loadData()
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.evaluationName,
      this.resultType,
      this.saveService.dataAuto.infoParticipant,
      this.saveService.dataAuto.globalParamsBlackScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.saveService.dataAuto.listScreens);
  }

  loadData(){
    this.evaluationName = this.saveService.dataAuto.nomEval;
    this.resultType = this.saveService.dataAuto.format;
  }

  goToInfoParticipant() {
    this.saveData();
    this.router.navigate(['/info-participant']);
  }
}
