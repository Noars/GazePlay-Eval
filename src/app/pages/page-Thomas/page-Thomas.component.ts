import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';
import {SaveService} from '../../services/save/save.service';
import {saveModelDefault} from '../../shared/saveModel';

@Component({
  selector: 'app-info-participant',
  imports: [CommonModule, FormsModule, DragDropModule, MatTooltip],
  templateUrl: './page-Thomas.component.html',
  styleUrl: './page-Thomas.component.css'
})
export class PageThomas implements OnInit{
  heureAffichee: string | null = null;

  infoParticipantList: string[] = saveModelDefault.infoParticipant;
  tooltipTextData: string = 'Ces informations sont stockées en local sur l’ordinateur que vous utilisez\n \n' +
    'Aucune information n’est stockée de notre côté : nous n’avons pas accès à ces informations sauf si vous partagez les fichiers avec nous par la suite\n \n' +
    'Il est important de vous assurer de la conformité RGPD des données que vous stockez et partagez';
  tooltipDragDrop: string = 'Faites glisser un item en sélectionnant les trois barres horizontales à sa gauche, et déplacez-le jusqu’à l’endroit où vous le souhaitez avant de relâcher le clic de la souris';

  constructor(private router: Router,
              private saveService: SaveService) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.infoParticipantList,
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.saveService.dataAuto.listScreens);
  }

  loadData(){
    this.infoParticipantList = this.saveService.dataAuto.infoParticipant;
  }

  capturerHeure() {
    const maintenant = new Date();

    this.heureAffichee = maintenant.toLocaleTimeString() + " le " + maintenant.toLocaleDateString();

  }

  backToInfoEval() {
    this.saveData();
    this.router.navigate(['/info-eval']);
  }

  goToCreateEval() {
    this.saveData();
    this.router.navigate(['/info-participant']);
  }
}
