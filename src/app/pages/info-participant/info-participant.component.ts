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
  templateUrl: './info-participant.component.html',
  styleUrl: './info-participant.component.css'
})
export class InfoParticipantComponent implements OnInit{

  infoParticipantList: string[] = saveModelDefault.infoParticipant;
  tooltipTextData: string = 'Ces informations sont stockées en local sur l’ordinateur que vous utilisez.\n \n' +
    'Aucune information n’est stockée de notre côté : nous n’avons pas accès à ces informations sauf si vous partagez les fichiers avec nous ensuite.\n \n' +
    'Il est important de vous assurer de la conformité RGPD des données que vous stockez et partagez.';

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

  addField() {
    this.infoParticipantList.push('');
  }

  removeField(index: number) {
    this.infoParticipantList.splice(index, 1);
  }

  drop(event: any) {
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;
    const field = this.infoParticipantList.splice(previousIndex, 1)[0];
    this.infoParticipantList.splice(currentIndex, 0, field);
  }

  backToInfoEval() {
    this.saveData();
    this.router.navigate(['/info-eval']);
  }

  goToCreateEval() {
    this.saveData();
    this.router.navigate(['/setup-eval']);
  }
}
