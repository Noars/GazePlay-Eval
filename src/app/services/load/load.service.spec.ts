import { TestBed } from '@angular/core/testing';
import { LoadService } from './load.service';
import { SAVE_SLOT_LIST, MaxSlots } from '../../shared/dataBaseConfig';
import { saveModel, saveModelDefault } from '../../shared/saveModel';

describe('LoadService', () => {
  let service: LoadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadService);
    localStorage.clear();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  describe('getSlot', () => {
    it('retourne null si slot vide', () => {
      const slotIndex = 0;
      expect(service.getSlot(slotIndex)).toBeNull();
    });

    it('retourne les données si slot rempli', () => {
      const slotIndex = 0;
      localStorage.setItem(SAVE_SLOT_LIST[slotIndex], JSON.stringify(saveModelDefault));
      const result = service.getSlot(slotIndex);
      expect(result).toEqual(saveModelDefault);
    });

    it('retourne null si JSON invalide', () => {
      const slotIndex = 0;
      localStorage.setItem(SAVE_SLOT_LIST[slotIndex], 'invalid json');
      const result = service.getSlot(slotIndex);
      expect(result).toBeNull();
    });
  });

  describe('getAllSlots', () => {
    it('retourne tableau avec tous les slots à null si vide', () => {
      const all = service.getAllSlots();
      expect(all).toEqual([null, null, null]);
    });

    it('retourne les slots correctement remplis', () => {
      localStorage.setItem(SAVE_SLOT_LIST[0], JSON.stringify(saveModelDefault));
      localStorage.setItem(SAVE_SLOT_LIST[1], JSON.stringify(saveModelDefault));
      const all = service.getAllSlots();
      expect(all[0]).toEqual(saveModelDefault);
      expect(all[1]).toEqual(saveModelDefault);
      expect(all[2]).toBeNull();
    });
  });
});
