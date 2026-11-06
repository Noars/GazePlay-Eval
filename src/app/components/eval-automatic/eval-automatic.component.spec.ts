import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvalAutomaticComponent } from './eval-automatic.component';
import { Router } from '@angular/router';
import type { Mocked } from 'vitest';
import { createSpyObj } from '../../testing/spy-obj';

describe('EvalAutomaticComponent', () => {
  let component: EvalAutomaticComponent;
  let fixture: ComponentFixture<EvalAutomaticComponent>;
  let routerSpy: Mocked<Router>;

  beforeEach(async () => {
    routerSpy = createSpyObj('Router', ['navigate']);
    routerSpy.navigate.mockReturnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [EvalAutomaticComponent],
      providers: [{ provide: Router, useValue: routerSpy }]
    }).compileComponents();

    fixture   = TestBed.createComponent(EvalAutomaticComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('startCreateEvalAuto → navigue vers /create-eval', () => {
    component.startCreateEvalAuto();
    expect(routerSpy.navigate).toHaveBeenCalledExactlyOnceWith(['/create-eval']);
  });

  it('backToEvalChoice → émet selectedModeChange avec null', () => {
    vi.spyOn(component.selectedModeChange, 'emit').mockImplementation(() => undefined);
    component.backToEvalChoice();
    expect(component.selectedModeChange.emit).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('selectedMode est null par défaut', () => {
    expect(component.selectedMode).toBeNull();
  });
});
