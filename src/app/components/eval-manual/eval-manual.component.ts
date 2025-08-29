import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {saveModelDefault} from '../../shared/saveModel';
import {GlobalInstructionScreenComponent} from '../global-instruction-screen/global-instruction-screen.component';
import {GlobalTransitionScreenComponent} from '../global-transition-screen/global-transition-screen.component';
import {GlobalStimuliScreenComponent} from '../global-stimuli-screen/global-stimuli-screen.component';

@Component({
  selector: 'app-eval-manual',
  imports: [CommonModule, FormsModule, GlobalTransitionScreenComponent, GlobalInstructionScreenComponent, GlobalStimuliScreenComponent],
  templateUrl: './eval-manual.component.html',
  styleUrl: './eval-manual.component.css'
})
export class EvalManualComponent implements OnInit{

  @Output() selectedModeChange = new EventEmitter<null>();

  globalTransitionScreenInfos: any[] = saveModelDefault.globalParamsTransitionScreen;
  globalInstructionScreenInfos: any[] = saveModelDefault.globalParamsInstructionScreen;
  globalStimuliScreenInfos: string[] = saveModelDefault.globalParamsStimuliScreen;

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
      this.globalTransitionScreenInfos,
      this.globalInstructionScreenInfos,
      this.globalStimuliScreenInfos,
      this.saveService.dataAuto.listScreens);

  }

  loadData(){
    this.globalStimuliScreenInfos = this.saveService.dataAuto.globalParamsStimuliScreen;
  }

  startCreateEvalManual(){
    this.saveData();
    console.log("Transition value -> " + this.saveService.dataAuto.globalParamsTransitionScreen);
    console.log("Instruction value -> " + this.saveService.dataAuto.globalParamsInstructionScreen);
    this.router.navigate(['/create-eval']);
  }

  backToEvalChoice(){
    this.saveData();
    this.selectedModeChange.emit(null);
  }

  protected readonly Number = Number;
}
