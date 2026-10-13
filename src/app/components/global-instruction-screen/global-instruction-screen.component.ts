import {Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ChoiceOption, ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {NumberSettingComponent} from '../../shared/ui/number-setting/number-setting.component';

/** Types de média d'un écran d'instruction (valeurs enregistrées telles quelles). */
export const INSTRUCTION_MEDIA_OPTIONS: ChoiceOption<string>[] = [
  {value: 'Image', label: 'Image'},
  {value: 'Video', label: 'Vidéo'},
  {value: 'Texte', label: 'Texte'},
  {value: 'Son', label: 'Son'},
];

/**
 * Formulaire des paramètres globaux des écrans d'instruction (étape 3).
 */
@Component({
  selector: 'app-global-instruction-screen',
  imports: [FormsModule, ChoiceSettingComponent, NumberSettingComponent],
  templateUrl: './global-instruction-screen.component.html',
  standalone: true,
  styleUrl: './global-instruction-screen.component.css'
})
export class GlobalInstructionScreenComponent {

  /** Tableau positionnel des paramètres globaux (voir l'ordre des index dans le template). */
  @Input() globalInstructionScreenInfos: any[] = [];

  readonly mediaTypeOptions = INSTRUCTION_MEDIA_OPTIONS;
}
