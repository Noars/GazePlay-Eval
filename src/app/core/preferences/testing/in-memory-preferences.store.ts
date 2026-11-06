import {Provider} from '@angular/core';
import {PREFERENCES_RECORD_ID, PREFERENCES_STORE, PreferencesRecord, PreferencesStore} from '../preferences.store';
import {UserPreferences} from '../user-preferences.model';

/**
 * Persistance des préférences en mémoire, réservée aux tests : évite de lire ou d'écrire
 * dans la vraie base IndexedDB du navigateur de test.
 */
export class InMemoryPreferencesStore implements PreferencesStore {
  record: PreferencesRecord | null = null;
  /** Si défini, `load` (resp. `save`) rejette avec cette erreur. */
  loadError: Error | null = null;
  saveError: Error | null = null;
  saves: UserPreferences[] = [];

  constructor(initial?: Partial<PreferencesRecord>) {
    if (initial) {
      this.record = {
        id: PREFERENCES_RECORD_ID,
        schemaVersion: 1,
        data: {} as UserPreferences,
        updatedAt: new Date().toISOString(),
        ...initial,
      } as PreferencesRecord;
    }
  }

  async load(): Promise<PreferencesRecord | null> {
    if (this.loadError) throw this.loadError;
    return this.record;
  }

  async save(preferences: UserPreferences): Promise<void> {
    if (this.saveError) throw this.saveError;
    this.saves.push(structuredClone(preferences));
    this.record = {
      id: PREFERENCES_RECORD_ID,
      schemaVersion: preferences.schemaVersion,
      data: structuredClone(preferences),
      updatedAt: new Date().toISOString(),
    };
  }
}

/** Fournisseur prêt à l'emploi pour `TestBed`. */
export function provideInMemoryPreferences(store: InMemoryPreferencesStore = new InMemoryPreferencesStore()): Provider {
  return {provide: PREFERENCES_STORE, useValue: store};
}
