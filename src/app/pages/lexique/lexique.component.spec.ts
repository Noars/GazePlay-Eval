import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {LexiqueComponent, normalizeForSearch} from './lexique.component';
import {LEXIQUE_ENTRIES} from './lexique-entries';
import {I18nService} from '../../core/i18n/i18n.service';
import {provideInMemoryPreferences} from '../../core/preferences/testing/in-memory-preferences.store';
import {routes} from '../../app.routes';

/** Sections du guide citées par le lexique (`id` des sections de chaque page, en français). */
const GUIDE_SECTIONS: Record<string, string[]> = {
  '': [],
  creation: ['info-participant', 'setup-eval', 'create-eval', 'download-eval'],
  sauvegardes: ['auto-save', 'my-saves', 'load', 'storage'],
  imports: ['formats', 'export', 'import'],
  options: ['language', 'appearance', 'reading', 'notifications', 'media-storage', 'keyboard'],
  depannage: ['storage-full', 'media-missing', 'export-blocked', 'crop-error', 'eval-missing', 'other-computer',
    'storage-update', 'preferences', 'automatic-mode', 'several-tabs'],
};

describe('LexiqueComponent', () => {
  let fixture: ComponentFixture<LexiqueComponent>;
  let component: LexiqueComponent;
  let i18n: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LexiqueComponent],
      providers: [provideRouter([]), provideInMemoryPreferences()],
    }).compileComponents();
    i18n = TestBed.inject(I18nService);
    i18n.setLanguage('fr');
    fixture = TestBed.createComponent(LexiqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => i18n.setLanguage('fr'));

  function search(text: string): HTMLElement {
    const input = fixture.nativeElement.querySelector('#lexique-search') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  // ─── Contenu ──────────────────────────────────────────────────────────────

  it('chaque terme a un identifiant unique et ses deux versions (français et anglais) remplies', () => {
    const ids = LEXIQUE_ENTRIES.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of LEXIQUE_ENTRIES) {
      for (const language of ['fr', 'en'] as const) {
        expect(entry[language].term.trim(), `${entry.id} (${language})`).not.toBe('');
        expect(entry[language].definition.trim(), `${entry.id} (${language})`).not.toBe('');
      }
    }
  });

  it('les liens « Voir aussi » visent des termes existants, autres que le terme lui-même', () => {
    const ids = new Set(LEXIQUE_ENTRIES.map(entry => entry.id));
    for (const entry of LEXIQUE_ENTRIES) {
      for (const related of entry.related ?? []) {
        expect(ids.has(related), `${entry.id} → ${related}`).toBe(true);
        expect(related, entry.id).not.toBe(entry.id);
      }
    }
  });

  it('les liens vers le guide visent une page et une section existantes', () => {
    const guidePages = routes.find(route => route.path === 'guide')?.children?.map(child => child.path) ?? [];
    for (const entry of LEXIQUE_ENTRIES.filter(e => e.guide)) {
      const {page, section} = entry.guide!;
      expect(guidePages, entry.id).toContain(page);
      if (section) expect(GUIDE_SECTIONS[page], entry.id).toContain(section);
    }
  });

  it('la route /lexique affiche le lexique, avec un titre de page', () => {
    const route = routes.find(r => r.path === 'lexique');
    expect(route?.component).toBe(LexiqueComponent);
    expect(route?.title).toBe('title.glossary');
  });

  // ─── Tri et regroupement ──────────────────────────────────────────────────

  it('tous les termes sont affichés, triés par ordre alphabétique et regroupés par lettre', () => {
    const el = fixture.nativeElement as HTMLElement;
    const terms = Array.from(el.querySelectorAll('.lexique-term__name')).map(h => h.textContent!.trim());
    expect(terms.length).toBe(LEXIQUE_ENTRIES.length);

    const letters = component.groups().map(group => group.letter);
    expect(letters).toStrictEqual([...letters].sort());
    expect(new Set(letters).size).toBe(letters.length);
    expect(el.querySelector('#lexique-count')?.textContent).toContain(`${LEXIQUE_ENTRIES.length} termes`);
  });

  it('accents et ponctuation initiale ignorés : « Écran » sous E, « .gpSave » sous G', () => {
    const letterOf = (id: string) => component.groups().find(g => g.items.some(item => item.id === id))?.letter;
    expect(letterOf('screen')).toBe('E');
    expect(letterOf('gpsave')).toBe('G');
    expect(letterOf('zip')).toBe('Z');
  });

  it('en anglais → termes et définitions anglais, triés dans cette langue', () => {
    i18n.setLanguage('en');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Glossary');
    expect(el.querySelector('#term-evaluation')?.textContent).toContain('Assessment');
    expect(component.groups().find(g => g.items.some(item => item.id === 'evaluation'))?.letter).toBe('A');
  });

  // ─── Recherche ────────────────────────────────────────────────────────────

  it("arrivée sur la page → focus dans le champ de recherche, désigné aussi pour le focus après navigation", () => {
    const input = fixture.nativeElement.querySelector('#lexique-search') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.hasAttribute('data-route-focus')).toBe(true);
  });

  it('recherche sans accents ni majuscules, dans le terme et la définition', () => {
    const el = search('ECRAN DE TRANSITION');
    const ids = component.groups().flatMap(g => g.items.map(item => item.id));

    expect(ids).toContain('transition-screen');
    expect(ids).not.toContain('csv');
    expect(el.querySelector('#lexique-count')?.textContent).toContain(`${ids.length} terme`);

    search('oculometre');
    expect(component.groups().flatMap(g => g.items.map(item => item.id))).toContain('eye-tracking');
  });

  it('aucun résultat → message et bouton pour effacer la recherche', () => {
    let el = search('zzzz');
    expect(el.querySelector('.lexique-empty')?.textContent).toContain('Aucun terme ne correspond à « zzzz »');
    expect(el.querySelector('.lexique-letters')).toBeNull();

    (el.querySelector('.lexique-empty button') as HTMLButtonElement).click();
    fixture.detectChanges();
    el = fixture.nativeElement;
    expect(el.querySelectorAll('.lexique-term').length).toBe(LEXIQUE_ENTRIES.length);
    expect(document.activeElement?.id).toBe('lexique-search');
  });

  // ─── Liens ────────────────────────────────────────────────────────────────

  it('index des lettres : une ancre utilisable par lettre affichée', () => {
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('.lexique-letters__link')) as HTMLAnchorElement[];

    expect(links.map(a => a.textContent!.trim())).toStrictEqual(component.groups().map(g => g.letter));
    links.forEach(link => {
      const letter = link.textContent!.trim();
      expect(link.getAttribute('href')).toBe(`#/lexique#letter-${letter}`);
      expect(el.querySelector(`#letter-${letter}`)).not.toBeNull();
    });
  });

  it('clic sur « Voir aussi » → pas de navigation, focus sur le terme visé', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('#term-gpsave')!.closest('article')!
      .querySelector('a[href="#/lexique#term-zip"]') as HTMLAnchorElement;
    const event = new MouseEvent('click', {cancelable: true});

    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('term-zip');
  });

  it('terme visé masqué par la recherche → la recherche est effacée pour l\'afficher', async () => {
    search('gpsave');
    expect(fixture.nativeElement.querySelector('#term-csv')).toBeNull();

    component.goTo(new Event('click'), 'term-csv');
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));

    expect(component.query()).toBe('');
    expect(document.activeElement?.id).toBe('term-csv');
  });

  it('lien vers le guide : page et section, avec le terme pour les lecteurs d\'écran', () => {
    const article = (fixture.nativeElement as HTMLElement).querySelector('#term-slot')!.closest('article')!;
    const link = article.querySelector('a[href^="#/guide"]') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('#/guide/sauvegardes#my-saves');
    expect(link.textContent).toContain('En savoir plus dans le guide');
    expect(link.textContent).toContain('Emplacement');
    expect(component.guideHref({page: 'creation'})).toBe('#/guide/creation');
  });

  it('normalizeForSearch → minuscules sans accents', () => {
    expect(normalizeForSearch('Écran d\'Instruction')).toBe('ecran d\'instruction');
  });
});
