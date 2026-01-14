import {InfoEvalComponent} from '../info-eval/info-eval.component';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {formatTypeModel} from '../../shared/saveModel';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatTooltip} from '@angular/material/tooltip';
import {PageIntermediaireComponent} from './page-intermediaire.component';

describe('PageIntermediaireComponent', () => {
  let component: PageIntermediaireComponent;
  let fixture: ComponentFixture<PageIntermediaireComponent>;
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
        listScreens: []
      }
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, MatTooltip, InfoEvalComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: SaveService, useValue: saveServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PageIntermediaireComponent);
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
      []
    );
  });

  it('devrait sauvegarder et naviguer vers /info-participant quand goToPageIntermediaire() est appelé', () => {
    spyOn(component, 'saveData').and.callThrough();

    component.goToInfoParticipant();

    expect(component.saveData).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/info-participant']);
  });

  it('devrait réagir correctement au clic sur le bouton "Suivant"', () => {
    spyOn(component, 'goToInfoParticipant');
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    expect(component.goToInfoParticipant).toHaveBeenCalled();
  });

  it('devrait sauvegarder et naviguer vers /page-intermediaire avec backToPageIntermediaire()', () => {
    spyOn(component, 'saveData').and.callThrough();
    component.backToInfoEval();
    expect(component.saveData).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/info-eval']);
  });
  it('devrait réagir correctement au clic sur le bouton "Précédent"', () => {
    spyOn(component, 'backToInfoEval');
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();
    expect(component.backToInfoEval).toHaveBeenCalled();
  });

});
