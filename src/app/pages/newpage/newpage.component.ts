import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {SaveService} from '../../services/save/save.service';
import {formatTypeModel, saveModelDefault} from '../../shared/saveModel';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';


@Component({
  selector: 'app-newpage-eval',
  imports: [CommonModule, FormsModule, MatTooltip],
  templateUrl: './newpage.component.html',
  styleUrl: './newpage.component.css'
})
export class NewpageComponent implements OnInit{
  evaluationName: string = saveModelDefault.nomEval;
  resultType: formatTypeModel = saveModelDefault.format;
  tooltipEvalName: string = 'Ce nom apparaîtra dans le nom des fichiers de résultats, ainsi que dans Gazeplay afin que vous puissiez sélectionner cette évaluation parmi celles que vous aurez déjà créées';
  tooltipEvalType: string = 'Les résultats enregistrés en XLSX et CSV seront lisibles dans un tableur';

  dateHeure: string = ''; // String pour l'affichage de la date et de l'heure

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
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.saveService.dataAuto.listScreens);
  }

  loadData(){
    this.evaluationName = this.saveService.dataAuto.nomEval;
    this.resultType = this.saveService.dataAuto.format;
  }

  backToInfoEval() {
    this.saveData();
    this.router.navigate(['/info-eval']);
  }

  goToInfoParticipant() {
    this.saveData();
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
