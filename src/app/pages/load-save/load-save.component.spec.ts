import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';

import { LoadSaveComponent } from './load-save.component';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('LoadSaveComponent', () => {
  let component: LoadSaveComponent;
  let fixture: ComponentFixture<LoadSaveComponent>;
  let saveServiceSpy: Mocked<SaveService>
  let loadServiceSpy: Mocked<LoadService>
  let autoSaveServiceSpy: Mocked<AutoSaveService>
  let routerSpy: Mocked<Router>
  let overwriteGuardSpy: Mocked<OverwriteGuardService>


  beforeEach(async () => {
    saveServiceSpy = createSpyObj('SaveService', ['saveDataAuto', 'saveToSlot', 'clearSlot', 'newSaveDataAuto', 'getEvalName', 'loadIntoWorkspace', 'setActiveSlot']);
    // Reproduit le comportement réel des méthodes utilisées par la page.
    saveServiceSpy.loadIntoWorkspace.mockImplementation((save: saveModel, step: number = save.step) => {
      const {createdAt, version, ...rest} = save;
      saveServiceSpy.dataAuto = {...rest, step};
    });
    saveServiceSpy.setActiveSlot.mockImplementation((index: any) => saveServiceSpy.activeSlotIndex = index);
    saveServiceSpy.dataAuto = {
      format: 'Csv',
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      globalParamsTransitionScreen: [],
      infoParticipant: [],
      listScreens: [],
      step: 0,
      nomEval: '' };
    saveServiceSpy.activeSlotIndex = null;

    loadServiceSpy = createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.mockReturnValue(null);

    autoSaveServiceSpy = createSpyObj('AutoSaveService', ['tryResume']);
    overwriteGuardSpy = createSpyObj('OverwriteGuardService', ['check', 'getUniqueEvalName', 'reserveForOpening']);
    // Par défaut, aucun autre onglet n'utilise l'emplacement.
    overwriteGuardSpy.reserveForOpening.mockImplementation(async (slot: any) => ({mode: 'link', reservation: {slot, release: vi.fn().mockName('release')}}));

    await TestBed.configureTestingModule({
      imports: [LoadSaveComponent],
      providers : [
        { provide: SaveService, useValue: saveServiceSpy },
        { provide: LoadService, useValue: loadServiceSpy },
        { provide: AutoSaveService, useValue: autoSaveServiceSpy },
        provideRouter([]),
        { provide: OverwriteGuardService, useValue: overwriteGuardSpy},
      ]
    })
      .compileComponents();

    routerSpy = TestBed.inject(Router) as Mocked<Router>;
    vi.spyOn(routerSpy, 'navigate').mockReturnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(LoadSaveComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('Les slots 1, 2 et 3 devraient être chargés à l\'arrivée sur la page', () => {
    const slot1: saveModel = {
      nomEval: 'Eval1',
      format: 'Csv',
      infoParticipant: ['Nom', 'Âge'],
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      listScreens: [],
      step: 0,
      createdAt: '',
      version: 1
    };
    const slot2: saveModel = {
      nomEval: 'Eval2',
      format: 'Csv',
      infoParticipant: ['Nom', 'Âge'],
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      listScreens: [],
      step: 0,
      createdAt: '',
      version: 1
    };
    const slot3: saveModel = {
      nomEval: 'Eval3',
      format: 'Csv',
      infoParticipant: ['Nom', 'Âge'],
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      listScreens: [],
      step: 0,
      createdAt: '',
      version: 1
    };

    loadServiceSpy.getSlot.mockImplementation((index: number) => {
      if (index === 0) return null; // le slot auto est vide
      if (index === 1) return slot1;
      if (index === 2) return slot2;
      if (index === 3) return slot3;
      return null;
    });

    fixture.detectChanges();

    const expectedSlots: { index: FormatTypeConfig; data: saveModel | null }[] = [
      { index: 1, data: slot1 },
      { index: 2, data: slot2 },
      { index: 3, data: slot3 }
    ]

    expect(component.slots).toStrictEqual(expectedSlots);
    expect(loadServiceSpy.getSlot).toHaveBeenCalled();
  });

  it('formatDate → convertit une date ISO en format français', () => {
    const result = component.formatDate('2024-05-11T10:30:00Z');
    expect(result).toBe('11/05/2024');
  });

  it('le chargement d\'un slot appelle l`\`overwriteGuard, met à jour le slot dynamique et charge la sauvegarde', async () => {
    const slot1: saveModel = {
      nomEval: 'Eval1',
      format: 'Csv',
      infoParticipant: ['Nom', 'Âge'],
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      listScreens: [],
      step: 0,
      createdAt: '',
      version: 1
    };

    overwriteGuardSpy.check.mockReturnValue(Promise.resolve(true));

    loadServiceSpy.getSlot.mockImplementation((index: number) => {
      if (index === 1) return slot1;
      return null;
    });

    await component.loadSlot(1);

    fixture.detectChanges();

    expect(overwriteGuardSpy.check).toHaveBeenCalledWith(0)
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, component.saveService.dataAuto);
    expect(autoSaveServiceSpy.tryResume).toHaveBeenCalled();
  });

  it("loadSlot — relit l'emplacement après la protection (report éventuel de l'évaluation en cours)", async () => {
    const before: saveModel = { nomEval: 'E1', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    const after: saveModel = { ...before, listScreens: [{name: 'ajouté pendant la reprise'}] as any };
    let slot1 = before;
    loadServiceSpy.getSlot.mockImplementation((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.check.mockImplementation(async () => { slot1 = after; return true; });
    fixture.detectChanges();

    await component.loadSlot(1);

    expect(component.saveService.dataAuto.listScreens).toStrictEqual(after.listScreens);
  });

  it("loadSlot — emplacement ouvert dans un autre onglet, « Ouvrir une copie » → chargé sans lien", async () => {
    const slot1: saveModel = { nomEval: 'E1', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.mockImplementation((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.reserveForOpening.mockResolvedValue({mode: 'copy'});
    overwriteGuardSpy.check.mockResolvedValue(true);
    fixture.detectChanges();

    await component.loadSlot(1);

    expect(component.saveService.dataAuto.nomEval).toBe('E1');
    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(null, null);
    expect(autoSaveServiceSpy.tryResume).toHaveBeenCalled();
  });

  it("loadSlot — emplacement ouvert dans un autre onglet, annulation → rien n'est chargé", async () => {
    const slot1: saveModel = { nomEval: 'E1', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.mockImplementation((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.reserveForOpening.mockResolvedValue(null);
    fixture.detectChanges();

    await component.loadSlot(1);

    expect(overwriteGuardSpy.check).not.toHaveBeenCalled();
    expect(autoSaveServiceSpy.tryResume).not.toHaveBeenCalled();
  });

  it("loadSlot — protection annulée → la réservation de l'emplacement est libérée", async () => {
    const slot1: saveModel = { nomEval: 'E1', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.mockImplementation((i: number) => i === 1 ? slot1 : null);
    const release = vi.fn().mockName('release');
    overwriteGuardSpy.reserveForOpening.mockResolvedValue({mode: 'link', reservation: {slot: 1, release}});
    overwriteGuardSpy.check.mockResolvedValue(false);
    fixture.detectChanges();

    await component.loadSlot(1);

    expect(release).toHaveBeenCalled();
    expect(saveServiceSpy.setActiveSlot).not.toHaveBeenCalled();
  });

  it('goBack → navigue vers /home', () => {
    fixture.detectChanges();
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('loadSlot — slot vide → retourne sans rien faire', async () => {
    loadServiceSpy.getSlot.mockReturnValue(null);
    fixture.detectChanges();

    await component.loadSlot(1);

    expect(overwriteGuardSpy.check).not.toHaveBeenCalled();
    expect(autoSaveServiceSpy.tryResume).not.toHaveBeenCalled();
  });

  it('loadSlot — overwriteGuard bloque → retourne sans charger', async () => {
    const slot1: saveModel = { nomEval: 'E1', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.mockImplementation((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.check.mockReturnValue(Promise.resolve(false));
    fixture.detectChanges();

    await component.loadSlot(1);

    expect(autoSaveServiceSpy.tryResume).not.toHaveBeenCalled();
  });

  it('loadSlot — double clic → un seul chargement (régression)', async () => {
    const slot1: saveModel = {
      nomEval: 'Eval1', format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1
    };
    overwriteGuardSpy.check.mockReturnValue(Promise.resolve(true));
    loadServiceSpy.getSlot.mockImplementation((index: number) => index === 1 ? slot1 : null);

    await Promise.all([component.loadSlot(1), component.loadSlot(1)]);

    expect(overwriteGuardSpy.reserveForOpening).toHaveBeenCalledTimes(1);
    expect(autoSaveServiceSpy.tryResume).toHaveBeenCalledTimes(1);
  });

  it('le chargement d\'un slot avec un step incorrect le remet à 3', async () => {
    const slot1: saveModel = {
      nomEval: 'Eval1',
      format: 'Csv',
      infoParticipant: ['Nom', 'Âge'],
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: [],
      listScreens: [],
      step: -1,
      createdAt: '',
      version: 1
    };

    overwriteGuardSpy.check.mockReturnValue(Promise.resolve(true));

    loadServiceSpy.getSlot.mockImplementation((index: number) => {
      if (index === 1) return slot1;
      return null;
    });

    await component.loadSlot(1);

    fixture.detectChanges();

    expect(component.saveService.dataAuto.step).toBe(3);
  });
});
