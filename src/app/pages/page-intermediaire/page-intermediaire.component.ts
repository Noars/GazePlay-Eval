import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {formatTypeModel, saveModelDefault} from '../../shared/saveModel';
import {SaveService} from '../../services/save/save.service';

@Component({
  selector: 'app-page-intermediaire',
  templateUrl: './page-intermediaire.component.html',
  styleUrl: './page-intermediaire.component.css'
})

export class PageIntermediaireComponent implements OnInit{
  // attributs
  private currentDate: Date;
  // pour le bouton date et heure
  heure: string | null = null;

  evaluationName: string = saveModelDefault.nomEval;
  resultType: formatTypeModel = saveModelDefault.format;
  tooltipEvalName: string = 'Ce nom apparaîtra dans le nom des fichiers de résultats, ainsi que dans Gazeplay afin que vous puissiez sélectionner cette évaluation parmi celles que vous aurez déjà créées';
  tooltipEvalType: string = 'Les résultats enregistrés en XLSX et CSV seront lisibles dans un tableur';

  constructor(private router: Router, private saveService: SaveService) {
    // initialisation
    this.currentDate = new Date();
  }

  ngOnInit(): void {
    // mets à jour la date dès le chargement de la page
        this.updateCurrentDate();
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
    this.saveData();
    this.router.navigate(['/info-participant']);
  }

  backToInfoEval() {
    this.saveData();
    this.router.navigate(['/info-eval']);
  }

}
