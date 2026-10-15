import {TestBed} from '@angular/core/testing';
import {UserPreferencesService} from './user-preferences.service';
import {InMemoryPreferencesStore, provideInMemoryPreferences} from './testing/in-memory-preferences.store';
import {DEFAULT_PREFERENCES, normalizePreferences, readLegacyPreferences} from './user-preferences.model';
import {FIRST_PAINT_CACHE_KEY} from './preferences-dom';
import {I18nService} from '../i18n/i18n.service';

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

  it('mode daltonisme → appliqué au document, enregistré et retrouvé après rechargement', async () => {
    setup();
    await service.init();
    expect(root.getAttribute('data-color-blind')).toBe('false');

    await service.update({colorBlindMode: true});

    expect(root.getAttribute('data-color-blind')).toBe('true');
    expect(store.record?.data.colorBlindMode).toBeTrue();
    expect(JSON.parse(localStorage.getItem(FIRST_PAINT_CACHE_KEY)!).colorBlindMode).toBeTrue();

    // Rechargement simulé : nouvelle instance du service sur le même stockage.
    const persisted = store;
    root.setAttribute('data-color-blind', 'false');
    TestBed.resetTestingModule();
    setup(persisted);
    await service.init();

    expect(service.preferences().colorBlindMode).toBeTrue();
    expect(root.getAttribute('data-color-blind')).toBe('true');

    await service.update({colorBlindMode: false});
    expect(root.getAttribute('data-color-blind')).toBe('false');
    expect(store.record?.data.colorBlindMode).toBeFalse();
  });

  it('enregistrement antérieur sans mode daltonisme → désactivé, autres réglages conservés, rien réécrit', async () => {
    const {colorBlindMode, ...older} = DEFAULT_PREFERENCES;
    setup(new InMemoryPreferencesStore({data: {...older, contrast: 'high'} as any}));

    await service.init();

    expect(service.preferences().colorBlindMode).toBeFalse();
    expect(service.preferences().contrast).toBe('high');
    expect(store.saves.length).toBe(0);
  });

  it('langue : français par défaut, appliquée à <html lang>, enregistrée et retrouvée après rechargement', async () => {
    setup();
    await service.init();
    expect(service.preferences().language).toBe('fr');
    expect(root.getAttribute('lang')).toBe('fr');

    await service.setLanguage('en');

    expect(root.getAttribute('lang')).toBe('en');
    expect(TestBed.inject(I18nService).language()).toBe('en');
    expect(store.record?.data.language).toBe('en');
    expect(JSON.parse(localStorage.getItem(FIRST_PAINT_CACHE_KEY)!).language).toBe('en');

    const persisted = store;
    TestBed.resetTestingModule();
    setup(persisted);
    await service.init();
    expect(service.preferences().language).toBe('en');
    expect(TestBed.inject(I18nService).language()).toBe('en');

    await service.setLanguage('fr');
    expect(root.getAttribute('lang')).toBe('fr');
  });

  it('reset → rétablit l\'affichage mais conserve la langue choisie', async () => {
    setup();
    await service.init();
    await service.update({language: 'en', theme: 'dark', textScale: 150});

    await service.reset();

    expect(service.preferences()).toEqual({...DEFAULT_PREFERENCES, language: 'en'});
    await service.setLanguage('fr');
  });

  it('enregistrement antérieur sans langue → français, autres réglages conservés, rien réécrit', async () => {
    const {language, ...older} = DEFAULT_PREFERENCES;
    setup(new InMemoryPreferencesStore({data: {...older, theme: 'dark'} as any}));

    await service.init();

    expect(service.preferences().language).toBe('fr');
    expect(service.preferences().theme).toBe('dark');
    expect(store.saves.length).toBe(0);
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

  it('normalizePreferences — langue : seules `fr` et `en` sont acceptées', () => {
    expect(normalizePreferences({language: 'en'}).language).toBe('en');
    expect(normalizePreferences({language: 'de'}).language).toBe('fr');
    expect(normalizePreferences({}).language).toBe('fr');
  });

  it('normalizePreferences — mode daltonisme : seul un booléen est accepté', () => {
    expect(normalizePreferences({colorBlindMode: true}).colorBlindMode).toBeTrue();
    expect(normalizePreferences({colorBlindMode: 'true'}).colorBlindMode).toBeFalse();
    expect(normalizePreferences({}).colorBlindMode).toBeFalse();
  });

  it('readLegacyPreferences — ignore les valeurs illisibles', () => {
    const storage = {getItem: (key: string) => key === 'theme' ? 'bleu' : '{pas du json'};
    expect(readLegacyPreferences(storage)).toEqual({});
  });

  it('readLegacyPreferences — stockage absent → objet vide', () => {
    expect(readLegacyPreferences(null)).toEqual({});
  });
});
