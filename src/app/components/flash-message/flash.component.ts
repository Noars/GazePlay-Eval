import {Component} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {FlashService} from '../../services/flash-message/flash.service';
import {TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Zone d'affichage des notifications temporaires (bas de l'écran).
 */
@Component({
  selector: 'app-flash',
  imports: [NgTemplateOutlet, TranslatePipe],
  templateUrl: './flash.component.html',
  styleUrl: './flash.component.scss'
})
export class FlashComponent {
  constructor(public flashService: FlashService) {
  }

  /**
   * Renvoie la variante visuelle correspondant au type de notification.
   * @param type le type du flash-message
   */
  mapType(type: string): string {
    const map: Record<string, string> = {
      success: 'success',
      error:   'danger',
      info:    'info',
      warning: 'warning'
    };
    return map[type] ?? 'info';
  }

  /**
   * Renvoie l'icône Bootstrap Icons correspondant au type de notification.
   * @param type le type du flash-message
   */
  mapIcon(type: string): string {
    const map: Record<string, string> = {
      success: 'bi-check-circle',
      error:   'bi-x-circle',
      info:    'bi-info-circle',
      warning: 'bi-exclamation-triangle'
    };
    return map[type] ?? 'bi-info-circle';
  }

  /** Préfixe (clé de traduction) lu par les lecteurs d'écran : la couleur seule ne suffit pas à indiquer le type. */
  mapLabel(type: string): TranslationKey {
    const map: Record<string, TranslationKey> = {
      success: 'flash.label.success',
      error:   'flash.label.error',
      info:    'flash.label.info',
      warning: 'flash.label.warning'
    };
    return map[type] ?? 'flash.label.info';
  }
}
