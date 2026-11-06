import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvalManualComponent } from './eval-manual.component';
import { Router } from '@angular/router';
import { SaveService } from '../../services/save/save.service';
import type { Mocked } from 'vitest';
import { createSpyObj } from '../../testing/spy-obj';

describe('EvalManualComponent', () => {
  let component: EvalManualComponent;
  let fixture: ComponentFixture<EvalManualComponent>;
  let routerSpy: Mocked<Router>;
  let saveServiceSpy: Mocked<SaveService>;

  beforeEach(async () => {
    routerSpy = createSpyObj('Router', ['navigate']);
    saveServiceSpy = createSpyObj('SaveService', ['saveDataAuto']);
    saveServiceSpy.dataAuto = {
      nomEval: '',
      format: 'Csv&Xlsx',
      infoParticipant: [],
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      listScreens: [],
      step: 0
    };

    await TestBed.configureTestingModule({
      imports: [EvalManualComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: SaveService, useValue: saveServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvalManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('toggleAccordion → ouvre l\'accordéon si fermé', () => {
    component.openAccordion = null;
    component.toggleAccordion('transition');
    expect(component.openAccordion as unknown as string).toBe('transition');
  });

  it('toggleAccordion → ferme l\'accordéon s\'il est déjà ouvert', () => {
    component.openAccordion = 'transition';
    component.toggleAccordion('transition');
    expect(component.openAccordion).toBeNull();
  });

  it('toggleAccordion → switch vers un nouvel id', () => {
    component.openAccordion = 'transition';
    component.toggleAccordion('instruction');
    expect(component.openAccordion as unknown as string).toBe('instruction');
  });

  it('startCreateEvalManual → appelle saveData et navigue vers /create-eval', () => {
    component.startCreateEvalManual();
    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/create-eval']);
  });

  it('backToEvalChoice → appelle saveData et émet null via selectedModeChange', () => {
    let emittedValue: null | undefined;
    component.selectedModeChange.subscribe((val: null) => (emittedValue = val));

    component.backToEvalChoice();

    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
    expect(emittedValue).toBeNull();
  });
});
