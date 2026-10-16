import {ChangeDetectionStrategy, Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Title} from '@angular/platform-browser';
import {provideRouter, Router, TitleStrategy} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {I18nService} from './i18n.service';
import {TranslatePipe} from './translate.pipe';
import {FR} from './locales/fr';
import {EN} from './locales/en';
import {AppTitleStrategy} from '../a11y/app-title.strategy';
import {ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {INSTRUCTION_MEDIA_OPTIONS} from '../../components/global-instruction-screen/global-instruction-screen.component';

/** Noms des paramètres `{nom}` d'un texte, triés. */
function placeholders(text: string): string[] {
  return (text.match(/\{\w+\}/g) ?? []).sort();
}

describe('I18nService', () => {
  let i18n: I18nService;

  beforeEach(() => {
    i18n = TestBed.inject(I18nService);
  });

  it('français par défaut', () => {
    expect(i18n.language()).toBe('fr');
    expect(i18n.t('nav.home')).toBe('Accueil');
  });

  it('setLanguage(\'en\') → textes anglais', () => {
    i18n.setLanguage('en');
    expect(i18n.language()).toBe('en');
    expect(i18n.t('nav.home')).toBe('Home');
  });

  it('remplace les paramètres, garde ceux qui ne sont pas fournis, vide null/undefined', () => {
    expect(i18n.t('steps.counter', {current: 2, total: 5})).toBe('Étape 2 sur 5');
    expect(i18n.t('steps.counter', {current: 2})).toBe('Étape 2 sur {total}');
    expect(i18n.t('editor.preview.of', {name: undefined})).toBe('Aperçu de ');
  });
});

describe('Dictionnaires de traduction', () => {
  const frKeys = Object.keys(FR).sort();
  const enKeys = Object.keys(EN).sort();

  it('le français et l\'anglais ont exactement les mêmes clés', () => {
    expect(enKeys).toStrictEqual(frKeys);
  });

  it('aucun texte anglais vide là où le français a du texte', () => {
    const empty = frKeys.filter(key => FR[key as keyof typeof FR].trim() && !EN[key as keyof typeof EN].trim());
    // Exceptions volontaires : morceaux de phrase qui n'existent qu'en français (« Fichier » avant <code>).
    expect(empty.sort()).toStrictEqual(['download.backup.before', 'download.export.before', 'import.subtitle.before']);
  });

  it('chaque traduction anglaise utilise les mêmes paramètres que le français', () => {
    const mismatches = frKeys.filter(key =>
      placeholders(FR[key as keyof typeof FR]).join() !== placeholders(EN[key as keyof typeof EN]).join());
    expect(mismatches).toStrictEqual([]);
  });
});

@Component({
  template: `<p class="t">{{ 'nav.home' | t }}</p>
             <app-choice-setting label="Q" [(ngModel)]="value"></app-choice-setting>`,
  imports: [TranslatePipe, ChoiceSettingComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  value = true;
}

describe('TranslatePipe', () => {
  it('suit le changement de langue, y compris dans un composant OnPush (Oui/Non → Yes/No)', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const labels = () => Array.from(el.querySelectorAll('label')).map(label => label.textContent?.trim());

    expect(el.querySelector('.t')?.textContent).toBe('Accueil');
    expect(labels()).toStrictEqual(['Oui', 'Non']);

    TestBed.inject(I18nService).setLanguage('en');
    await fixture.whenStable();

    expect(el.querySelector('.t')?.textContent).toBe('Home');
    expect(labels()).toStrictEqual(['Yes', 'No']);
  });
});

describe('Compatibilité des valeurs enregistrées', () => {
  it('les types de média gardent leurs valeurs françaises quelle que soit la langue', () => {
    TestBed.inject(I18nService).setLanguage('en');
    expect(INSTRUCTION_MEDIA_OPTIONS.map(option => option.value)).toStrictEqual(['Image', 'Video', 'Texte', 'Son']);
  });
});

describe('AppTitleStrategy', () => {
  it('titre du document traduit, et retraduit au changement de langue', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{path: 'option', component: HostComponent, title: 'title.options'}]),
        {provide: TitleStrategy, useClass: AppTitleStrategy},
      ],
    });
    const title = TestBed.inject(Title);
    await TestBed.inject(Router).navigateByUrl('/option');
    expect(title.getTitle()).toBe('Options et accessibilité — GazePlay Eval');

    TestBed.inject(I18nService).setLanguage('en');
    TestBed.tick();
    expect(title.getTitle()).toBe('Options and accessibility — GazePlay Eval');
  });
});
