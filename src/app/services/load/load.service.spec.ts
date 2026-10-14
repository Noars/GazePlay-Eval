import { TestBed } from '@angular/core/testing';
import { LoadService } from './load.service';
import { SAVE_SLOT_LIST } from '../../shared/dataBaseConfig';
import { saveModelDefault } from '../../shared/saveModel';

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
});
