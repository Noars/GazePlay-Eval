import {Type} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {findA11yProblems, findHeadingSkips} from './a11y-checks';
import {provideInMemoryPreferences} from '../core/preferences/testing/in-memory-preferences.store';
import {SaveService} from '../services/save/save.service';
import {MediaLibraryService} from '../core/media/media-library.service';
import {HomeComponent} from '../pages/home/home.component';
import {InfoEvalComponent} from '../pages/info-eval/info-eval.component';
import {InfoParticipantComponent} from '../pages/info-participant/info-participant.component';
import {SetupEvalComponent} from '../pages/setup-eval/setup-eval.component';
import {EvalManualComponent} from '../components/eval-manual/eval-manual.component';
import {CreateEvalComponent} from '../pages/create-eval/create-eval.component';
import {ModifyScreenComponent} from '../components/modify-screen/modify-screen.component';
import {DownloadEvalComponent} from '../pages/download-eval/download-eval.component';
import {SauvegardeComponent} from '../pages/sauvegarde/sauvegarde.component';
import {LoadSaveComponent} from '../pages/load-save/load-save.component';
import {OptionComponent} from '../pages/options/option.component';
import {NoPage} from '../pages/no-page/no-page';
import {GuideHomeComponent} from '../pages/guide/guide-home/guide-home.component';
import {GuideCreationComponent} from '../pages/guide/guide-creation/guide-creation.component';
import {GuideSauvegardeComponent} from '../pages/guide/guide-sauvegarde/guide-sauvegarde.component';
import {GuideImportComponent} from '../pages/guide/guide-import/guide-import.component';
import {GuideOptionsComponent} from '../pages/guide/guide-options/guide-options.component';
import {GuideDepannageComponent} from '../pages/guide/guide-depannage/guide-depannage.component';
import {NavbarComponent} from '../components/navbar/navbar.component';
import {MenuComponent} from '../components/menu/menu.component';
import {ProgressBarComponent} from '../components/progress-bar/progress-bar.component';
import {screenTypeModel} from '../shared/screenModel';
import {I18nService} from '../core/i18n/i18n.service';

/**
 * Vérifications d'accessibilité automatisées sur chaque page et sur les composants de
 * structure (noms accessibles, libellés, alt, identifiants, titres).
 * Voir `a11y-checks.ts` pour la portée — et les limites — de ces contrôles.
 */
