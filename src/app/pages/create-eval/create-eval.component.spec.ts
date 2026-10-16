import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {CreateEvalComponent} from './create-eval.component';
import {SaveService} from '../../services/save/save.service';
import {UpdateScreensService} from '../../services/updateScreens/update-screens.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {MediaLibraryService} from '../../core/media/media-library.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {FlashService} from '../../services/flash-message/flash.service';
import {screenTypeModel} from '../../shared/screenModel';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('CreateEvalComponent', () => {
  let component: CreateEvalComponent;
  let fixture: ComponentFixture<CreateEvalComponent>;
  let routerSpy: Mocked<Router>;
  let saveServiceSpy: Mocked<SaveService>;
  let autoSaveSpy: Mocked<AutoSaveService>;
  let mediaSpy: Mocked<MediaLibraryService>;
  let confirmSpy: Mocked<ConfirmService>;

  function stimuliScreen(name = 'Grille'): screenTypeModel {
    return {
      name, type: 'stimuli',
      values: [1, 2, false, 10, 1, 'Tout', 1, false, false, true, 'bip.mp3', undefined, {
        0: {imageName: 'chat.png', imageId: 'TestEval/chat.png', soundName: '', soundId: '', goodAnswer: true, hidden: false},
        1: {imageName: '', imageId: '', soundName: 'miaou.mp3', soundId: 'TestEval/miaou.mp3', goodAnswer: false, hidden: false},
      }, 'TestEval/bip.mp3'],
    };
  }

  beforeEach(async () => {
    routerSpy = createSpyObj('Router', ['navigate']);
    routerSpy.navigate.mockReturnValue(Promise.resolve(true));

    saveServiceSpy = createSpyObj('SaveService', ['saveDataAuto']);
    saveServiceSpy.dataAuto = {
      nomEval: 'TestEval',
      format: 'Csv&Xlsx',
      infoParticipant: [],
      globalParamsTransitionScreen: [true, 3, false, false, 0],
      globalParamsInstructionScreen: [true, 10, true, 'Texte', false, 1],
      globalParamsStimuliScreen: [2, 3, false, 10, 1, 1, false, false],
      listScreens: [],
      step: 3
    };
    autoSaveSpy = createSpyObj('AutoSaveService', ['autoSave']);
    mediaSpy = createSpyObj('MediaLibraryService', ['resolve', 'addReference', 'release']);
    mediaSpy.resolve.mockReturnValue(Promise.resolve(undefined));
    mediaSpy.addReference.mockReturnValue(Promise.resolve());
    mediaSpy.release.mockReturnValue(Promise.resolve(true));
    confirmSpy = createSpyObj('ConfirmService', ['confirm']);
    confirmSpy.confirm.mockReturnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [CreateEvalComponent],
      providers: [
        UpdateScreensService,
        {provide: Router, useValue: routerSpy},
        {provide: SaveService, useValue: saveServiceSpy},
        {provide: AutoSaveService, useValue: autoSaveSpy},
        {provide: MediaLibraryService, useValue: mediaSpy},
        {provide: ConfirmService, useValue: confirmSpy},
        {provide: FlashService, useValue: createSpyObj('FlashService', ['show'])},
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit → loadData()
  });

  it('devrait être créé avec un état vide explicite', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Aucun écran pour l\'instant');
  });

  // ─── Ajout ────────────────────────────────────────────────────────────────

  it('addScreen() sans type → écran de transition « Ecran 1 », sélectionné et sauvegardé', () => {
    component.addScreen();

    expect(component.listScreens.length).toBe(1);
    expect(component.listScreens[0].type).toBe('transition');
    expect(component.listScreens[0].name).toBe('Ecran 1');
    expect(component.listScreens[0].values[1]).toBe(3); // paramètre global appliqué
    expect(component.selectedScreen).toBe(component.listScreens[0]);
    expect(component.indexSelectedScreen).toBe(0);
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('create-eval');
  });

  it('addScreen(stimuli) → grille pré-remplie avec les paramètres globaux', () => {
    component.addScreen('stimuli');
    const screen = component.listScreens[0];
    expect(screen.type).toBe('stimuli');
    expect(screen.values[0]).toBe(2);
    expect(screen.values[1]).toBe(3);
  });

  it('addScreen(instruction) → écran d\'instruction', () => {
    component.addScreen('instruction');
    expect(component.listScreens[0].type).toBe('instruction');
    expect(component.listScreens[0].values[3]).toBe('Texte');
  });

  it('noms par défaut uniques même après suppression', async () => {
    component.addScreen();
    component.addScreen();
    await component.removeScreen(component.listScreens[0], false);
    component.addScreen();
    const names = component.listScreens.map(s => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  // ─── Suppression ──────────────────────────────────────────────────────────

  it('removeScreen → demande confirmation puis retire l\'écran', async () => {
    const screenA: screenTypeModel = {name: 'Ecran 1', type: 'transition', values: []};
    const screenB: screenTypeModel = {name: 'Ecran 2', type: 'transition', values: []};
    component.listScreens = [screenA, screenB];
    component.selectedScreen = screenA;

    await component.removeScreen(screenB);

    expect(confirmSpy.confirm).toHaveBeenCalledWith(expect.objectContaining({tone: 'danger'}));
    expect(component.listScreens).toStrictEqual([screenA]);
    expect(component.selectedScreen).toBe(screenA);
    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
  });

  it('removeScreen — confirmation refusée → rien ne change', async () => {
    const screen: screenTypeModel = {name: 'Ecran 1', type: 'transition', values: []};
    component.listScreens = [screen];
    confirmSpy.confirm.mockReturnValue(Promise.resolve(false));

    await component.removeScreen(screen);

    expect(component.listScreens.length).toBe(1);
  });

  it('removeScreen — écran sélectionné → l\'écran voisin devient sélectionné', async () => {
    const screenA: screenTypeModel = {name: 'A', type: 'transition', values: []};
    const screenB: screenTypeModel = {name: 'B', type: 'transition', values: []};
    component.listScreens = [screenA, screenB];
    component.selectScreen(screenA, 0);

    await component.removeScreen(screenA);

    expect(component.selectedScreen).toBe(screenB);
    expect(component.indexSelectedScreen).toBe(0);
  });

  it('removeScreen — dernier écran → plus aucune sélection', async () => {
    const screen: screenTypeModel = {name: 'A', type: 'transition', values: []};
    component.listScreens = [screen];
    component.selectScreen(screen, 0);

    await component.removeScreen(screen);

    expect(component.selectedScreen).toBeNull();
  });

  it('removeScreen — écran de stimuli → libère ses médias (image, son de case, son global)', async () => {
    const screen = stimuliScreen();
    component.listScreens = [screen];

    await component.removeScreen(screen);
    await fixture.whenStable();

    expect(mediaSpy.release).toHaveBeenCalledWith('TestEval/chat.png', 'image');
    expect(mediaSpy.release).toHaveBeenCalledWith('TestEval/miaou.mp3', 'sound');
    expect(mediaSpy.release).toHaveBeenCalledWith('TestEval/bip.mp3', 'sound');
  });

  // ─── Duplication ──────────────────────────────────────────────────────────

  it('duplicateScreen → copie insérée après l\'original, références de médias ajoutées', async () => {
    const screen = stimuliScreen('Grille');
    component.listScreens = [screen, {name: 'Fin', type: 'transition', values: []}];

    await component.duplicateScreen(screen, 0);

    expect(component.listScreens.length).toBe(3);
    expect(component.listScreens[1].name).toBe('Grille (copie)');
    expect(component.listScreens[1]).not.toBe(screen);
    expect(component.listScreens[1].values[12][0].imageName).toBe('chat.png');
    expect(mediaSpy.addReference).toHaveBeenCalledWith('TestEval/chat.png');
    expect(mediaSpy.addReference).toHaveBeenCalledWith('TestEval/miaou.mp3');
    expect(mediaSpy.addReference).toHaveBeenCalledWith('TestEval/bip.mp3');
    expect(component.selectedScreen).toBe(component.listScreens[1]);
  });

  it('duplicateScreen — modifier la copie ne modifie pas l\'original', async () => {
    const screen = stimuliScreen();
    component.listScreens = [screen];
    await component.duplicateScreen(screen, 0);

    component.listScreens[1].values[12][0].goodAnswer = false;

    expect(screen.values[12][0].goodAnswer).toBe(true);
  });

  // ─── Ordre ────────────────────────────────────────────────────────────────

  it('moveScreen → déplace l\'écran et conserve la sélection', () => {
    const a: screenTypeModel = {name: 'A', type: 'transition', values: []};
    const b: screenTypeModel = {name: 'B', type: 'transition', values: []};
    component.listScreens = [a, b];
    component.selectScreen(a, 0);

    component.moveScreen(0, 1);

    expect(component.listScreens).toStrictEqual([b, a]);
    expect(component.indexSelectedScreen).toBe(1);
    expect(component.announcement).toContain('position 2');
  });

  it('moveScreen — hors limites → rien ne change', () => {
    const a: screenTypeModel = {name: 'A', type: 'transition', values: []};
    component.listScreens = [a];
    component.moveScreen(0, -1);
    expect(component.listScreens).toStrictEqual([a]);
  });

  it('drop → réordonne listScreens et suit l\'écran sélectionné', () => {
    const a: screenTypeModel = {name: 'A', type: 'transition', values: []};
    const b: screenTypeModel = {name: 'B', type: 'transition', values: []};
    const c: screenTypeModel = {name: 'C', type: 'transition', values: []};
    component.listScreens = [a, b, c];
    component.selectScreen(a, 0);

    component.drop({previousIndex: 0, currentIndex: 2});

    expect(component.listScreens).toStrictEqual([b, c, a]);
    expect(component.indexSelectedScreen).toBe(2);
  });

  // ─── Sélection, renommage, aperçu ─────────────────────────────────────────

  it('selectScreen → met à jour selectedScreen et indexSelectedScreen', () => {
    const screen: screenTypeModel = {name: 'A', type: 'transition', values: []};
    component.selectScreen(screen, 3);
    expect(component.selectedScreen).toBe(screen);
    expect(component.indexSelectedScreen).toBe(3);
  });

  it('getNameCurrentScreen / getTypeCurrentScreen', () => {
    expect(component.getNameCurrentScreen()).toBe('');
    component.selectedScreen = stimuliScreen('Grille');
    expect(component.getNameCurrentScreen()).toBe('Grille');
    expect(component.getTypeCurrentScreen()).toBe('Écran de stimuli');
  });

  it('screenSummary → résumé lisible par type', () => {
    expect(component.screenSummary(stimuliScreen())).toBe('Grille 1 × 2');
    expect(component.screenSummary({name: 'P', type: 'transition', values: [true, 2]})).toBe('Pause de 2 s');
    expect(component.screenSummary({name: 'I', type: 'instruction', values: [false, 1, true, 'Image', 'a.png']})).toBe('Image : a.png');
  });

  it('editNameScreen → active le renommage ; exitInputScreen → le termine et sauvegarde', () => {
    const screen: screenTypeModel = {name: '', type: 'transition', values: []};
    component.listScreens = [screen];

    component.editNameScreen(screen, false, 0);
    expect(component.renamingIndex).toBe(0);
    expect(component.editNameScreenDisable).toBe(false);

    component.exitInputScreen();
    expect(component.renamingIndex).toBe(-1);
    expect(component.editNameScreenDisable).toBe(true);
    expect(screen.name).toBe('Ecran 1'); // un nom vide est remplacé
    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
  });

  it('getStimuliCells → une entrée par case de la grille sélectionnée', () => {
    component.selectedScreen = stimuliScreen();
    expect(component.getStimuliCells().length).toBe(2);
  });

  it('hasSounds → vrai si une case visible a un son', () => {
    component.selectedScreen = stimuliScreen();
    expect(component.hasSounds()).toBe(true);
  });

  it('onModifyScreenChange → remplace l\'écran édité et ferme l\'éditeur', () => {
    const original: screenTypeModel = {name: 'A', type: 'transition', values: []};
    const edited: screenTypeModel = {name: 'A', type: 'instruction', values: [false, 1, false, 'Image', '']};
    component.listScreens = [original];
    component.indexSelectedScreen = 0;
    component.isModifyScreen = true;

    component.onModifyScreenChange({screen: edited, flag: false});

    expect(component.listScreens[0]).toBe(edited);
    expect(component.isModifyScreen).toBe(false);
    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  it('backToSetupEval → sauvegarde puis /setup-eval', () => {
    component.backToSetupEval();
    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/setup-eval']);
  });

  it('goToDownloadEval → sauvegarde puis /download-eval', () => {
    component.goToDownloadEval();
    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/download-eval']);
  });

  // ─── Accessibilité ────────────────────────────────────────────────────────

  it('chaque bouton d\'action d\'un écran a un nom accessible explicite', () => {
    component.listScreens = [stimuliScreen('Grille')];
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.screen-item__actions button') as NodeListOf<HTMLButtonElement>;
    expect(buttons.length).toBe(5);
    buttons.forEach(button => expect(button.getAttribute('aria-label')).toContain('Grille'));
  });
});
