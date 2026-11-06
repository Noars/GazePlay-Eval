import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetupEvalComponent } from './setup-eval.component';
import { Router } from '@angular/router';
import { SaveService } from '../../services/save/save.service';
import { EvalManualComponent } from '../../components/eval-manual/eval-manual.component';
import { EvalAutomaticComponent } from '../../components/eval-automatic/eval-automatic.component';
import { Component } from '@angular/core';
import type { Mocked } from 'vitest';
import { createSpyObj } from '../../testing/spy-obj';

@Component({ selector: 'app-eval-manual',   template: '', standalone: true }) class EvalManualStub {}
@Component({ selector: 'app-eval-automatic', template: '', standalone: true }) class EvalAutomaticStub {}

describe('SetupEvalComponent', () => {
  let component: SetupEvalComponent;
  let fixture: ComponentFixture<SetupEvalComponent>;
  let routerSpy: Mocked<Router>;
  let saveServiceSpy: Mocked<SaveService>;

  beforeEach(async () => {
    routerSpy      = createSpyObj('Router', ['navigate']);
    saveServiceSpy = createSpyObj('SaveService', ['getEvalName']);
    routerSpy.navigate.mockReturnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [SetupEvalComponent],
      providers: [
        { provide: Router,       useValue: routerSpy },
        { provide: SaveService,  useValue: saveServiceSpy }
      ]
    })
    .overrideComponent(SetupEvalComponent, {
      remove: { imports: [EvalManualComponent, EvalAutomaticComponent] },
      add:    { imports: [EvalManualStub, EvalAutomaticStub] }
    })
    .compileComponents();

    fixture   = TestBed.createComponent(SetupEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('selectedMode est null par défaut', () => {
    expect(component.selectedMode).toBeNull();
  });

  it('selectMode(\'manuel\') → selectedMode passe à manuel', () => {
    component.selectMode('manuel');
    expect(component.selectedMode).toBe('manuel');
  });

  it('selectMode(\'auto\') → selectedMode passe à auto', () => {
    component.selectMode('auto');
    expect(component.selectedMode).toBe('auto');
  });

  it('onSelectedModeChange(null) → selectedMode repasse à null', () => {
    component.selectedMode = 'auto';
    component.onSelectedModeChange(null);
    expect(component.selectedMode).toBeNull();
  });

  it('backToInfoParticipant → navigue vers /info-participant', () => {
    component.backToInfoParticipant();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['/info-participant']);
  });
});
