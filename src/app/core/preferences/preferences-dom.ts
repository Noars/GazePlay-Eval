import {getFontDefinition, UserPreferences} from './user-preferences.model';

/**
 * Application des préférences au document HTML.
 *
 * Tout passe par des attributs et des variables CSS posés sur `<html>`, consommés par le
 * système de design (`src/styles/`). Aucune logique d'affichage ne lit les préférences
 * ailleurs : changer une préférence revient à mettre à jour ces attributs.
 *
 *  - `data-bs-theme`        : `light` | `dark` (thème résolu, compris par Bootstrap) ;
 *  - `data-theme-preference`: `light` | `dark` | `system` (choix de l'utilisateur) ;
 *  - `data-contrast`        : `standard` | `high` ;
 *  - `data-motion`          : `system` | `reduce` ;
 *  - `data-underline-links` : `true` | `false` ;
 *  - `data-color-blind`     : `true` | `false` (mode daltonisme, voir `src/styles/_color-vision.scss`) ;
 *  - variables `--gp-font-family`, `--gp-letter-spacing`, `--gp-word-spacing`,
 *    `--gp-line-height` et `font-size` de `<html>` (taille du texte).
 */

/** Clé localStorage d'un instantané servant uniquement à éviter un flash au premier affichage. */
export const FIRST_PAINT_CACHE_KEY = 'gazeplay-eval.preferences-cache';

export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(preferences: Pick<UserPreferences, 'theme'>, systemPrefersDark: boolean): ResolvedTheme {
  if (preferences.theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return preferences.theme;
}

export function applyPreferencesToDocument(
  preferences: UserPreferences,
  systemPrefersDark: boolean,
  doc: Document = document,
): void {
  const root = doc.documentElement;
  const theme = resolveTheme(preferences, systemPrefersDark);

  root.setAttribute('data-bs-theme', theme);
  root.setAttribute('data-theme-preference', preferences.theme);
  root.setAttribute('data-contrast', preferences.contrast);
  root.setAttribute('data-motion', preferences.motion);
  root.setAttribute('data-underline-links', String(preferences.underlineLinks));
  root.setAttribute('data-color-blind', String(preferences.colorBlindMode));
  root.style.colorScheme = theme;

  root.style.fontSize = `${preferences.textScale}%`;
  root.style.setProperty('--gp-font-family', getFontDefinition(preferences.font).stack);
  root.style.setProperty('--gp-letter-spacing', `${preferences.letterSpacing}em`);
  root.style.setProperty('--gp-word-spacing', `${preferences.wordSpacing}em`);
  root.style.setProperty('--gp-line-height', String(preferences.lineHeight));

  ensureFontLoaded(preferences, doc);
}

/**
 * Charge la feuille de style distante d'une police uniquement lorsqu'elle est choisie.
 * Par défaut (police du système), aucune requête n'est envoyée à un service tiers.
 */
function ensureFontLoaded(preferences: UserPreferences, doc: Document): void {
  const font = getFontDefinition(preferences.font);
  if (!font.remoteStylesheet) return;

  const linkId = `gp-font-${font.id}`;
  if (doc.getElementById(linkId)) return;

  const link = doc.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.remoteStylesheet;
  doc.head.appendChild(link);
}

/**
 * Met à jour l'instantané localStorage lu par le script de `index.html` avant le démarrage
 * d'Angular. IndexedDB reste la source de vérité : cet instantané n'est jamais relu par
 * l'application elle-même. Les erreurs (quota, stockage désactivé) sont ignorées.
 */
export function writeFirstPaintCache(preferences: UserPreferences, storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.setItem(FIRST_PAINT_CACHE_KEY, JSON.stringify({
      theme: preferences.theme,
      contrast: preferences.contrast,
      textScale: preferences.textScale,
      motion: preferences.motion,
      colorBlindMode: preferences.colorBlindMode,
    }));
  } catch {
    // Sans cache, le seul effet est un éventuel changement de thème visible au chargement.
  }
}
