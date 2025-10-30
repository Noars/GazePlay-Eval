import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfoParticipantComponent } from './info-participant.component';
import { Router } from '@angular/router';
import { SaveService } from '../../services/save/save.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatTooltip } from '@angular/material/tooltip';

describe('InfoParticipantComponent', () => {
  let component: InfoParticipantComponent;
  let fixture: ComponentFixture<InfoParticipantComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveDataAuto'], {
      dataAuto: {
        nomEval: 'EvalTest',
        format: 'Csv&Xlsx',
        infoParticipant: ['Nom', 'Âge'],
        globalParamsTransitionScreen: [],
        globalParamsInstructionScreen: [],
        globalParamsStimuliScreen: [],
        listScreens: []
      }
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, DragDropModule, MatTooltip, InfoParticipantComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: SaveService, useValue: saveServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InfoParticipantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait charger les données depuis SaveService au démarrage', () => {
    component.ngOnInit();
    expect(component.infoParticipantList).toEqual(['Nom', 'Âge']);
  });

  it('devrait appeler saveDataAuto avec les bonnes valeurs', () => {
    component.infoParticipantList = ['Nom', 'Âge', 'Sexe'];
    component.saveData();

    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalledWith(
      'EvalTest',
      'Csv&Xlsx',
      ['Nom', 'Âge', 'Sexe'],
      [],
      [],
      [],
      []
    );
  });

  it('devrait ajouter un champ vide avec addField()', () => {
    const initialLength = component.infoParticipantList.length;
    component.addField();
    expect(component.infoParticipantList.length).toBe(initialLength + 1);
    expect(component.infoParticipantList.at(-1)).toBe('');
  });

  it('devrait supprimer le bon champ avec removeField()', () => {
    component.infoParticipantList = ['Nom', 'Âge', 'Sexe'];
    component.removeField(1);
    expect(component.infoParticipantList).toEqual(['Nom', 'Sexe']);
  });

  it('devrait réorganiser les champs après un drop()', () => {
    component.infoParticipantList = ['Nom', 'Âge', 'Sexe'];
    component.drop({ previousIndex: 0, currentIndex: 2 });
    expect(component.infoParticipantList).toEqual(['Âge', 'Sexe', 'Nom']);
  });

  it('devrait sauvegarder et naviguer vers /info-eval avec backToInfoEval()', () => {
    spyOn(component, 'saveData').and.callThrough();
    component.backToInfoEval();
    expect(component.saveData).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/info-eval']);
  });

  it('devrait sauvegarder et naviguer vers /setup-eval avec goToCreateEval()', () => {
    spyOn(component, 'saveData').and.callThrough();
    component.goToCreateEval();
    expect(component.saveData).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/setup-eval']);
  });
});
