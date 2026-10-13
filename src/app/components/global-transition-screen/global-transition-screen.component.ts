import {Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {NumberSettingComponent} from '../../shared/ui/number-setting/number-setting.component';

/**
 * Formulaire des paramètres d'un écran de transition.
 *
 * Utilisé pour les paramètres globaux (étape 3) et pour un écran de transition précis
 * (éditeur d'écran) : les deux tableaux ont la même disposition d'index (voir le template).
 */
@Component({
  selector: 'app-global-transition-screen',
  imports: [FormsModule, ChoiceSettingComponent, NumberSettingComponent],
  templateUrl: './global-transition-screen.component.html',
  standalone: true,
  styleUrl: './global-transition-screen.component.css'
})
export class GlobalTransitionScreenComponent {

  /** Tableau positionnel modifié directement (voir l'ordre des index dans le template). */
  @Input() globalTransitionScreenInfos: any[] = [];
}
