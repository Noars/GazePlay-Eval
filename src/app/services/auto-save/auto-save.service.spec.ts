import { TestBed } from '@angular/core/testing';
import { AutoSaveService } from './auto-save.service';
import { Router, NavigationStart } from '@angular/router';
import { SaveService } from '../save/save.service';
import { FlashService } from '../flash-message/flash.service';
import { LoadService } from '../load/load.service';
import { MediaCleanupService } from '../../core/media/media-cleanup.service';
import { Subject } from 'rxjs';
import { saveModelDefault } from '../../shared/saveModel';
import type { Mock, Mocked } from 'vitest';
import { createSpyObj } from '../../testing/spy-obj';

describe('AutoSaveService', () => {
  let service: AutoSaveService;
  let routerEvents$: Subject<any>;
  let routerSpy: Mocked<Router>;
  let saveServiceSpy: Mocked<SaveService>;
  let flashServiceSpy: Mocked<FlashService>;
  let loadServiceSpy: Mocked<LoadService>;
  let cleanupSpy: Mocked<MediaCleanupService>;

  beforeEach(() => {
    routerEvents$ = new Subject();
    routerSpy = createSpyObj('Router', ['navigate'], {
      events: routerEvents$.asObservable(),
      url: '/home'
    });
    routerSpy.navigate.mockReturnValue(Promise.resolve(true));

    saveServiceSpy = createSpyObj('SaveService', ['saveToSlot', 'loadIntoWorkspace'], {
      dataAuto: { ...saveModelDefault, nomEval: 'TestEval', step: 0 },
      hasLoadedWorkspace: true
    });
    saveServiceSpy.loadIntoWorkspace.mockImplementation((save: any) => Object.assign(saveServiceSpy.dataAuto, save));
    saveServiceSpy.activeSlotIndex = null;

    flashServiceSpy = createSpyObj('FlashService', ['show']);
    loadServiceSpy = createSpyObj('LoadService', ['getSlot']);
    cleanupSpy = createSpyObj('MediaCleanupService', ['cleanupProject']);
    cleanupSpy.cleanupProject.mockReturnValue(Promise.resolve(0));

    TestBed.configureTestingModule({
      providers: [
        AutoSaveService,
        { provide: Router,         useValue: routerSpy },
        { provide: SaveService,    useValue: saveServiceSpy },
        { provide: FlashService,   useValue: flashServiceSpy },
        { provide: LoadService,    useValue: loadServiceSpy },
        { provide: MediaCleanupService, useValue: cleanupSpy }
      ]
    });

    service = TestBed.inject(AutoSaveService);
    loadServiceSpy.getSlot.mockReturnValue({ ...saveModelDefault, nomEval: 'TestEval', step: 0 });
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('init → s\'abonne aux événements NavigationStart', () => {
    service.init();
    routerEvents$.next(new NavigationStart(1, '/create-eval'));
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalled();
  });

  it('autoSave sur page exclue → ne sauvegarde pas', () => {
    service.autoSave('/home');
    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it('autoSave sur page normale → step mis à jour et slot 0 sauvegardé', () => {
    service.autoSave('/create-eval');
    expect(saveServiceSpy.dataAuto.step).toBe(3);
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, saveServiceSpy.dataAuto);
    expect(flashServiceSpy.show).toHaveBeenCalledWith('info', expect.any(String));
  });

  it('autoSave avec activeSlotIndex défini → slot 0 ET activeSlot sauvegardés', () => {
    saveServiceSpy.activeSlotIndex = 2 as any;

    service.autoSave('/create-eval');

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, saveServiceSpy.dataAuto);
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, saveServiceSpy.dataAuto);
  });

  it('tryResume → reconstruit dataAuto et navigue vers la bonne route', () => {
    loadServiceSpy.getSlot.mockReturnValue({ ...saveModelDefault, nomEval: 'TestEval', step: 3 });

    service.tryResume(false);

    expect(saveServiceSpy.dataAuto.nomEval).toBe('TestEval');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/create-eval']);
  });

  it('tryResume → ne fait rien si slot null', () => {
    loadServiceSpy.getSlot.mockReturnValue(null);

    service.tryResume(true);

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('tryResume → ne fait rien si step = -1', () => {
    loadServiceSpy.getSlot.mockReturnValue({ ...saveModelDefault, step: -1 });

    service.tryResume(true);

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('ngOnDestroy → unsubscribe() appelé', () => {
    service.init();
    const sub = (service as any).subscription;
    vi.spyOn(sub, 'unsubscribe').mockImplementation(() => undefined);

    service.ngOnDestroy();

    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('init — isResuming = true → NavigationStart n\'appelle pas autoSave', () => {
    service.init();
    (service as any).isResuming = true;

    routerEvents$.next(new NavigationStart(1, '/create-eval'));

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it("autoSave — évaluation renommée → nettoyage prudent des médias de l'ancien nom, après la sauvegarde", () => {
    saveServiceSpy.dataAuto.nomEval = 'NouvelleEval';
    loadServiceSpy.getSlot.mockReturnValue({ ...saveModelDefault, nomEval: 'AncienneEval', step: 0 });

    service.autoSave('/create-eval');

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalled();
    expect(cleanupSpy.cleanupProject).toHaveBeenCalledWith('AncienneEval');
  });

  it('autoSave — même nom → aucun nettoyage', () => {
    service.autoSave('/create-eval');
    expect(cleanupSpy.cleanupProject).not.toHaveBeenCalled();
  });

  it('autoSave — page hors parcours (accueil, options, page inconnue) → aucune sauvegarde', () => {
    ['/home', '/option', '/guide/creation', '/inconnue', '/toString'].forEach(url => service.autoSave(url));
    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it("autoSave — pseudo-route de l'éditeur → étape 3 enregistrée", () => {
    service.autoSave('stimuli');
    expect(saveServiceSpy.dataAuto.step).toBe(3);
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, saveServiceSpy.dataAuto);
  });

  it("autoSave — emplacement actif mais évaluation jamais chargée (page ouverte sans reprise) → l'emplacement n'est pas écrasé", () => {
    saveServiceSpy.activeSlotIndex = 2;
    (Object.getOwnPropertyDescriptor(saveServiceSpy, 'hasLoadedWorkspace')!.get as Mock).mockReturnValue(false);

    service.autoSave('/info-participant');

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalledWith(2, expect.anything());
  });

  it('autoSave — emplacement actif → sauvegardé aussi dans cet emplacement', () => {
    saveServiceSpy.activeSlotIndex = 2;
    service.autoSave('/setup-eval');
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, saveServiceSpy.dataAuto);
  });

  it("autoSave — stockage plein → message d'erreur, pas de nettoyage", () => {
    saveServiceSpy.saveToSlot.mockImplementation(() => { throw new Error('QuotaExceededError'); });
    saveServiceSpy.dataAuto.nomEval = 'Renommée';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.autoSave('/create-eval');

    expect(flashServiceSpy.show).toHaveBeenCalledWith('error', expect.any(String));
    expect(cleanupSpy.cleanupProject).not.toHaveBeenCalled();
  });

  it('tryResume — step sans route → ne navigue pas', () => {
    loadServiceSpy.getSlot.mockReturnValue({ ...saveModelDefault, step: 99 });

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  // ─── Sortie d'une étape vers une page hors parcours, fermeture de l'onglet ────

  function setCurrentUrl(url: string): void {
    (Object.getOwnPropertyDescriptor(routerSpy, 'url')!.get as Mock).mockReturnValue(url);
  }

  it("quitter une étape pour une page hors parcours (menu) → saisies de l'étape enregistrées (régression)", () => {
    service.init();
    setCurrentUrl('/info-eval');
    saveServiceSpy.dataAuto.nomEval = 'Nom saisi';
    saveServiceSpy.dataAuto.step = 3;

    routerEvents$.next(new NavigationStart(1, '/sauvegarde'));

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, expect.objectContaining({nomEval: 'Nom saisi', step: 0}));
  });

  it("quitter une étape liée à un emplacement → l'emplacement reçoit aussi les saisies", () => {
    service.init();
    saveServiceSpy.activeSlotIndex = 1 as any;
    setCurrentUrl('/create-eval');

    routerEvents$.next(new NavigationStart(1, '/option'));

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(1, saveServiceSpy.dataAuto);
  });

  it('navigation entre deux pages hors parcours → aucune sauvegarde', () => {
    service.init();
    setCurrentUrl('/sauvegarde');

    routerEvents$.next(new NavigationStart(1, '/home'));

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it("quitter une étape sans évaluation chargée (modèle vide du démarrage) → rien n'est écrit", () => {
    service.init();
    (Object.getOwnPropertyDescriptor(saveServiceSpy, 'hasLoadedWorkspace')!.get as Mock).mockReturnValue(false);
    setCurrentUrl('/info-eval');

    routerEvents$.next(new NavigationStart(1, '/home'));

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it("fermeture ou rechargement de l'onglet sur une étape → enregistrement sans notification", () => {
    service.init();
    setCurrentUrl('/setup-eval');

    window.dispatchEvent(new Event('pagehide'));

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, expect.objectContaining({step: 2}));
    expect(flashServiceSpy.show).not.toHaveBeenCalled();
  });

  it("fermeture de l'onglet hors parcours → aucune sauvegarde", () => {
    service.init();
    setCurrentUrl('/guide');

    window.dispatchEvent(new Event('pagehide'));

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it("ngOnDestroy → l'écouteur de fermeture d'onglet est retiré", () => {
    service.init();
    setCurrentUrl('/info-eval');
    service.ngOnDestroy();

    window.dispatchEvent(new Event('pagehide'));

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });
});
