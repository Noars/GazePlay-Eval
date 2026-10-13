import {TestBed} from '@angular/core/testing';
import {UserPreferencesService} from './user-preferences.service';
import {InMemoryPreferencesStore, provideInMemoryPreferences} from './testing/in-memory-preferences.store';
import {DEFAULT_PREFERENCES, normalizePreferences, readLegacyPreferences} from './user-preferences.model';
import {FIRST_PAINT_CACHE_KEY} from './preferences-dom';

describe('UserPreferencesService', () => {
  let store: InMemoryPreferencesStore;
  let service: UserPreferencesService;
  const root = document.documentElement;
  const legacyKeys = ['theme', 'options', FIRST_PAINT_CACHE_KEY];
  let savedLegacy: Record<string, string | null>;

  function setup(initialStore = new InMemoryPreferencesStore()): void {
    store = initialStore;
    TestBed.configureTestingModule({providers: [provideInMemoryPreferences(store)]});
    service = TestBed.inject(UserPreferencesService);
  }

  beforeEach(() => {
    // Sauvegarde puis neutralise les anciennes clés pour des tests déterministes.
    savedLegacy = {};
    legacyKeys.forEach(key => {
      savedLegacy[key] = localStorage.getItem(key);
      localStorage.removeItem(key);
    });
  });

  afterEach(async () => {
    await service?.reset();
    legacyKeys.forEach(key => {
      if (savedLegacy[key] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, savedLegacy[key]!);
    });
  });

  it('sans préférence enregistrée → valeurs par défaut appliquées puis enregistrées', async () => {
    setup();
    await service.init();

    expect(service.preferences()).toEqual({...DEFAULT_PREFERENCES});
    expect(service.storageStatus()).toBe('ready');
    expect(store.record?.data).toEqual({...DEFAULT_PREFERENCES});
    expect(root.getAttribute('data-contrast')).toBe('standard');
    expect(root.style.fontSize).toBe('100%');
  });

  it('première utilisation : reprend la clé localStorage `theme` et `options.flashDuration`', async () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('options', JSON.stringify({theme: 'light', flashDuration: 12, fontSize: 12}));
    setup();

    await service.init();

    expect(service.preferences().theme).toBe('dark');
    expect(service.preferences().messageDuration).toBe(12);
    expect(store.record?.data.theme).toBe('dark');
    expect(root.getAttribute('data-bs-theme')).toBe('dark');
    // Les anciennes clés ne sont pas supprimées.
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('options')).not.toBeNull();
  });

  it('préférences déjà dans IndexedDB → elles priment sur les anciennes clés', async () => {
    localStorage.setItem('theme', 'dark');
    setup(new InMemoryPreferencesStore({data: {...DEFAULT_PREFERENCES, theme: 'light', textScale: 150}}));

    await service.init();

    expect(service.preferences().theme).toBe('light');
    expect(service.preferences().textScale).toBe(150);
    expect(root.style.fontSize).toBe('150%');
  });

  it('enregistrement corrompu ou d\'un autre schéma → normalisé et réécrit', async () => {
    setup(new InMemoryPreferencesStore({schemaVersion: 0, data: {theme: 'violet', textScale: 900, inconnu: true} as any}));

    await service.init();

    expect(service.preferences().theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(service.preferences().textScale).toBe(200);
    expect(store.saves.length).toBe(1);
    expect((store.record?.data as any).inconnu).toBeUndefined();
  });

  it('IndexedDB indisponible → valeurs locales appliquées, statut « unavailable », erreur expliquée à l\'enregistrement', async () => {
    const failing = new InMemoryPreferencesStore();
    failing.loadError = new Error('IndexedDB bloquée');
    spyOn(console, 'warn');
    setup(failing);

    await service.init();
    const ok = await service.update({contrast: 'high'});

    expect(service.storageStatus()).toBe('unavailable');
    expect(ok).toBeFalse();
    expect(service.preferences().contrast).toBe('high'); // appliqué malgré tout
    expect(root.getAttribute('data-contrast')).toBe('high');
    expect(service.saveError()).toContain('ne peuvent pas être enregistrées');
  });

  it('échec d\'écriture → état conservé en mémoire et message d\'erreur', async () => {
    setup();
    await service.init();
    store.saveError = new Error('QuotaExceededError');
    spyOn(console, 'error');

    const ok = await service.update({font: 'verdana'});

    expect(ok).toBeFalse();
    expect(service.preferences().font).toBe('verdana');
    expect(service.saveError()).toContain('n\'ont pas pu être enregistrées');

    store.saveError = null;
    expect(await service.update({font: 'system'})).toBeTrue();
    expect(service.saveError()).toBeNull();
  });

  it('update → appliqué au document et enregistré à chaque modification, dans l\'ordre', async () => {
    setup();
    await service.init();

    await Promise.all([
      service.update({letterSpacing: 0.12}),
      service.update({wordSpacing: 0.16}),
      service.update({lineHeight: 2}),
    ]);

    expect(root.style.getPropertyValue('--gp-letter-spacing')).toBe('0.12em');
    expect(root.style.getPropertyValue('--gp-word-spacing')).toBe('0.16em');
    expect(root.style.getPropertyValue('--gp-line-height')).toBe('2');
    expect(store.record?.data).toEqual(jasmine.objectContaining({letterSpacing: 0.12, wordSpacing: 0.16, lineHeight: 2}));
  });

  it('toggleTheme → bascule à partir du thème affiché', async () => {
    setup(new InMemoryPreferencesStore({data: {...DEFAULT_PREFERENCES, theme: 'light'}}));
    await service.init();

    await service.toggleTheme();
    expect(service.preferences().theme).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
  });

  it('met à jour l\'instantané de premier affichage (thème, contraste, taille)', async () => {
    setup();
    await service.init();
    await service.update({theme: 'dark', textScale: 130});

    const cache = JSON.parse(localStorage.getItem(FIRST_PAINT_CACHE_KEY)!);
    expect(cache).toEqual(jasmine.objectContaining({theme: 'dark', textScale: 130, contrast: 'standard'}));
  });

  it('init est idempotent', async () => {
    setup();
    const first = service.init();
    expect(service.init()).toBe(first);
    await first;
  });
});

describe('Modèle des préférences', () => {
  it('normalizePreferences — objet vide ou invalide → valeurs par défaut', () => {
    expect(normalizePreferences(undefined)).toEqual({...DEFAULT_PREFERENCES});
    expect(normalizePreferences('n\'importe quoi')).toEqual({...DEFAULT_PREFERENCES});
  });

  it('normalizePreferences — valeurs numériques bornées, chaînes numériques acceptées', () => {
    const prefs = normalizePreferences({textScale: '175', lineHeight: 9, letterSpacing: -1, messageDuration: 99});
    expect(prefs.textScale).toBe(175);
    expect(prefs.lineHeight).toBe(2.5);
    expect(prefs.letterSpacing).toBe(0);
    expect(prefs.messageDuration).toBe(30);
  });

  it('readLegacyPreferences — ignore les valeurs illisibles', () => {
    const storage = {getItem: (key: string) => key === 'theme' ? 'bleu' : '{pas du json'};
    expect(readLegacyPreferences(storage)).toEqual({});
  });

  it('readLegacyPreferences — stockage absent → objet vide', () => {
    expect(readLegacyPreferences(null)).toEqual({});
  });
});
