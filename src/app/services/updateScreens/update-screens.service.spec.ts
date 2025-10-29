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
    expect(updated.values).toEqual([1, 2, 3, 4, 5]);
  });

  it('updateInstructionScreen met à jour le nom et les valeurs', () => {
    const screen: instructionScreenModel = { type: 'instruction', name: '', values: [0, 0, 0, 0, 0, 0, 0] };
    const newValues = ['nomTest', 1, 2, 3, 4, 5];

    const updated = service.updateInstructionScreen(screen, 'TestInstruction', newValues);

    expect(updated.name).toBe('TestInstruction');
    expect(updated.values[0]).toBe(1);
    expect(updated.values[1]).toBe(2);
    expect(updated.values[2]).toBe(3);
    expect(updated.values[3]).toBe(4);
    expect(updated.values[5]).toBe(5);
    expect(updated.values[6]).toBeUndefined();
  });
});
