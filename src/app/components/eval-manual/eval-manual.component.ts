import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-eval-manual',
  imports: [CommonModule, FormsModule, MatTooltip],
  templateUrl: './eval-manual.component.html',
  styleUrl: './eval-manual.component.css'
})
export class EvalManualComponent{

  @Input() selectedMode: 'manuel' | 'auto' | null = null;
  @Output() selectedModeChange = new EventEmitter<null>();

  useGlobalParams: boolean = false;

  /* ----- Ecran transition -----*/
  transitionTypes: string[] = ['Écran noir', 'Écran de fixation', 'Écran d’attente', 'Écran de pause'];
  transitionInfos: string[] = ['1', '2', '3', '4'];
  selectedTransition = this.transitionTypes[0];
  navigationMethods: string[] = ['Clique souris / clavier', 'Temps'];
  selectedMethod = this.navigationMethods[0];

  /* ----- Ecran stimuli -----*/
  // 0-Nb rows, 1-Nb cols, 2-Add max time screen, 3-Max time screen, 4-Fixation length, 5-Nb stimulis, 6-Disable stimulis, 7-Random position stimuli
  screenStimuliInfos: string[] = ['1', '1', 'false', '10', '1', '1', 'false', 'false'];

  constructor(private router: Router,) {
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
