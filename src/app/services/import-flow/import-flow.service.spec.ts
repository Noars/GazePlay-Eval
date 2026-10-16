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
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('ImportFlowService', () => {
  let service: ImportFlowService;
  let dialogSpy: Mocked<MatDialog>;
  let routerSpy: Mocked<Router>;
  let loadServiceSpy: Mocked<LoadService>;
  let loadZipSpy: Mocked<LoadZipService>;
  let saveServiceSpy: Mocked<SaveService>;
  let guardSpy: Mocked<OverwriteGuardService>;
  let autoSaveSpy: Mocked<AutoSaveService>;
  let flashSpy: Mocked<FlashService>;
  const zipFile = new File(['dummy'], 'test.gpSave');

  function dialogReturns(result: unknown): void {
    dialogSpy.open.mockReturnValue({afterClosed: () => of(result)} as any);
  }

  beforeEach(() => {
    dialogSpy = createSpyObj('MatDialog', ['open']);
    routerSpy = createSpyObj('Router', ['navigate']);
    routerSpy.navigate.mockReturnValue(Promise.resolve(true));
    loadServiceSpy = createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.mockReturnValue(null);
    loadZipSpy = createSpyObj('LoadZipService', ['loadZip', 'loadZipToSlot']);
    loadZipSpy.loadZip.mockReturnValue(Promise.resolve());
    loadZipSpy.loadZipToSlot.mockReturnValue(Promise.resolve());
    saveServiceSpy = createSpyObj('SaveService', ['saveToSlot', 'getEvalName', 'setActiveSlot']);
    saveServiceSpy.dataAuto = {
      nomEval: 'TestEval', format: 'Csv', infoParticipant: [],
      globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [],
      listScreens: [], step: 0,
    };
    saveServiceSpy.getEvalName.mockImplementation(() => saveServiceSpy.dataAuto.nomEval);
    guardSpy = createSpyObj('OverwriteGuardService', ['check', 'getUniqueEvalName', 'reserveForImport']);
    // Par défaut, l'emplacement cible n'est ouvert dans aucun autre onglet.
    guardSpy.reserveForImport.mockImplementation(async (slot: any) => ({slot, release: vi.fn().mockName('release')}));
    guardSpy.check.mockReturnValue(Promise.resolve(true));
    guardSpy.getUniqueEvalName.mockImplementation((name: string) => name);
    autoSaveSpy = createSpyObj('AutoSaveService', ['tryResume']);
    flashSpy = createSpyObj('FlashService', ['show']);

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
    loadServiceSpy.getSlot.mockImplementation((i: number) => i === 2 ? {nomEval: 'Existante'} as any : null);
    dialogReturns(null);

    await service.start();

    expect(dialogSpy.open).toHaveBeenCalledWith(PopupImportSaveComponent, expect.objectContaining({
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
    expect(await service.start()).toBe(false);
    expect(guardSpy.check).not.toHaveBeenCalled();
    expect(loadZipSpy.loadZip).not.toHaveBeenCalled();
  });

  it('protection de l\'évaluation en cours refusée → pas d\'import', async () => {
    dialogReturns({mode: 'consult', zipFile, slotIndex: null});
    guardSpy.check.mockReturnValue(Promise.resolve(false));

    expect(await service.start()).toBe(false);
    expect(loadZipSpy.loadZip).not.toHaveBeenCalled();
  });

  it('mode consultation → import dans l\'évaluation en cours, détachée de tout emplacement, puis reprise', async () => {
    dialogReturns({mode: 'consult', zipFile, slotIndex: null});

    expect(await service.start()).toBe(true);

    expect(loadZipSpy.loadZip).toHaveBeenCalledWith(zipFile);
    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(null);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    expect(autoSaveSpy.tryResume).toHaveBeenCalledWith(true);
    expect(flashSpy.show).toHaveBeenCalledWith('success', expect.any(String));
  });

  it('mode sauvegarde → emplacement cible refusé → pas d\'import', async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 1});
    guardSpy.check.mockImplementation((index: number) => Promise.resolve(index !== 1));

    expect(await service.start()).toBe(false);
    expect(loadZipSpy.loadZipToSlot).not.toHaveBeenCalled();
  });

  it('mode sauvegarde → import dans l\'emplacement, lié à l\'évaluation en cours', async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 2});

    await service.start();

    expect(loadZipSpy.loadZipToSlot).toHaveBeenCalledWith(zipFile, 2);
    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(2, expect.objectContaining({slot: 2}));
    expect(autoSaveSpy.tryResume).toHaveBeenCalledWith(true);
  });

  it("mode sauvegarde, emplacement ouvert dans un autre onglet, « Ouvrir sans enregistrer » → import sans emplacement", async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 2});
    guardSpy.reserveForImport.mockResolvedValue('open');

    await service.start();

    expect(loadZipSpy.loadZipToSlot).not.toHaveBeenCalled();
    expect(loadZipSpy.loadZip).toHaveBeenCalledWith(zipFile);
    expect(saveServiceSpy.setActiveSlot).toHaveBeenCalledWith(null);
    expect(guardSpy.check).not.toHaveBeenCalledWith(2);
  });

  it("mode sauvegarde, emplacement ouvert dans un autre onglet, annulation → rien n'est importé", async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 2});
    guardSpy.reserveForImport.mockResolvedValue(null);

    expect(await service.start()).toBe(false);
    expect(loadZipSpy.loadZipToSlot).not.toHaveBeenCalled();
    expect(loadZipSpy.loadZip).not.toHaveBeenCalled();
    expect(guardSpy.check).not.toHaveBeenCalled();
  });

  it("mode sauvegarde, évaluation en cours protégée et annulée → la réservation de l'emplacement est libérée", async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 2});
    const release = vi.fn().mockName('release');
    guardSpy.reserveForImport.mockResolvedValue({slot: 2, release});
    guardSpy.check.mockResolvedValue(false);

    expect(await service.start()).toBe(false);
    expect(release).toHaveBeenCalled();
  });

  it('mode sauvegarde → nom déjà utilisé → renommé et réenregistré (emplacement + slot 0)', async () => {
    dialogReturns({mode: 'save', zipFile, slotIndex: 1});
    guardSpy.getUniqueEvalName.mockReturnValue('TestEval 1');

    await service.start();

    expect(saveServiceSpy.dataAuto.nomEval).toBe('TestEval 1');
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(1, expect.any(Object));
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, expect.any(Object));
  });

  it('fichier illisible → message d\'erreur, pas de reprise, indicateur réinitialisé', async () => {
    dialogReturns({mode: 'consult', zipFile, slotIndex: null});
    loadZipSpy.loadZip.mockReturnValue(Promise.reject(new Error('zip corrompu')));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await service.start()).toBe(false);

    expect(flashSpy.show).toHaveBeenCalledWith('error', expect.stringMatching('importé'));
    expect(autoSaveSpy.tryResume).not.toHaveBeenCalled();
    expect(service.importing()).toBe(false);
  });
});
