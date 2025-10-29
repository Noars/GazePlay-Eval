import { TestBed } from '@angular/core/testing';
import { SaveService } from './save.service';
import { saveModel } from '../../shared/saveModel';
import { SAVE_SLOT_LIST } from '../../shared/dataBaseConfig';

describe('SaveService', () => {
  let service: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveService);
    localStorage.clear();
  });

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
      listScreens: [] as any[]
    };

    spyOn(service, 'saveToSlot').and.callThrough();

    service.saveDataAuto(
      mockData.nomEval,
      mockData.format,
      mockData.infoParticipant,
      mockData.globalParamsTransitionScreen,
      mockData.globalParamsInstructionScreen,
      mockData.globalParamsStimuliScreen,
      mockData.listScreens
    );

    expect(service.dataAuto).toEqual(mockData);
    expect(service.saveToSlot).toHaveBeenCalledWith(0, mockData);
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).not.toBeNull();
  });

  it('clearSlot doit supprimer l’entrée correspondante dans localStorage', () => {
    localStorage.setItem(SAVE_SLOT_LIST[0], 'test');
    service.clearSlot(0);
    expect(localStorage.getItem(SAVE_SLOT_LIST[0])).toBeNull();
  });
});
