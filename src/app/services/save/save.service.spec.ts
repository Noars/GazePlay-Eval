import { TestBed } from '@angular/core/testing';
import { SaveService } from './save.service';
import { saveModel, saveModelDefault } from '../../shared/saveModel';
import { SAVE_SLOT_LIST } from '../../shared/dataBaseConfig';
import {SHARED_KEYS, TAB_KEYS} from '../../core/tab/tab-session.service';

describe('SaveService', () => {
  let service: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
    service = TestBed.inject(SaveService);
  });

  afterEach(() => localStorage.clear());

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('newSaveDataAuto doit initialiser dataAuto et sauvegarder dans le slot 0', () => {
    spyOn(service, 'saveToSlot').and.callThrough();

    service.newSaveDataAuto();

    expect(service.dataAuto).toEqual(jasmine.any(Object));
    expect(service.saveToSlot).toHaveBeenCalledWith(0, service.dataAuto);
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).not.toBeNull();
  });

  it('saveDataAuto doit mettre à jour dataAuto et sauvegarder', () => {
    const mockData: Omit<saveModel, 'createdAt' | 'version'> = {
      nomEval: 'Test',
      format: 'Csv&Xlsx' as any,
      infoParticipant: ['Alice'],
      globalParamsTransitionScreen: [] as any[],
      globalParamsInstructionScreen: [] as any[],
      globalParamsStimuliScreen: [] as any[],
      listScreens: [] as any[],
      step: 0
    };

    spyOn(service, 'saveToSlot').and.callThrough();

    service.saveDataAuto(
      mockData.nomEval,
      mockData.format,
      mockData.infoParticipant,
      mockData.globalParamsTransitionScreen,
      mockData.globalParamsInstructionScreen,
      mockData.globalParamsStimuliScreen,
      mockData.listScreens,
      mockData.step
    );

    expect(service.dataAuto).toEqual(mockData);
    expect(service.saveToSlot).toHaveBeenCalledWith(0, mockData);
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).not.toBeNull();
  });

  it("clearSlot doit supprimer l'entree correspondante dans localStorage", () => {
    localStorage.setItem(SAVE_SLOT_LIST[2], 'test');
    service.clearSlot(2);
    expect(localStorage.getItem(SAVE_SLOT_LIST[2])).toBeNull();
  });

  it("clearSlot(0) ne supprime pas la dernière évaluation en cours publiée par un autre onglet", () => {
    localStorage.setItem(SAVE_SLOT_LIST[0], JSON.stringify({nomEval: 'Autre onglet'}));
    localStorage.setItem(SHARED_KEYS.owner, 'autre-onglet');
    service.clearSlot(0);
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).not.toBeNull();
  });

  it('getEvalName — nomEval défini → retourne nomEval', () => {
    service.dataAuto.nomEval = 'MonEval';
    expect(service.getEvalName()).toBe('MonEval');
  });

  it('getEvalName - nomEval vide - retourne le nom par defaut', () => {
    service.dataAuto.nomEval = String();
    const result = service.getEvalName();
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toEqual(service.dataAuto.nomEval);
  });

  it("setActiveSlot → lien propre à l'onglet (sessionStorage), publié avec la dernière évaluation en cours", () => {
    service.saveToSlot(0, {...service.dataAuto, nomEval: 'E'});
    service.setActiveSlot(2);
    expect(service.activeSlotIndex).toBe(2);
    expect(sessionStorage.getItem(TAB_KEYS.slot)).toBe('2');
    expect(localStorage.getItem(SHARED_KEYS.slot)).toBe('2');

    service.setActiveSlot(null);
    expect(service.activeSlotIndex).toBeNull();
    expect(sessionStorage.getItem(TAB_KEYS.slot)).toBeNull();
  });

  it("saveToSlot(0) → évaluation de l'onglet (sessionStorage) et copie partagée saveAuto, au format des sauvegardes", () => {
    service.saveToSlot(0, {...service.dataAuto, nomEval: 'E'});
    const tabCopy = JSON.parse(sessionStorage.getItem(TAB_KEYS.working)!);
    const shared = JSON.parse(localStorage.getItem(SAVE_SLOT_LIST[0])!);
    expect(tabCopy.nomEval).toBe('E');
    expect(shared).toEqual(tabCopy);
    expect(shared.version).toBe(1);
    expect(shared.createdAt).toEqual(jasmine.any(String));
  });

  it("clearSlot(0) → supprime l'évaluation de l'onglet et la copie partagée qu'il a publiée", () => {
    service.saveToSlot(0, {...service.dataAuto, nomEval: 'E'});
    service.clearSlot(0);
    expect(sessionStorage.getItem(TAB_KEYS.working)).toBeNull();
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).toBeNull();
  });

  it("une page ouverte sur un onglet qui a déjà son évaluation la charge tout de suite", () => {
    sessionStorage.setItem(TAB_KEYS.working, JSON.stringify({...saveModelDefault, nomEval: 'Reprise', step: 2}));
    TestBed.resetTestingModule();
    const fresh = TestBed.inject(SaveService);
    expect(fresh.dataAuto.nomEval).toBe('Reprise');
    expect(fresh.hasLoadedWorkspace).toBeTrue();
  });

  it("hasLoadedWorkspace → faux au démarrage, vrai après création, saisie ou chargement de l'évaluation", () => {
    const fresh = () => TestBed.runInInjectionContext(() => new SaveService());
    expect(fresh().hasLoadedWorkspace).toBeFalse();

    const created = fresh();
    created.newSaveDataAuto();
    expect(created.hasLoadedWorkspace).toBeTrue();

    const saved = fresh();
    saved.saveDataAuto('E', 'Csv', [], [], [], [], [], 0);
    expect(saved.hasLoadedWorkspace).toBeTrue();

    const loaded = fresh();
    loaded.loadIntoWorkspace({nomEval: 'E', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 1, createdAt: 'x', version: 1});
    expect(loaded.hasLoadedWorkspace).toBeTrue();
  });

  it("clearSlot de l'emplacement actif → l'évaluation en est détachée", () => {
    service.setActiveSlot(1);
    service.clearSlot(1);
    expect(service.activeSlotIndex).toBeNull();
  });

  it("newSaveDataAuto → détache l'évaluation de tout emplacement", () => {
    service.setActiveSlot(3);
    service.newSaveDataAuto();
    expect(service.activeSlotIndex).toBeNull();
  });

  it("loadIntoWorkspace → copie la sauvegarde (sans createdAt ni version) avec l'étape demandée", () => {
    const save = {nomEval: 'E', format: 'Csv' as const, infoParticipant: ['Nom'], globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 1, createdAt: 'x', version: 1};
    service.loadIntoWorkspace(save, 3);
    expect(service.dataAuto).toEqual({nomEval: 'E', format: 'Csv', infoParticipant: ['Nom'], globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 3});
  });
});
