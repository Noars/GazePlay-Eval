import {Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ChoiceOption, ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {NumberSettingComponent} from '../../shared/ui/number-setting/number-setting.component';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/** Types de média d'un écran d'instruction (valeurs enregistrées telles quelles, seuls les libellés sont traduits). */
export const INSTRUCTION_MEDIA_OPTIONS: ChoiceOption<string>[] = [
  {value: 'Image', labelKey: 'screen.media.image'},
  {value: 'Video', labelKey: 'screen.media.video'},
  {value: 'Texte', labelKey: 'screen.media.text'},
  {value: 'Son', labelKey: 'screen.media.sound'},
];

/**
 * Formulaire des paramètres globaux des écrans d'instruction (étape 3).
 */
@Component({
  selector: 'app-global-instruction-screen',
  imports: [FormsModule, ChoiceSettingComponent, NumberSettingComponent, TranslatePipe],
  templateUrl: './global-instruction-screen.component.html',
  standalone: true,
  styleUrl: './global-instruction-screen.component.css'
})
export class GlobalInstructionScreenComponent {

  /** Tableau positionnel des paramètres globaux (voir l'ordre des index dans le template). */
  @Input() globalInstructionScreenInfos: any[] = [];

  readonly mediaTypeOptions = INSTRUCTION_MEDIA_OPTIONS;
}
