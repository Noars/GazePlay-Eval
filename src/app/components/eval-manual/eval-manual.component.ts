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
  transitionTypes: string[] = ['Écran noir', 'Écran de fixation', 'Écran d’attente', 'Écran de pause'];
  transitionInfos: string[] = ['1', '2', '3', '4'];
  selectedTransition = this.transitionTypes[0];
  navigationMethods: string[] = ['Clique souris / clavier', 'Temps'];
  selectedMethod = this.navigationMethods[0];

  constructor(private router: Router,) {
  }

  selectGlobalParams(choice: boolean) {
    this.useGlobalParams = choice;
  }

  getInfoTransition(): string {
    const idx = this.transitionTypes.indexOf(this.selectedTransition);
    return this.transitionInfos[idx] ?? '';
  }

  startCreateEvalManual(){
    this.router.navigate(['/create-eval']);
  }

  backToEvalChoice(){
    this.selectedModeChange.emit(null);
  }
}
