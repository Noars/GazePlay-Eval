import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Router} from '@angular/router';

@Component({
  selector: 'app-eval-automatic',
  imports: [
    FormsModule
  ],
  templateUrl: './eval-automatic.component.html',
  standalone: true,
  styleUrl: './eval-automatic.component.css'
})
export class EvalAutomaticComponent {

  @Input() selectedMode: 'manuel' | 'auto' | null = null;
  @Output() selectedModeChange = new EventEmitter<null>();

  constructor(private router: Router,) {
  }

  startCreateEvalAuto(){
    this.router.navigate(['/create-eval']);
  }

  backToEvalChoice(){
    this.selectedModeChange.emit(null);
  }
}
