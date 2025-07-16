import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';
import {SaveService} from '../../services/save/save.service';
import {evalModeModel, saveModelDefault} from '../../shared/saveModel';

@Component({
  selector: 'app-eval-manual',
  imports: [CommonModule, FormsModule, MatTooltip],
  templateUrl: './eval-manual.component.html',
  styleUrl: './eval-manual.component.css'
})
export class EvalManualComponent implements OnInit{

  @Input() selectedMode: evalModeModel = null;
  @Output() selectedModeChange = new EventEmitter<null>();

  useGlobalParams: boolean = false;

  /* ----- Ecran transition -----*/
  transitionTypes: string[] = ['Écran noir', 'Écran de fixation', 'Écran d’attente', 'Écran de pause'];
  transitionInfos: string[] = ['1', '2', '3', '4'];
  selectedTransition = this.transitionTypes[0];
  navigationMethods: string[] = ['Clique souris / clavier', 'Temps'];
  selectedMethod = this.navigationMethods[0];

  /* ----- Ecran stimuli -----*/
  // 0-Nb rows, 1-Nb cols, 2-Add max time screen, 3-Max time screen, 4-Fixation length, 5-Nb stimuli, 6-Disable stimuli, 7-Random position stimuli
  screenStimuliInfos: string[] = saveModelDefault.globalParamsStimuli;

  constructor(private router: Router,
              private saveService: SaveService,) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(){
    this.screenStimuliInfos = this.saveService.dataAuto.globalParamsStimuli;
  }

  getInfoTransition(): string {
    const idx = this.transitionTypes.indexOf(this.selectedTransition);
    return this.transitionInfos[idx] ?? '';
  }

  startCreateEvalManual(){
    //this.router.navigate(['/create-eval']);
  }

  backToEvalChoice(){
    this.selectedModeChange.emit(null);
  }

  protected readonly Number = Number;
}
