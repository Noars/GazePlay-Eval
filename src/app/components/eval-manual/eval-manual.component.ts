import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-eval-manual',
  imports: [CommonModule, FormsModule],
  templateUrl: './eval-manual.component.html',
  styleUrl: './eval-manual.component.css'
})
export class EvalManualComponent implements OnInit{

  @Input() selectedMode: 'manuel' | 'auto' | null = null;
  @Output() selectedModeChange = new EventEmitter<null>();

  useGlobalParams: boolean = false;
  transitionTypes: string[] = [
    'Écran noir',
    'Écran de fixation',
    'Écran d’attente',
    'Écran de pause',
  ];
  selectedTransition = this.transitionTypes[0];
  navigationMethods: string[] = ['Clique souris / clavier', 'Temps'];
  selectedMethod = this.navigationMethods[0];

  ngOnInit(): void {
    console.log("Init");
  }

  selectGlobalParams(choice: boolean) {
    this.useGlobalParams = choice;
  }

  startCreateEvalManual(){

  }

  backToEvalChoice(){
    this.selectedModeChange.emit(null);
  }
}
