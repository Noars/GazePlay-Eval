import {Component, Input} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'app-global-instruction-screen',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './global-instruction-screen.component.html',
  standalone: true,
  styleUrl: './global-instruction-screen.component.css'
})
export class GlobalInstructionScreenComponent {

  @Input() globalInstructionScreenInfos: any[] = [];
}
