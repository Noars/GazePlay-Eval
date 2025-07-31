import {Component, Input} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'app-global-transition-screen',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './global-transition-screen.component.html',
  styleUrl: './global-transition-screen.component.css'
})
export class GlobalTransitionScreenComponent {

  @Input() globalTransitionScreenInfos: any[] = [];
}
