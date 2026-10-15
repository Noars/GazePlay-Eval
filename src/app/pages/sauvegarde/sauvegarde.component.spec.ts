import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import { FormatTypeConfig } from '../../shared/dataBaseConfig';
import { Router } from '@angular/router';
import {DownloadService} from '../../services/download/download.service';
import {OverwriteGuardService, sameEvaluation} from '../../services/overwrite-guard/overwrite-guard.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { SauvegardeComponent } from './sauvegarde.component';
import {of} from 'rxjs';

describe('SauvegardeComponent', () => {
  let component: SauvegardeComponent;
  let fixture: ComponentFixture<SauvegardeComponent>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>
  let loadServiceSpy: jasmine.SpyObj<LoadService>
  let autoSaveServiceSpy: jasmine.SpyObj<AutoSaveService>
  let flashMessageServiceSpy: jasmine.SpyObj<FlashService>
  let routerSpy: jasmine.SpyObj<Router>
  let downloadServiceSpy: jasmine.SpyObj<DownloadService>
  let overwriteGuardSpy: jasmine.SpyObj<OverwriteGuardService>
  let mediaCleanupSpy: jasmine.SpyObj<MediaCleanupService>
  let confirmSpy: jasmine.SpyObj<ConfirmService>
  let dialogSpy: jasmine.SpyObj<MatDialog>


  beforeEach(async () => {
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveDataAuto', 'saveToSlot', 'clearSlot', 'newSaveDataAuto', 'getEvalName', 'loadIntoWorkspace', 'setActiveSlot']);
    // Reproduit le comportement réel des méthodes utilisées par la page.
    saveServiceSpy.loadIntoWorkspace.and.callFake((save: saveModel, step: number = save.step) => {
      const {createdAt, version, ...rest} = save;
      saveServiceSpy.dataAuto = {...rest, step};
    });
    saveServiceSpy.setActiveSlot.and.callFake((index: any) => saveServiceSpy.activeSlotIndex = index);
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

    loadServiceSpy = jasmine.createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.and.returnValue(null);

    autoSaveServiceSpy = jasmine.createSpyObj('AutoSaveService', ['tryResume']);
    flashMessageServiceSpy = jasmine.createSpyObj('FlashService', ['show']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    downloadServiceSpy = jasmine.createSpyObj('DownloadService', ['generateSlotZip']);
    overwriteGuardSpy = jasmine.createSpyObj('OverwriteGuardService',
      ['check', 'getUniqueEvalName', 'findSlotHolding', 'reserveForOpening', 'reserveForWriting', 'ensureNotOpenElsewhere']);
    // Par défaut, aucun autre onglet n'utilise les emplacements.
    overwriteGuardSpy.reserveForOpening.and.callFake(async (slot: any) => ({mode: 'link', reservation: {slot, release: jasmine.createSpy('release')}}));
    overwriteGuardSpy.reserveForWriting.and.callFake(async (slot: any) => ({slot, release: jasmine.createSpy('release')}));
    overwriteGuardSpy.ensureNotOpenElsewhere.and.resolveTo(true);
    // Même règle que le vrai service : un emplacement « contient » l'évaluation si le contenu est identique.
    overwriteGuardSpy.findSlotHolding.and.callFake((evaluation: any) =>
      ([1, 2, 3] as const).find(i => {
        const slot = loadServiceSpy.getSlot(i);
        return slot !== null && sameEvaluation(slot, evaluation);
      }) ?? null);
    mediaCleanupSpy = jasmine.createSpyObj('MediaCleanupService', ['cleanupProject']);
    mediaCleanupSpy.cleanupProject.and.returnValue(Promise.resolve(0));
    confirmSpy = jasmine.createSpyObj('ConfirmService', ['confirm']);
    confirmSpy.confirm.and.returnValue(Promise.resolve(true));
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open'])

    await TestBed.configureTestingModule({
      imports: [SauvegardeComponent],
      providers : [
        { provide: SaveService, useValue: saveServiceSpy },
        { provide: LoadService, useValue: loadServiceSpy },
        { provide: AutoSaveService, useValue: autoSaveServiceSpy },
        { provide: FlashService, useValue: flashMessageServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DownloadService, useValue: downloadServiceSpy },
        { provide: OverwriteGuardService, useValue: overwriteGuardSpy},
        { provide: MediaCleanupService, useValue: mediaCleanupSpy},
        { provide: ConfirmService, useValue: confirmSpy},
        { provide: MatDialog, useValue: dialogSpy}
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SauvegardeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
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

    // V1

    // loadServiceSpy.getSlot.withArgs(1).and.returnValue(slot1)
    // loadServiceSpy.getSlot.withArgs(2).and.returnValue(slot2)
    // loadServiceSpy.getSlot.withArgs(3).and.returnValue(slot3)

    // V2
    loadServiceSpy.getSlot.and.callFake((index: number) => {
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

    expect(component.slots).toEqual(expectedSlots);
    expect(loadServiceSpy.getSlot).toHaveBeenCalled();
  });

  it('Renvoie un message si le slot courant n\'est pas enregistré ', () => {
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
    const currentEval: saveModel = {
      nomEval: 'EvalCurrent',
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

    loadServiceSpy.getSlot.and.callFake((index: number) => {
      if (index === 0) return currentEval;
      if (index === 1) return slot1;
      if (index === 2) return null;
      if (index === 3) return null;
      return null;
    });

    fixture.detectChanges();

    expect(component.hasUnsavedEval).toBeTrue();
  });

  it('La sauvegarde dans un slot insère des données, rafraîchit la page et affiche un message de succès', async () => {
    const dataToSave: saveModel = {
      nomEval: 'EvalToSave',
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

    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    overwriteGuardSpy.getUniqueEvalName.and.returnValue('EvalToSave');

    loadServiceSpy.getSlot.and.callFake((index: number) => {
      if (index === 0) return null;
      if (index === 1) return dataToSave;
      if (index === 2) return null;
      if (index === 3) return null;
      return null;
    });

    await component.saveToSlot({ index: 1, data: null }, dataToSave);

    fixture.detectChanges();

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(1, dataToSave);
    expect(component.slots[0].data).toEqual(dataToSave); // l'index commence à 0 pour la liste des slots
    expect(flashMessageServiceSpy.show).toHaveBeenCalledWith('success', 'Votre évaluation a été sauvegardée avec succès.');
  });

  it('en cas de suppression (sans download), supprime le slot, rafraîchit et affiche un message de succès', async () => {
    const slotToDelete: saveModel = {
      nomEval: 'EvalToDelete',
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

    loadServiceSpy.getSlot.and.callFake((index: number) => {
      if (index === 1) return slotToDelete;
      return null;
    });

    dialogSpy.open.and.returnValue({
      afterClosed: () => of('delete')
    } as any);

    await component.openDeletePopup({ index: 1, data: slotToDelete });
    await new Promise(resolve => setTimeout(resolve));

    expect(saveServiceSpy.clearSlot).toHaveBeenCalledWith(1);
    expect(flashMessageServiceSpy.show).toHaveBeenCalledWith('success', 'L\'évaluation a été supprimée avec succès.');
    // Les médias ne sont supprimés que s'ils ne servent plus à aucune sauvegarde.
    expect(mediaCleanupSpy.cleanupProject).toHaveBeenCalledWith('EvalToDelete');
  });

  it('en cas de suppression (avec download), supprime le slot, rafraîchit et affiche un message de succès', async () => {
    const slotToDelete: saveModel = {
      nomEval: 'EvalToDelete',
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

    dialogSpy.open.and.returnValue({
      afterClosed: () => of('download')
    } as any);

    downloadServiceSpy.generateSlotZip.and.returnValue(Promise.resolve(true));
    await component.openDeletePopup({ index: 1, data: slotToDelete });
    await new Promise(resolve => setTimeout(resolve));

    expect(downloadServiceSpy.generateSlotZip).toHaveBeenCalledWith(slotToDelete);
    expect(flashMessageServiceSpy.show).toHaveBeenCalledWith('info', 'L\'évaluation a été téléchargée.');
  });

  it('en cas de suppression (sans download), supprime le slot, rafraîchit et affiche un message de succès', async () => {
    const slotToDelete: saveModel = {
      nomEval: 'EvalToDelete',
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

    loadServiceSpy.getSlot.and.callFake((index: number) => {
      if (index === 1) return slotToDelete;
      return null;
    });

    dialogSpy.open.and.returnValue({
      afterClosed: () => of('delete')
    } as any);

    await component.openDeletePopup({ index: 1, data: slotToDelete });

    expect(saveServiceSpy.clearSlot).toHaveBeenCalledWith(1);
    expect(flashMessageServiceSpy.show).toHaveBeenCalledWith('success', 'L\'évaluation a été supprimée avec succès.');
  });

  it('la création d\'une nouvelle évaluation vérifie le nom, sauvegarde et amène vers la page info-eval', async () => {

    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    saveServiceSpy.newSaveDataAuto.and.returnValue(<void>undefined);

    await component.newEval();

    expect(overwriteGuardSpy.check).toHaveBeenCalledWith(0);
    expect(saveServiceSpy.newSaveDataAuto).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/info-eval']);
  });

  it('downloadSlot — slot avec données → generateSlotZip + message info', async () => {
    const slotData = { nomEval: 'E1', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    downloadServiceSpy.generateSlotZip.and.returnValue(Promise.resolve(true));
    fixture.detectChanges();

    await component.downloadSlot({ index: 1, data: slotData });

    expect(downloadServiceSpy.generateSlotZip).toHaveBeenCalledWith(slotData);
    expect(flashMessageServiceSpy.show).toHaveBeenCalledWith('info', 'L\'évaluation a été téléchargée.');
  });

  it('downloadSlot — slot vide → generateSlotZip non appelé', () => {
    fixture.detectChanges();
    component.downloadSlot({ index: 1, data: null });
    expect(downloadServiceSpy.generateSlotZip).not.toHaveBeenCalled();
  });

  it('editSlot — slot vide → retourne sans rien faire', async () => {
    loadServiceSpy.getSlot.and.returnValue(null);
    fixture.detectChanges();

    await component.editSlot(1);

    expect(overwriteGuardSpy.check).not.toHaveBeenCalled();
    expect(autoSaveServiceSpy.tryResume).not.toHaveBeenCalled();
  });

  it('editSlot — overwriteGuard bloque → retourne sans charger', async () => {
    const slot1 = { nomEval: 'E1', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(false));
    fixture.detectChanges();

    await component.editSlot(1);

    expect(autoSaveServiceSpy.tryResume).not.toHaveBeenCalled();
  });

  it('editSlot — succès → charge le slot, sauvegarde dans slot 0 et appelle tryResume', async () => {
    const slot1 = { nomEval: 'E1', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    fixture.detectChanges();

    await component.editSlot(1);

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, jasmine.objectContaining({ nomEval: 'E1' }));
    expect(saveServiceSpy.activeSlotIndex).toBe(1);
    expect(autoSaveServiceSpy.tryResume).toHaveBeenCalled();
  });

  it('editSlot — step < 0 → utilise step = 3', async () => {
    const slot1 = { nomEval: 'E1', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: -1, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    fixture.detectChanges();

    await component.editSlot(1);

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, jasmine.objectContaining({ step: 3 }));
  });

  it('saveToSlot — slot.data non null et guard bloque → retourne sans sauvegarder', async () => {
    const existingData = { nomEval: 'Existing', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(false));
    fixture.detectChanges();

    await component.saveToSlot({ index: 1, data: existingData });

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it('saveToSlot — uniqueName différent de nomEval → renomme', async () => {
    const data = { nomEval: 'Eval', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    overwriteGuardSpy.getUniqueEvalName.and.returnValue('Eval (2)');
    loadServiceSpy.getSlot.and.returnValue(null);
    fixture.detectChanges();

    await component.saveToSlot({ index: 1, data: null }, data);

    expect(data.nomEval).toBe('Eval (2)');
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(1, data);
  });

  it('saveToSlot — sans dataToSave → utilise le slot dynamique', async () => {
    const autoSave = { nomEval: 'Auto', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    overwriteGuardSpy.getUniqueEvalName.and.returnValue('Auto');
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? autoSave : null);
    fixture.detectChanges();

    await component.saveToSlot({ index: 2, data: null });

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, autoSave);
  });

  it('deleteAutoSave — evalInProgress false → clearSlot non appelé', () => {
    loadServiceSpy.getSlot.and.returnValue(null);
    fixture.detectChanges();
    component.evalInProgress = false;

    component.deleteAutoSave();

    expect(saveServiceSpy.clearSlot).not.toHaveBeenCalled();
  });

  it('ngOnInit — évaluation en cours sans nom mais avec des écrans → hasUnsavedEval true (le nom vide ne veut pas dire vide)', () => {
    const unnamed = { nomEval: '', format: 'Csv&Xlsx' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [{name: 'Ecran 1'}] as any, step: 0, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? unnamed : null);
    fixture.detectChanges();
    expect(component.hasUnsavedEval).toBeTrue();
  });

  it('ngOnInit — évaluation en cours réellement vide → hasUnsavedEval false', () => {
    const emptyAutoSave = { nomEval: '', format: 'Csv&Xlsx' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? emptyAutoSave : null);
    fixture.detectChanges();
    expect(component.hasUnsavedEval).toBeFalse();
  });

  it('ngOnInit — emplacement homonyme mais au contenu différent → hasUnsavedEval true (le nom ne suffit pas)', () => {
    const current = { nomEval: 'MonEval', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    const other = { ...current, infoParticipant: ['Nom'] };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? current : i === 1 ? other : null);
    fixture.detectChanges();
    expect(component.hasUnsavedEval).toBeTrue();
  });

  it('ngOnInit — évaluation liée à un emplacement → hasUnsavedEval false', () => {
    const current = { nomEval: 'MonEval', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? current : i === 2 ? {...current, listScreens: [{name: 'ancien'}] as any} : null);
    saveServiceSpy.activeSlotIndex = 2;
    fixture.detectChanges();
    expect(component.hasUnsavedEval).toBeFalse();
  });

  it("saveToSlot — remplacement : la protection est appelée en mode « reçoit l'évaluation en cours »", async () => {
    const existing = { nomEval: 'Ancienne', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(false));
    fixture.detectChanges();

    await component.saveToSlot({ index: 1, data: existing });

    expect(overwriteGuardSpy.check).toHaveBeenCalledWith(1, {replacingWithCurrent: true});
  });

  it("saveToSlot — lie ensuite l'évaluation en cours à l'emplacement", async () => {
    const autoSave = { nomEval: 'Auto', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.getUniqueEvalName.and.returnValue('Auto');
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? autoSave : null);
    fixture.detectChanges();

    await component.saveToSlot({ index: 3, data: null });

    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(3, jasmine.objectContaining({slot: 3}));
    expect(saveServiceSpy.activeSlotIndex).toBe(3);
  });

  it("saveToSlot — nom rendu unique → l'évaluation en cours est renommée aussi", async () => {
    const autoSave = { nomEval: 'Eval', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.getUniqueEvalName.and.returnValue('Eval 1');
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 0 ? autoSave : null);
    Object.defineProperty(saveServiceSpy, 'hasLoadedWorkspace', {get: () => true});
    saveServiceSpy.dataAuto.nomEval = 'Eval';
    fixture.detectChanges();

    await component.saveToSlot({ index: 2, data: null });

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, jasmine.objectContaining({nomEval: 'Eval 1'}));
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, jasmine.objectContaining({nomEval: 'Eval 1'}));
    expect(saveServiceSpy.dataAuto.nomEval).toBe('Eval 1');
  });

  it("editSlot — relit l'emplacement après la protection (report éventuel de l'évaluation en cours)", async () => {
    const before = { nomEval: 'E1', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    const after = { ...before, listScreens: [{name: 'ajouté pendant la reprise'}] as any };
    let slot1: any = before;
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.check.and.callFake(async () => { slot1 = after; return true; });
    fixture.detectChanges();

    await component.editSlot(1);

    expect(saveServiceSpy.loadIntoWorkspace).toHaveBeenCalledWith(after, 2);
  });

  it("editSlot — emplacement ouvert dans un autre onglet, « Ouvrir une copie » → chargé sans lien", async () => {
    const slot1 = { nomEval: 'E1', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 2, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 1 ? slot1 : null);
    overwriteGuardSpy.reserveForOpening.and.resolveTo({mode: 'copy'});
    overwriteGuardSpy.check.and.resolveTo(true);
    fixture.detectChanges();

    await component.editSlot(1);

    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(null, null);
    expect(autoSaveServiceSpy.tryResume).toHaveBeenCalled();
  });

  it("saveToSlot — emplacement modifié dans un autre onglet → rien n'est écrit", async () => {
    overwriteGuardSpy.reserveForWriting.and.resolveTo(null);
    fixture.detectChanges();

    await component.saveToSlot({ index: 2, data: null });

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
    expect(saveServiceSpy.setActiveSlot).not.toHaveBeenCalled();
  });

  it("saveToSlot — remplacement annulé → la réservation de l'emplacement est libérée", async () => {
    const existing = { nomEval: 'Ancienne', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    const release = jasmine.createSpy('release');
    overwriteGuardSpy.reserveForWriting.and.resolveTo({slot: 1, release});
    overwriteGuardSpy.check.and.resolveTo(false);
    fixture.detectChanges();

    await component.saveToSlot({ index: 1, data: existing });

    expect(release).toHaveBeenCalled();
    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it("openDeletePopup — emplacement ouvert dans un autre onglet → aucune fenêtre de suppression", async () => {
    const existing = { nomEval: 'Ancienne', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    overwriteGuardSpy.ensureNotOpenElsewhere.and.resolveTo(false);
    fixture.detectChanges();

    await component.openDeletePopup({ index: 1, data: existing });

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(saveServiceSpy.clearSlot).not.toHaveBeenCalled();
  });

  it('ngOnInit — autoSave correspond à un slot sauvegardé → hasUnsavedEval false', () => {
    const saved = { nomEval: 'MonEval', format: 'Csv' as any, infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [], listScreens: [], step: 0, createdAt: '', version: 1 };
    loadServiceSpy.getSlot.and.callFake((i: number) => (i === 0 || i === 1) ? saved : null);
    fixture.detectChanges();
    expect(component.hasUnsavedEval).toBeFalse();
  });

  it('newEval — overwriteGuard bloque → navigate non appelé', async () => {
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(false));
    fixture.detectChanges();

    await component.newEval();

    expect(saveServiceSpy.newSaveDataAuto).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('La suppression de la sauvegarde auto vide le slot dynamique', async () => {
    const DynamicSlot: saveModel = {
      nomEval: 'EvalInProgress',
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

    loadServiceSpy.getSlot.and.callFake((index: number) => {
      if (index === 0) return DynamicSlot;
      if (index === 1) return null;
      if (index === 2) return null;
      if (index === 3) return null;
      return null;
    });

    saveServiceSpy.clearSlot.and.callFake(() => {
      loadServiceSpy.getSlot.and.returnValue(null);
    });

    await component.saveToSlot({ index: 0, data: null }, DynamicSlot);

    component.evalInProgress = true;
    await component.deleteAutoSave();

    fixture.detectChanges();

    expect(confirmSpy.confirm).toHaveBeenCalledWith(jasmine.objectContaining({tone: 'danger'}));
    expect(saveServiceSpy.clearSlot).toHaveBeenCalledWith(0);
    expect(component.evalInProgress).toBeFalse();
    expect(flashMessageServiceSpy.show).toHaveBeenCalledWith('success', 'Les dernières modifications ont été supprimées avec succès.');
    expect(component.slots[0].data).toBeNull();
    expect(component.slots).toEqual([
      { index: 1, data: null },
      { index: 2, data: null },
      { index: 3, data: null }
    ]);
  });

  it('deleteAutoSave — confirmation refusée → rien n\'est supprimé', async () => {
    loadServiceSpy.getSlot.and.callFake((index: number) => index === 0 ? { nomEval: 'X', listScreens: [] } as any : null);
    fixture.detectChanges();
    confirmSpy.confirm.and.returnValue(Promise.resolve(false));

    await component.deleteAutoSave();

    expect(saveServiceSpy.clearSlot).not.toHaveBeenCalled();
  });

  it('les actions des emplacements remplis sont visibles sans sélection préalable', () => {
    loadServiceSpy.getSlot.and.callFake((index: number) => index === 2 ? { nomEval: 'Rempli', createdAt: '', listScreens: [] } as any : null);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ouvrir');
    expect(text).toContain('Télécharger');
    expect(text).toContain('Supprimer');
  });
});
