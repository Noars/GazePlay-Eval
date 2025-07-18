import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {saveModelDefault} from '../../shared/saveModel';
import {evalModeModel} from '../../shared/screenModel';

@Component({
  selector: 'app-eval-manual',
  imports: [CommonModule, FormsModule],
  templateUrl: './eval-manual.component.html',
  styleUrl: './eval-manual.component.css'
})
export class EvalManualComponent implements OnInit{

  @Input() selectedMode: evalModeModel = null;
  @Output() selectedModeChange = new EventEmitter<null>();

  // 0-Nb rows, 1-Nb cols, 2-Add max time screen, 3-Max time screen, 4-Fixation length, 5-Nb stimuli, 6-Disable stimuli, 7-Random position stimuli
  globalStimuliInfos: string[] = saveModelDefault.globalParamsStimuli;

  constructor(private router: Router,
              private saveService: SaveService,) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.saveService.dataAuto.infoParticipant,
      this.globalStimuliInfos,
      this.saveService.dataAuto.listScreens);

  }

  loadData(){
    this.globalStimuliInfos = this.saveService.dataAuto.globalParamsStimuli;
  }

  startCreateEvalManual(){
    this.saveData();
    this.router.navigate(['/create-eval']);
  }

  backToEvalChoice(){
    this.saveData();
    this.selectedModeChange.emit(null);
  }

  protected readonly Number = Number;
}
