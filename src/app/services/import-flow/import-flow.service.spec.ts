import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {Router} from '@angular/router';
import {of} from 'rxjs';
import {ImportFlowService} from './import-flow.service';
import {LoadService} from '../load/load.service';
import {LoadZipService} from '../load-zip/load-zip.service';
import {SaveService} from '../save/save.service';
import {OverwriteGuardService} from '../overwrite-guard/overwrite-guard.service';
import {AutoSaveService} from '../auto-save/auto-save.service';
import {FlashService} from '../flash-message/flash.service';
import {PopupImportSaveComponent} from '../../components/popup-import-save/popup-import-save.component';

describe('ImportFlowService', () => {
  let service: ImportFlowService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let routerSpy: jasmine.SpyObj<Router>;
  let loadServiceSpy: jasmine.SpyObj<LoadService>;
  let loadZipSpy: jasmine.SpyObj<LoadZipService>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;
  let guardSpy: jasmine.SpyObj<OverwriteGuardService>;
  let autoSaveSpy: jasmine.SpyObj<AutoSaveService>;
  let flashSpy: jasmine.SpyObj<FlashService>;
  const zipFile = new File(['dummy'], 'test.gpSave');

  function dialogReturns(result: unknown): void {
    dialogSpy.open.and.returnValue({afterClosed: () => of(result)} as any);
  }

  beforeEach(() => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));
    loadServiceSpy = jasmine.createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.and.returnValue(null);
    loadZipSpy = jasmine.createSpyObj('LoadZipService', ['loadZip', 'loadZipToSlot']);
    loadZipSpy.loadZip.and.returnValue(Promise.resolve());
    loadZipSpy.loadZipToSlot.and.returnValue(Promise.resolve());
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveToSlot', 'getEvalName', 'setActiveSlot']);
    saveServiceSpy.dataAuto = {
      nomEval: 'TestEval', format: 'Csv', infoParticipant: [],
      globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [],
      listScreens: [], step: 0,
    };
    saveServiceSpy.getEvalName.and.callFake(() => saveServiceSpy.dataAuto.nomEval);
    guardSpy = jasmine.createSpyObj('OverwriteGuardService', ['check', 'getUniqueEvalName']);
    guardSpy.check.and.returnValue(Promise.resolve(true));
    guardSpy.getUniqueEvalName.and.callFake((name: string) => name);
    autoSaveSpy = jasmine.createSpyObj('AutoSaveService', ['tryResume']);
    flashSpy = jasmine.createSpyObj('FlashService', ['show']);

    TestBed.configureTestingModule({
      providers: [
        {provide: MatDialog, useValue: dialogSpy},
        {provide: Router, useValue: routerSpy},
        {provide: LoadService, useValue: loadServiceSpy},
        {provide: LoadZipService, useValue: loadZipSpy},
        {provide: SaveService, useValue: saveServiceSpy},
        {provide: OverwriteGuardService, useValue: guardSpy},
        {provide: AutoSaveService, useValue: autoSaveSpy},
        {provide: FlashService, useValue: flashSpy},
      ]
    });
    service = TestBed.inject(ImportFlowService);
  });

  it('ouvre la fenêtre d\'import avec l\'état des trois emplacements', async () => {
    loadServiceSpy.getSlot.and.callFake((i: number) => i === 2 ? {nomEval: 'Existante'} as any : null);
    dialogReturns(null);

    await service.start();

    expect(dialogSpy.open).toHaveBeenCalledWith(PopupImportSaveComponent, jasmine.objectContaining({
      disableClose: true,
      data: {slots: [
        {index: 1, name: '', empty: true},
        {index: 2, name: 'Existante', empty: false},
        {index: 3, name: '', empty: true},
      ]},
    }));
  });

  it('annulation → aucun import, aucune vérification', async () => {
    dialogReturns(null);
    expect(await service.start()).toBeFalse();
    expect(guardSpy.check).not.toHaveBeenCalled();
    expect(loadZipSpy.loadZip).not.toHaveBeenCalled();
  });

  it('protection de l\'évaluation en cours refusée → pas d\'import', async () => {
    dialogReturns({mode: 'consult', zipFile, slotIndex: null});
    guardSpy.check.and.returnValue(Promise.resolve(false));

    expect(await service.start()).toBeFalse();
    expect(loadZipSpy.loadZip).not.toHaveBeenCalled();
  });

  it('mode consultation → import dans l\'évaluation en cours, détachée de tout emplacement, puis reprise', async () => {
    dialogReturns({mode: 'consult', zipFile, slotIndex: null});

    expect(await service.start()).toBeTrue();

    expect(loadZipSpy.loadZip).toHaveBeenCalledWith(zipFile);
    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(null);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    expect(autoSaveSpy.tryResume).toHaveBeenCalledWith(true);
    expect(flashSpy.show).toHaveBeenCalledWith('success', jasmine.any(String));
  });

  it('mode sauvegarde → emplacement cible refusé → pas d\'import', async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 1});
    guardSpy.check.and.callFake((index: number) => Promise.resolve(index !== 1));

    expect(await service.start()).toBeFalse();
    expect(loadZipSpy.loadZipToSlot).not.toHaveBeenCalled();
  });

  it('mode sauvegarde → import dans l\'emplacement, lié à l\'évaluation en cours', async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 2});

    await service.start();

    expect(loadZipSpy.loadZipToSlot).toHaveBeenCalledWith(zipFile, 2);
    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(2);
    expect(autoSaveSpy.tryResume).toHaveBeenCalledWith(true);
  });

  it('mode sauvegarde → nom déjà utilisé → renommé et réenregistré (emplacement + slot 0)', async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 1});
    guardSpy.getUniqueEvalName.and.returnValue('TestEval 1');

    await service.start();

    expect(saveServiceSpy.dataAuto.nomEval).toBe('TestEval 1');
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(1, jasmine.any(Object));
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, jasmine.any(Object));
  });

  it('fichier illisible → message d\'erreur, pas de reprise, indicateur réinitialisé', async () => {
    dialogReturns({mode: 'consult', zipFile, slotIndex: null});
    loadZipSpy.loadZip.and.returnValue(Promise.reject(new Error('zip corrompu')));
    spyOn(console, 'error');

    expect(await service.start()).toBeFalse();

    expect(flashSpy.show).toHaveBeenCalledWith('error', jasmine.stringMatching('importé'));
    expect(autoSaveSpy.tryResume).not.toHaveBeenCalled();
    expect(service.importing()).toBeFalse();
  });
});
