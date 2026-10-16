import {computed, DestroyRef, DOCUMENT, inject, Injectable, signal} from '@angular/core';
import {
  DEFAULT_PREFERENCES,
  LanguagePreference,
  normalizePreferences,
  readLegacyPreferences,
  UserPreferences,
} from './user-preferences.model';
import {PREFERENCES_STORE} from './preferences.store';
import {applyPreferencesToDocument, resolveTheme, ResolvedTheme, writeFirstPaintCache} from './preferences-dom';
import {StorageNoticeService} from '../storage/storage-notice.service';
import {I18nService} from '../i18n/i18n.service';

/**
 * État de la persistance des préférences :
 *  - `pending`     : chargement en cours ;
 *  - `ready`       : préférences lues et enregistrables dans IndexedDB ;
 *  - `unavailable` : IndexedDB inaccessible, les préférences ne vivent qu'en mémoire.
 */
export type PreferencesStorageStatus = 'pending' | 'ready' | 'unavailable';

/** Au-delà de ce délai, l'application démarre avec les préférences connues à cet instant. */
const INIT_TIMEOUT_MS = 1500;

/**
 * Source unique des préférences d'affichage.
 *
 * Responsabilités :
 *  1. charger les préférences depuis IndexedDB au démarrage (`init`, appelé par un
 *     initialiseur d'application, avant le premier rendu) ;
 *  2. reprendre une seule fois les anciennes préférences de localStorage (`theme`,
 *     `options.flashDuration`) si IndexedDB n'en contient pas encore ;
 *  3. appliquer les préférences au document (attributs/variables CSS) ;
 *  4. enregistrer chaque modification, en conservant l'état en mémoire si l'écriture échoue.
 *
 * Les préférences restent locales au navigateur : aucune requête réseau n'est émise
 * (hors chargement d'une police distante explicitement choisie par l'utilisateur).
 */
@Injectable({providedIn: 'root'})
export class UserPreferencesService {
  private readonly store = inject(PREFERENCES_STORE);
  private readonly document = inject(DOCUMENT);
  private readonly notices = inject(StorageNoticeService);
  private readonly i18n = inject(I18nService);

  private readonly state = signal<UserPreferences>({...DEFAULT_PREFERENCES});
  private readonly systemPrefersDark = signal(false);

  /** Préférences courantes (lecture seule). */
  readonly preferences = this.state.asReadonly();
  /** Thème effectivement affiché, une fois `system` résolu. */
  readonly resolvedTheme = computed<ResolvedTheme>(() => resolveTheme(this.state(), this.systemPrefersDark()));
  readonly storageStatus = signal<PreferencesStorageStatus>('pending');
  /** Dernière erreur d'enregistrement, à afficher à l'utilisateur ; `null` si tout va bien. */
  readonly saveError = signal<string | null>(null);

  /** File d'écritures : garantit que les enregistrements s'appliquent dans l'ordre des modifications. */
  private writeQueue: Promise<unknown> = Promise.resolve();
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.watchSystemTheme();
  }

  /**
   * Charge puis applique les préférences. Idempotent : les appels suivants renvoient la
   * même promesse. Ne rejette jamais : en cas d'échec, les valeurs par défaut (complétées
   * par les anciennes préférences localStorage) sont appliquées.
   */
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.loadWithTimeout();
    }
    return this.initPromise;
  }

  /**
   * Modifie une ou plusieurs préférences, les applique immédiatement puis les enregistre.
   * @returns `true` si l'enregistrement a réussi, `false` sinon (l'état en mémoire est conservé).
   */
  update(patch: Partial<UserPreferences>): Promise<boolean> {
    const next = normalizePreferences({...this.state(), ...patch});
    this.state.set(next);
    this.apply();
    return this.persist(next);
  }

  /**
   * Rétablit les valeurs d'affichage par défaut et les enregistre. La langue choisie est
   * conservée : rétablir l'affichage ne doit pas changer la langue de l'interface.
   */
  reset(): Promise<boolean> {
    return this.update({...DEFAULT_PREFERENCES, language: this.state().language});
  }

  /** Change la langue de l'interface et l'enregistre. */
  setLanguage(language: LanguagePreference): Promise<boolean> {
    return this.update({language});
  }

  /** Bascule entre thème clair et sombre (à partir du thème actuellement affiché). */
  toggleTheme(): Promise<boolean> {
    return this.update({theme: this.resolvedTheme() === 'dark' ? 'light' : 'dark'});
  }

  private async loadWithTimeout(): Promise<void> {
    // On applique tout de suite les valeurs connues (défaut + anciennes préférences) pour
    // que l'interface soit cohérente même si IndexedDB tarde à répondre.
    this.state.set(normalizePreferences({...DEFAULT_PREFERENCES, ...readLegacyPreferences(this.localStorage())}));
    this.apply();

    const load = this.load();
    const timeout = new Promise<void>(resolve => setTimeout(resolve, INIT_TIMEOUT_MS));
    await Promise.race([load, timeout]);
  }

  private async load(): Promise<void> {
    try {
      const record = await this.store.load();
      // La base est ouverte : un éventuel blocage par un autre onglet est levé.
      this.notices.upgradeBlocked.set(false);
      if (record) {
        this.state.set(normalizePreferences(record.data));
        this.storageStatus.set('ready');
        this.apply();
        // Réécrit l'enregistrement s'il provenait d'une autre version du schéma.
        if (record.schemaVersion !== this.state().schemaVersion) {
          await this.persist(this.state());
        }
        return;
      }

      // Première utilisation d'IndexedDB : on reprend les anciennes préférences.
      this.storageStatus.set('ready');
      this.apply();
      await this.persist(this.state());
    } catch (error) {
      console.warn('Préférences : IndexedDB indisponible, utilisation des valeurs locales.', error);
      this.storageStatus.set('unavailable');
    }
  }

  private persist(preferences: UserPreferences): Promise<boolean> {
    const write = this.writeQueue.then(async () => {
      if (this.storageStatus() === 'unavailable') {
        this.saveError.set(this.i18n.t('preferences.error.unavailable'));
        return false;
      }
      try {
        await this.store.save(preferences);
        this.saveError.set(null);
        return true;
      } catch (error) {
        console.error('Préférences : échec de l\'enregistrement.', error);
        this.saveError.set(this.i18n.t('preferences.error.saveFailed'));
        return false;
      }
    });
    this.writeQueue = write;
    return write;
  }

  private apply(): void {
    this.i18n.setLanguage(this.state().language);
    applyPreferencesToDocument(this.state(), this.systemPrefersDark(), this.document);
    writeFirstPaintCache(this.state(), this.localStorage());
  }

  private watchSystemTheme(): void {
    const view = this.document.defaultView;
    if (!view?.matchMedia) return;

    const query = view.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark.set(query.matches);
    const listener = (event: MediaQueryListEvent) => {
      this.systemPrefersDark.set(event.matches);
      if (this.state().theme === 'system') {
        this.apply();
      }
    };
    query.addEventListener?.('change', listener);
    inject(DestroyRef).onDestroy(() => query.removeEventListener?.('change', listener));
  }

  private localStorage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
