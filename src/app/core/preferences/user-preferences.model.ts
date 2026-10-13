/**
 * Modèle des préférences d'affichage et de confort de lecture.
 *
 * Les préférences sont stockées localement (IndexedDB, store `userPreferences`) et ne
 * quittent jamais le navigateur. Toute donnée lue est passée par
 * {@link normalizePreferences} : une valeur absente, inconnue ou hors bornes est remplacée
 * par sa valeur par défaut, ce qui protège l'application contre un enregistrement
 * corrompu ou issu d'une version future/passée du modèle.
 */

/** Version du schéma des préférences. À incrémenter en cas de changement de structure. */
export const PREFERENCES_SCHEMA_VERSION = 1;

export type ThemePreference = 'light' | 'dark' | 'system';
export type ContrastPreference = 'standard' | 'high';
export type MotionPreference = 'system' | 'reduce';
export type FontPreference = 'system' | 'atkinson' | 'lexend' | 'verdana' | 'roboto';

export interface UserPreferences {
  schemaVersion: number;
  /** Thème clair, sombre, ou celui du système d'exploitation. */
  theme: ThemePreference;
  /** Contraste standard ou renforcé. */
  contrast: ContrastPreference;
  /** Police de l'interface. */
  font: FontPreference;
  /** Taille du texte en pourcentage de la taille de base du navigateur. */
  textScale: number;
  /** Espacement des lettres, en em. */
  letterSpacing: number;
  /** Espacement des mots, en em. */
  wordSpacing: number;
  /** Hauteur de ligne (multiplicateur sans unité). */
  lineHeight: number;
  /** Réduction des animations : suit le système ou force la réduction. */
  motion: MotionPreference;
  /** Soulignement systématique des liens. */
  underlineLinks: boolean;
  /** Durée d'affichage des notifications, en secondes (0 = désactivées). */
  messageDuration: number;
}

export const DEFAULT_PREFERENCES: Readonly<UserPreferences> = Object.freeze({
  schemaVersion: PREFERENCES_SCHEMA_VERSION,
  theme: 'system',
  contrast: 'standard',
  font: 'system',
  textScale: 100,
  letterSpacing: 0,
  wordSpacing: 0,
  lineHeight: 1.5,
  motion: 'system',
  underlineLinks: false,
  messageDuration: 5,
});

/** Valeurs proposées dans l'interface (les valeurs stockées sont bornées, pas limitées à ces listes). */
export const TEXT_SCALE_OPTIONS = [90, 100, 115, 130, 150, 175, 200] as const;
export const LETTER_SPACING_OPTIONS = [0, 0.05, 0.12] as const;
export const WORD_SPACING_OPTIONS = [0, 0.08, 0.16] as const;
export const LINE_HEIGHT_OPTIONS = [1.5, 1.75, 2] as const;

/** Bornes de sécurité appliquées aux valeurs numériques lues. */
export const PREFERENCE_LIMITS = {
  textScale: {min: 80, max: 200},
  letterSpacing: {min: 0, max: 0.2},
  wordSpacing: {min: 0, max: 0.3},
  lineHeight: {min: 1.2, max: 2.5},
  messageDuration: {min: 0, max: 30},
} as const;

export interface FontDefinition {
  id: FontPreference;
  label: string;
  /** Pile CSS `font-family` complète, avec polices de repli. */
  stack: string;
  /** Feuille Google Fonts à charger à la demande ; absente pour les polices locales. */
  remoteStylesheet?: string;
  description: string;
}

const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

