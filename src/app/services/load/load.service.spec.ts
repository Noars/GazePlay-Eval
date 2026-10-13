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
      expect(service.getSlot(1)).toBeNull();
    });

    it('retourne les données si slot rempli', () => {
      localStorage.setItem(SAVE_SLOT_LIST[1], JSON.stringify(saveModelDefault));
      const result = service.getSlot(1);
      expect(result).toEqual(saveModelDefault);
    });

    it('retourne null si JSON invalide', () => {
      localStorage.setItem(SAVE_SLOT_LIST[1], 'invalid json');
      const result = service.getSlot(1);
      expect(result).toBeNull();
    });

    it('lit la bonne clé selon l\'index — getSlot(2) ne lit pas getSlot(1)', () => {
      localStorage.setItem(SAVE_SLOT_LIST[1], JSON.stringify({ ...saveModelDefault, nomEval: 'Slot1' }));
      localStorage.setItem(SAVE_SLOT_LIST[2], JSON.stringify({ ...saveModelDefault, nomEval: 'Slot2' }));
      expect(service.getSlot(1)?.nomEval).toBe('Slot1');
      expect(service.getSlot(2)?.nomEval).toBe('Slot2');
    });
  });

  describe('getAllSlots', () => {
    it('retourne tableau avec tous les slots à null si vide', () => {
      const all = service.getAllSlots();
      expect(all).toEqual([null, null, null]);
    });

    it('retourne les emplacements nommés 1, 2 et 3 (jamais la sauvegarde automatique)', () => {
      localStorage.setItem(SAVE_SLOT_LIST[0], JSON.stringify({ ...saveModelDefault, nomEval: 'Auto' }));
      localStorage.setItem(SAVE_SLOT_LIST[1], JSON.stringify({ ...saveModelDefault, nomEval: 'Slot1' }));
      localStorage.setItem(SAVE_SLOT_LIST[3], JSON.stringify({ ...saveModelDefault, nomEval: 'Slot3' }));
      const all = service.getAllSlots();
      expect(all[0]?.nomEval).toBe('Slot1');
      expect(all[1]).toBeNull();
      expect(all[2]?.nomEval).toBe('Slot3');
    });

    it('un emplacement au JSON corrompu est renvoyé comme vide', () => {
      localStorage.setItem(SAVE_SLOT_LIST[2], '{corrompu');
      spyOn(console, 'error');
      expect(service.getAllSlots()[1]).toBeNull();
    });
  });
});
