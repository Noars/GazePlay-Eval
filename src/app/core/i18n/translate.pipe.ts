import {inject, Pipe, PipeTransform} from '@angular/core';
import {I18nService, TranslationKey, TranslationParams} from './i18n.service';

/**
 * Traduit une clé dans la langue courante : `{{ 'nav.home' | t }}`,
 * `{{ 'home.screens' | t: {count: n} }}`.
 *
 * Pipe impur : le texte est recalculé à chaque détection de changements, ce qui suit le
 * changement de langue sans recharger la page (une simple lecture de dictionnaire).
 */
@Pipe({name: 't', pure: false})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
