import {Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {NumberSettingComponent} from '../../shared/ui/number-setting/number-setting.component';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Formulaire des paramètres globaux des écrans de stimuli (étape 3).
 */
@Component({
  selector: 'app-global-stimuli-screen',
  imports: [FormsModule, ChoiceSettingComponent, NumberSettingComponent, TranslatePipe],
  templateUrl: './global-stimuli-screen.component.html',
  standalone: true,
  styleUrl: './global-stimuli-screen.component.css'
})
export class GlobalStimuliScreenComponent {

  /** Tableau positionnel des paramètres globaux (voir l'ordre des index dans le template). */
  @Input() globalStimuliScreenInfos: any[] = [];

  /** Nombre maximal de stimuli sélectionnables : lignes × colonnes. */
  get maxStimuli(): number {
    return (Number(this.globalStimuliScreenInfos[0]) || 0) * (Number(this.globalStimuliScreenInfos[1]) || 0);
  }
}
