import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-eval-automatic',
    imports: [
        FormsModule
    ],
  templateUrl: './eval-automatic.component.html',
  styleUrl: './eval-automatic.component.css'
})
export class EvalAutomaticComponent {

  @Input() selectedMode: 'manuel' | 'auto' | null = null;
  @Output() selectedModeChange = new EventEmitter<null>();

  startCreateEvalAuto(){

  }

  backToEvalChoice(){
    this.selectedModeChange.emit(null);
  }
}