describe('Accessibilité (contrôles automatisés)', () => {
  const screens: screenTypeModel[] = [
    {name: 'Consigne', type: 'instruction', values: [true, 5, true, 'Texte', 'Regarde le chat', undefined, true, 1, '']},
    {
      name: 'Grille', type: 'stimuli', values: [2, 2, true, 10, 1, 'Tout', 1, false, false, true, 'bip.mp3', undefined, {
        0: {imageName: 'chat.png', imageId: 'A11y/chat.png', soundName: 'miaou.mp3', soundId: '', goodAnswer: true, hidden: false},
        1: {imageName: '', soundName: '', goodAnswer: false, hidden: false},
        2: {imageName: '', soundName: '', goodAnswer: false, hidden: true},
        3: {imageName: 'chien.png', soundName: '', goodAnswer: false, hidden: false},
      }, ''],
    },
    {name: 'Pause', type: 'transition', values: [true, 2, true, true, 1]},
  ];

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideInMemoryPreferences(),
        // Aucune lecture IndexedDB réelle pendant ces tests de rendu.
        {provide: MediaLibraryService, useValue: {
          resolve: () => Promise.resolve(undefined),
          release: () => Promise.resolve(false),
          addReference: () => Promise.resolve(),
          store: () => Promise.resolve(''),
          idFor: (name: string) => `A11y/${name}`,
        }},
      ],
    }).compileComponents();

    const save = TestBed.inject(SaveService);
    save.dataAuto = {
      nomEval: 'A11y', format: 'Csv&Xlsx', infoParticipant: ['Nom', 'Âge'],
      globalParamsTransitionScreen: [true, 10, false, false, 0],
      globalParamsInstructionScreen: [true, 10, false, 'Image', false, 1],
      globalParamsStimuliScreen: [1, 1, false, 10, 1, 1, false, false],
      listScreens: structuredClone(screens), step: 3,
    };
    save.saveToSlot(0, save.dataAuto);
    save.saveToSlot(2, save.dataAuto);
  });

  afterEach(() => localStorage.clear());

  async function render<T>(component: Type<T>, setup?: (instance: T) => void): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(component);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function expectAccessible(fixture: ComponentFixture<unknown>, options: {singleH1?: boolean} = {}): void {
    const root = fixture.nativeElement as HTMLElement;
    expect(findA11yProblems(root)).withContext(root.tagName).toEqual([]);
    expect(findHeadingSkips(root)).withContext(root.tagName).toEqual([]);
    if (options.singleH1 !== false) {
      expect(root.querySelectorAll('h1').length).withContext(`${root.tagName} : un seul h1`).toBe(1);
    }
  }

  const pages: [string, Type<unknown>][] = [
    ['Accueil', HomeComponent],
    ['Étape 1', InfoEvalComponent],
    ['Étape 2', InfoParticipantComponent],
    ['Étape 3 (choix du mode)', SetupEvalComponent],
    ['Étape 4 (liste des écrans)', CreateEvalComponent],
    ['Étape 5', DownloadEvalComponent],
    ['Sauvegardes', SauvegardeComponent],
    ['Chargement', LoadSaveComponent],
    ['Options', OptionComponent],
    ['Page introuvable', NoPage],
    ['Guide (sommaire)', GuideHomeComponent],
    ['Guide création', GuideCreationComponent],
    ['Guide sauvegardes', GuideSauvegardeComponent],
    ['Guide import', GuideImportComponent],
    ['Guide options', GuideOptionsComponent],
    ['Guide dépannage', GuideDepannageComponent],
  ];

  for (const [label, component] of pages) {
    it(`${label} : aucun problème détecté`, async () => {
      expectAccessible(await render(component));
    });
  }

  it('Étape 3 (paramètres globaux, toutes sections ouvertes) : aucun problème détecté', async () => {
    for (const section of ['transition', 'instruction', 'stimuli']) {
      const fixture = await render(EvalManualComponent, c => c.openAccordion = section);
      expectAccessible(fixture);
    }
  });

  for (const index of [0, 1, 2]) {
    it(`Éditeur d'écran (${screens[index].type}) : aucun problème détecté`, async () => {
      const fixture = await render(ModifyScreenComponent, c => c.screenToModify = structuredClone(screens[index]));
      expectAccessible(fixture);
    });
  }

  it('Éditeur de stimuli avec une case ouverte dans le panneau : aucun problème détecté', async () => {
    const fixture = await render(ModifyScreenComponent, c => c.screenToModify = structuredClone(screens[1]));
    fixture.componentInstance.openStimuliData(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expectAccessible(fixture);
    expect(fixture.nativeElement.querySelector('app-config-stimuli')).not.toBeNull();
  });

  it('Interface en anglais : aucun problème détecté sur les pages ni sur l\'éditeur de stimuli', async () => {
    TestBed.inject(I18nService).setLanguage('en');
    for (const [label, component] of pages) {
      const fixture = await render(component);
      expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
        .withContext(`${label} : titre traduit`).not.toMatch(/[éèàç]|Étape|Évaluation/);
      expectAccessible(fixture);
    }
    expectAccessible(await render(ModifyScreenComponent, c => c.screenToModify = structuredClone(screens[1])));
    expectAccessible(await render(NavbarComponent), {singleH1: false});
  });

  it('Structure : en-tête, navigation et étapes', async () => {
    expectAccessible(await render(NavbarComponent), {singleH1: false});
    expectAccessible(await render(MenuComponent, c => c.mode = 'sidebar'), {singleH1: false});
    expectAccessible(await render(ProgressBarComponent, c => {
      c.steps = ['A', 'B', 'C'];
      c.currentStepIndex = 1;
    }), {singleH1: false});
  });
});
