import {Injectable, InjectionToken, inject} from '@angular/core';
import {openAppDatabase, STORE_USER_PREFERENCES} from '../storage/app-database';
import {UserPreferences} from './user-preferences.model';

/** Enregistrement unique du store `userPreferences`. */
export interface PreferencesRecord {
  id: typeof PREFERENCES_RECORD_ID;
  /** Version du schéma au moment de l'écriture (voir `PREFERENCES_SCHEMA_VERSION`). */
  schemaVersion: number;
  data: UserPreferences;
  updatedAt: string;
}

export const PREFERENCES_RECORD_ID = 'current';

/**
 * Persistance des préférences. Abstraite pour pouvoir être remplacée dans les tests
 * (implémentation en mémoire) sans toucher à la base réelle du navigateur.
 */
export interface PreferencesStore {
  /** Renvoie l'enregistrement brut, ou `null` si aucune préférence n'a encore été enregistrée. */
  load(): Promise<PreferencesRecord | null>;
  save(preferences: UserPreferences): Promise<void>;
}

/** Notifié si la mise à niveau de la base est bloquée par un autre onglet ouvert. */
export const PREFERENCES_DB_BLOCKED_HANDLER = new InjectionToken<() => void>('PREFERENCES_DB_BLOCKED_HANDLER');

/**
 * Implémentation IndexedDB : un seul enregistrement (`id: 'current'`) dans le store
 * `userPreferences`, distinct des médias (`evalFiles`).
 */
@Injectable({providedIn: 'root'})
export class IndexedDbPreferencesStore implements PreferencesStore {
  private readonly onBlocked = inject(PREFERENCES_DB_BLOCKED_HANDLER, {optional: true});

  async load(): Promise<PreferencesRecord | null> {
    const db = await openAppDatabase({onBlocked: () => this.onBlocked?.()});
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_USER_PREFERENCES, 'readonly')
        .objectStore(STORE_USER_PREFERENCES)
        .get(PREFERENCES_RECORD_ID);
      request.onsuccess = () => resolve((request.result as PreferencesRecord | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async save(preferences: UserPreferences): Promise<void> {
    const db = await openAppDatabase({onBlocked: () => this.onBlocked?.()});
    const record: PreferencesRecord = {
      id: PREFERENCES_RECORD_ID,
      schemaVersion: preferences.schemaVersion,
      data: preferences,
      updatedAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_USER_PREFERENCES, 'readwrite');
      transaction.objectStore(STORE_USER_PREFERENCES).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('Écriture des préférences annulée.'));
    });
  }
}

/** Jeton d'injection de la persistance des préférences (IndexedDB par défaut). */
export const PREFERENCES_STORE = new InjectionToken<PreferencesStore>('PREFERENCES_STORE', {
  providedIn: 'root',
  factory: () => inject(IndexedDbPreferencesStore),
});
