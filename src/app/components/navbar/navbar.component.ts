import {Component, EventEmitter, inject, Output} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';
import {SaveService} from '../../services/save/save.service';
import {IconGuidePopupComponent} from '../icon-guide-popup/icon-guide-popup-component';
import {LanguageMenuComponent} from '../language-menu/language-menu.component';

/**
 * En-tête de l'application : accès au menu (petits écrans), marque, aide contextuelle,
 * bascule de thème et choix de la langue (liste déroulante). Les options restent accessibles
 * depuis le menu.
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, IconGuidePopupComponent, LanguageMenuComponent, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly preferences = inject(UserPreferencesService);
  private readonly saveService = inject(SaveService);

  /** Demande d'ouverture de la navigation en tiroir. */
  @Output() menuRequested = new EventEmitter<void>();

  changeTheme(): void {
    void this.preferences.toggleTheme();
  }

  /** Icône à afficher : soleil en thème sombre (pour revenir au clair), lune sinon. */
  getTheme(): 'sun' | 'moon' {
    return this.preferences.resolvedTheme() === 'dark' ? 'sun' : 'moon';
  }

  isDark(): boolean {
    return this.preferences.resolvedTheme() === 'dark';
  }

  getEvalName(): string {
    return this.saveService.getEvalName();
  }

  /** Le bouton d'aide contextuelle est masqué dans les pages du guide. */
  showGuideButton(): boolean {
    return !this.router.url.includes('/guide');
  }
}
