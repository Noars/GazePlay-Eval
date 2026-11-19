import {Injectable, signal} from '@angular/core';
import {LanguagePreference} from '../preferences/user-preferences.model';
import {FR, TranslationKey} from './locales/fr';
import {EN} from './locales/en';

export type {TranslationKey} from './locales/fr';

/** Valeurs insérées dans un texte traduit à la place de `{nom}` (`null`/`undefined` → texte vide). */
export type TranslationParams = Record<string, string | number | null | undefined>;

const DICTIONARIES: Record<LanguagePreference, Record<TranslationKey, string>> = {fr: FR, en: EN};

/**
 * Traduction de l'interface (français par défaut, anglais).
 *
 * La langue courante est un signal : les templates (pipe `t`) et les `computed` qui
 * l'utilisent se mettent à jour dès qu'elle change. Elle est fixée par
 * `UserPreferencesService` à partir de la préférence `language` ; ce service ne lit ni
 * n'écrit lui-même aucun stockage.
 *
 * Seuls les textes affichés sont traduits : les valeurs enregistrées ou exportées
 * (`Image`, `Tout`, `Csv&Xlsx`…) restent identiques quelle que soit la langue.
 */
@Injectable({providedIn: 'root'})
export class I18nService {
  private readonly current = signal<LanguagePreference>('fr');

  /** Langue affichée. */
  readonly language = this.current.asReadonly();

  setLanguage(language: LanguagePreference): void {
    this.current.set(language);
  }

  /**
   * Renvoie le texte associé à `key` dans la langue courante, en remplaçant les
   * paramètres `{nom}` par les valeurs fournies. Une clé absente de la langue courante
   * retombe sur le français, puis sur la clé elle-même.
   */
  t(key: TranslationKey, params?: TranslationParams): string {
    const text = DICTIONARIES[this.current()][key] ?? FR[key] ?? key;
    return params ? interpolate(text, params) : text;
  }
}

function interpolate(text: string, params: TranslationParams): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name] ?? '') : match);
}
