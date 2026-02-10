import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-global-stimuli-screen',
  imports: [],
  templateUrl: './global-stimuli-screen.component.html',
  standalone: true,
  styleUrl: './global-stimuli-screen.component.css'
})
export class GlobalStimuliScreenComponent {

  @Input() globalStimuliScreenInfos: any[] = [];

}
