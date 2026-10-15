import {RouterLink} from '@angular/router';
import {Component, inject} from '@angular/core';
import {I18nService} from '../../../core/i18n/i18n.service';
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
  private readonly i18n = inject(I18nService);
  /** Langue affichée : choisit la version du texte du guide. */
  protected readonly language = this.i18n.language;

  constructor(
    private flashService: FlashService,
    private preferences: UserPreferencesService
  ) {}

  /** Réactive les notifications avec une durée de 3 secondes (enregistrée dans les préférences). */
  async resetDuration(): Promise<void> {
    const ok = await this.preferences.update({messageDuration: 3});
    if (ok) {
      // Durée imposée : si les messages étaient désactivés, l'utilisateur doit voir la confirmation.
      this.flashService.show('success', this.i18n.t('guide.notifications.reset'), 3000);
    } else {
      this.flashService.show('error', this.i18n.t('guide.notifications.error'), 3000);
    }
  }
}