export const FONT_DEFINITIONS: readonly FontDefinition[] = [
  {
    id: 'system',
    label: 'Police du système',
    stack: SYSTEM_STACK,
    description: 'Police native de votre appareil, aucun téléchargement.',
  },
  {
    id: 'atkinson',
    label: 'Atkinson Hyperlegible',
    stack: `"Atkinson Hyperlegible", ${SYSTEM_STACK}`,
    remoteStylesheet: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap',
    description: 'Conçue pour les personnes malvoyantes : caractères très distincts.',
  },
  {
    id: 'lexend',
    label: 'Lexend',
    stack: `"Lexend", ${SYSTEM_STACK}`,
    remoteStylesheet: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&display=swap',
    description: 'Lettres larges et espacées, pensée pour faciliter la lecture.',
  },
  {
    id: 'verdana',
    label: 'Verdana',
    stack: `Verdana, Tahoma, ${SYSTEM_STACK}`,
    description: 'Police large et lisible, souvent installée sur l\'ordinateur.',
  },
  {
    id: 'roboto',
    label: 'Roboto',
    stack: `Roboto, ${SYSTEM_STACK}`,
    remoteStylesheet: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    description: 'Ancienne police par défaut de l\'application.',
  },
];

export function getFontDefinition(id: FontPreference): FontDefinition {
  return FONT_DEFINITIONS.find(font => font.id === id) ?? FONT_DEFINITIONS[0];
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value as T : fallback;
}

function clampNumber(value: unknown, limits: {min: number, max: number}, fallback: number): number {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, numeric));
}

/**
 * Construit des préférences valides à partir d'une donnée quelconque (enregistrement
 * IndexedDB, ancienne version du modèle, objet partiel).
 *
 * - les champs inconnus sont ignorés ;
 * - les champs absents ou invalides prennent leur valeur par défaut ;
 * - le résultat porte toujours la version de schéma courante.
 */
export function normalizePreferences(raw: unknown): UserPreferences {
  const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const d = DEFAULT_PREFERENCES;

  return {
    schemaVersion: PREFERENCES_SCHEMA_VERSION,
    theme: pick(source['theme'], ['light', 'dark', 'system'] as const, d.theme),
    contrast: pick(source['contrast'], ['standard', 'high'] as const, d.contrast),
    font: pick(source['font'], FONT_DEFINITIONS.map(f => f.id), d.font),
    textScale: clampNumber(source['textScale'], PREFERENCE_LIMITS.textScale, d.textScale),
    letterSpacing: clampNumber(source['letterSpacing'], PREFERENCE_LIMITS.letterSpacing, d.letterSpacing),
    wordSpacing: clampNumber(source['wordSpacing'], PREFERENCE_LIMITS.wordSpacing, d.wordSpacing),
    lineHeight: clampNumber(source['lineHeight'], PREFERENCE_LIMITS.lineHeight, d.lineHeight),
    motion: pick(source['motion'], ['system', 'reduce'] as const, d.motion),
    underlineLinks: typeof source['underlineLinks'] === 'boolean' ? source['underlineLinks'] : d.underlineLinks,
    messageDuration: clampNumber(source['messageDuration'], PREFERENCE_LIMITS.messageDuration, d.messageDuration),
  };
}

/**
 * Lit les anciennes préférences stockées dans localStorage par les versions précédentes
 * de l'application, pour les reprendre lors de la première utilisation d'IndexedDB :
 *  - clé `theme` : `'light'` ou `'dark'` ;
 *  - clé `options` : JSON dont seul `flashDuration` (secondes) était utilisé.
 *
 * Ces clés ne sont **pas supprimées** : elles restent disponibles en cas de retour
 * à une ancienne version de l'application.
 */
export function readLegacyPreferences(storage: Pick<Storage, 'getItem'> | null): Partial<UserPreferences> {
  if (!storage) return {};
  const legacy: Partial<UserPreferences> = {};

  try {
    const theme = storage.getItem('theme');
    if (theme === 'light' || theme === 'dark') {
      legacy.theme = theme;
    }
  } catch { /* stockage inaccessible */ }

  try {
    const rawOptions = storage.getItem('options');
    if (rawOptions) {
      const options = JSON.parse(rawOptions);
      if (typeof options?.flashDuration === 'number' && Number.isFinite(options.flashDuration)) {
        legacy.messageDuration = options.flashDuration;
      }
    }
  } catch { /* JSON illisible : ignoré */ }

  return legacy;
}
