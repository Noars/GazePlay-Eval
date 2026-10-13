import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoEvalComponent } from './info-eval.component';
import { Router } from '@angular/router';
import { SaveService } from '../../services/save/save.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { formatTypeModel } from '../../shared/saveModel';

describe('InfoEvalComponent', () => {
  let component: InfoEvalComponent;
  let fixture: ComponentFixture<InfoEvalComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveDataAuto'], {
      dataAuto: {
        nomEval: 'EvalTest',
        format: 'Csv&Xlsx' as formatTypeModel,
        infoParticipant: [],
        globalParamsTransitionScreen: [],
        globalParamsInstructionScreen: [],
        globalParamsStimuliScreen: [],
        listScreens: [],
        step: 0
      }
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, MatTooltip, InfoEvalComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: SaveService, useValue: saveServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait charger les données depuis SaveService au démarrage', () => {
    component.ngOnInit();
    expect(component.evaluationName).toBe('EvalTest');
    expect(component.resultType).toBe('Csv&Xlsx');
  });

  it('devrait appeler saveDataAuto lors de saveData()', () => {
    component.evaluationName = 'NouvelleEval';
    component.resultType = 'Csv' as formatTypeModel;

    component.saveData();

    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalledWith(
      'NouvelleEval',
      'Csv',
      [],
      [],
      [],
      [],
      [],
      0
    );
  });

  it('devrait sauvegarder et naviguer vers /info-participant quand goToInfoParticipant() est appelé', () => {
    spyOn(component, 'saveData').and.callThrough();

    component.goToInfoParticipant();

    expect(component.saveData).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/info-participant']);
  });

  it('devrait réagir correctement au clic sur le bouton "Suivant"', () => {
    spyOn(component, 'goToInfoParticipant');
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    button.click();
    fixture.detectChanges();

    expect(component.goToInfoParticipant).toHaveBeenCalled();
  });

  it("nom contenant un caractère interdit → erreur affichée et pas de navigation", () => {
    component.onNameChange('Classe 3/4');
    component.goToInfoParticipant();
    fixture.detectChanges();

    expect(component.nameError).toContain('/');
    expect(fixture.nativeElement.querySelector('#evalName').getAttribute('aria-invalid')).toBe('true');
    expect(fixture.nativeElement.querySelector('#evalNameError')).not.toBeNull();
  });

  it("onNameChange / onFormatChange → répercutés immédiatement dans l'évaluation de travail", () => {
    component.onNameChange('Couleurs');
    component.onFormatChange('Xlsx');
    expect(component['saveService'].dataAuto.nomEval).toBe('Couleurs');
    expect(component['saveService'].dataAuto.format).toBe('Xlsx');
  });

  it("propose les trois formats avec leurs valeurs historiques", () => {
    const values = Array.from(fixture.nativeElement.querySelectorAll('input[name="resultType"]') as NodeListOf<HTMLInputElement>).map(i => i.value);
    expect(values).toEqual(['Csv&Xlsx', 'Csv', 'Xlsx']);
  });
});
