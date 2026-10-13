import {RouterLink} from '@angular/router';
import {Component} from '@angular/core';
import {FlashService} from '../../../services/flash-message/flash.service';
import {UserPreferencesService} from '../../../core/preferences/user-preferences.service';

/**
 * Guide « Sauvegarde et chargement ». Également affiché dans l'aide contextuelle des
 * pages Sauvegardes et Charger.
 */
@Component({
  selector: 'app-guide-sauvegarde',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './guide-sauvegarde.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideSauvegardeComponent {

  constructor(
    private flashService: FlashService,
    private preferences: UserPreferencesService
  ) {}

  /** Réactive les notifications avec une durée de 3 secondes (enregistrée dans les préférences). */
  async resetDuration(): Promise<void> {
    const ok = await this.preferences.update({messageDuration: 3});
    if (ok) {
      // Durée imposée : si les messages étaient désactivés, l'utilisateur doit voir la confirmation.
      this.flashService.show('success', 'La durée d\'affichage des notifications a été définie à 3 secondes.', 3000);
    } else {
      this.flashService.show('error', 'La durée d\'affichage des notifications n\'a pas pu être enregistrée.', 3000);
    }
  }
}
