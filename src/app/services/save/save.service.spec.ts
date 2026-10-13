import { TestBed } from '@angular/core/testing';
import { SaveService } from './save.service';
import { saveModel } from '../../shared/saveModel';
import { SAVE_SLOT_LIST } from '../../shared/dataBaseConfig';

describe('SaveService', () => {
  let service: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sessionStorage.removeItem('gazeplay-eval.active-slot');
    service = TestBed.inject(SaveService);
    localStorage.clear();
  });

  afterEach(() => sessionStorage.removeItem('gazeplay-eval.active-slot'));

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
    localStorage.setItem(SAVE_SLOT_LIST[0], 'test');
    service.clearSlot(0);
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).toBeNull();
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

  it("setActiveSlot → mémorisé dans sessionStorage et relu par une nouvelle instance (rechargement)", () => {
    service.setActiveSlot(2);
    expect(service.activeSlotIndex).toBe(2);
    expect(new SaveService().activeSlotIndex).toBe(2);

    service.setActiveSlot(null);
    expect(new SaveService().activeSlotIndex).toBeNull();
  });

  it("sessionStorage corrompu → aucun emplacement actif", () => {
    sessionStorage.setItem('gazeplay-eval.active-slot', '7');
    expect(new SaveService().activeSlotIndex).toBeNull();
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
