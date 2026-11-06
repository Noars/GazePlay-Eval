import { TestBed } from '@angular/core/testing';
import { UpdateScreensService } from './update-screens.service';
import { transitionScreenModel, instructionScreenModel } from '../../shared/screenModel';

describe('UpdateScreensService', () => {
  let service: UpdateScreensService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateScreensService);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('updateTransitionScreen met à jour le nom et les valeurs', () => {
    const screen: transitionScreenModel = {  type: 'transition', name: '', values: [0, 0, 0, 0, 0] };
    const newValues = ['nomTest', 1, 2, 3, 4, 5];

    const updated = service.updateTransitionScreen(screen, 'TestTransition', newValues);

    expect(updated.name).toBe('TestTransition');
    expect(updated.values).toStrictEqual(['nomTest',1, 2, 3, 4]);
  });

  it('updateInstructionScreen met à jour le nom et les valeurs', () => {
    const screen: instructionScreenModel = { type: 'instruction', name: '', values: [0, 0, 0, 0, 0, 0, 0, 0] };
    const newValues = ['nomTest', 1, 2, 3, 4, 5];

    const updated = service.updateInstructionScreen(screen, 'TestInstruction', newValues);

    expect(updated.name).toBe('TestInstruction');
    expect(updated.values[0]).toBe('nomTest');
    expect(updated.values[1]).toBe(1);
    expect(updated.values[2]).toBe(2);
    expect(updated.values[3]).toBe(3);
    expect(updated.values[4]).toBe(0);
    expect(updated.values[5]).toBe(0);
    expect(updated.values[6]).toBe(4);
    expect(updated.values[7]).toBe(5);
  });

  it('updateStimuliScreen met à jour le nom et les valeurs aux bons indices', () => {
    const screen: any = { type: 'stimuli', name: '', values: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const newValues = [2, 3, true, 10, 1.5, 4, false, true];

    const updated = service.updateStimuliScreen(screen, 'TestStimuli', newValues);

    expect(updated.name).toBe('TestStimuli');
    expect(updated.values[0]).toBe(2);
    expect(updated.values[1]).toBe(3);
    expect(updated.values[2]).toBe(true);
    expect(updated.values[3]).toBe(10);
    expect(updated.values[4]).toBe(1.5);
    expect(updated.values[6]).toBe(4);
    expect(updated.values[7]).toBe(false);
    expect(updated.values[8]).toBe(true);
  });

  it('updateStimuliScreen retourne le même objet screen modifié', () => {
    const screen: any = { type: 'stimuli', name: '', values: [0, 0, 0, 0, 0, 0, 0, 0, 0] };
    const result = service.updateStimuliScreen(screen, 'S', [1, 1, false, 5, 1, 1, false, false]);
    expect(result).toBe(screen);
  });

  // ─── Filet de sécurité : paramètres globaux absents/vides ──────────────────
  // Reproduit le bug d'import (globaux perdus → tableau vide). Les valeurs par
  // défaut de l'écran doivent être conservées, jamais remplacées par `undefined`.

  it('updateTransitionScreen — global vide → conserve les valeurs par défaut (aucun undefined)', () => {
    const screen: transitionScreenModel = { type: 'transition', name: '', values: [false, 0, false, false, 0] };

    const updated = service.updateTransitionScreen(screen, 'T', []);

    expect(updated.values).toStrictEqual([false, 0, false, false, 0]);
    expect(updated.values.some(v => v === undefined)).toBe(false);
  });

  it('updateInstructionScreen — global undefined → conserve les valeurs par défaut', () => {
    const screen: instructionScreenModel = {
      type: 'instruction', name: '', values: [false, 1, false, 'Image', '', '', false, 1]
    };

    const updated = service.updateInstructionScreen(screen, 'I', undefined);

    expect(updated.values).toStrictEqual([false, 1, false, 'Image', '', '', false, 1]);
    expect(updated.values.some(v => v === undefined)).toBe(false);
  });

  it('updateScreen — préserve une valeur globale légitime false / 0 (pas de retour au défaut)', () => {
    const screen: transitionScreenModel = { type: 'transition', name: '', values: [true, 9, true, true, 9] };

    const updated = service.updateTransitionScreen(screen, 'T', [false, 0, false, false, 0]);

    expect(updated.values).toStrictEqual([false, 0, false, false, 0]);
  });
});
