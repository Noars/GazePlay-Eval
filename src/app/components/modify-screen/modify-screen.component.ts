import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-modify-screen',
  imports: [],
  templateUrl: './modify-screen.component.html',
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent {

  @Output() selectedScreenChange = new EventEmitter<boolean>();

  backToScreenList(){
    this.selectedScreenChange.emit(false);
  }
}
