import { TestBed } from '@angular/core/testing';
import { OverwriteGuardService } from './overwrite-guard.service';
import { LoadService } from '../load/load.service';
import { DownloadService } from '../download/download.service';
import { SaveService } from '../save/save.service';
import { MatDialog } from '@angular/material/dialog';
import {of} from 'rxjs';
describe('OverwriteGuardService', () => {
  let service: OverwriteGuardService;
  let loadServiceSpy: jasmine.SpyObj<LoadService>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let downloadServiceSpy: jasmine.SpyObj<DownloadService>;

  beforeEach(() => {
    loadServiceSpy = jasmine.createSpyObj('LoadService', ['getSlot']);
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveToSlot'], {
      dataAuto: { nomEval: 'TestEval' }
    });
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    downloadServiceSpy = jasmine.createSpyObj('DownloadService', ['generateSlotZip']);

    TestBed.configureTestingModule({
      providers: [
        OverwriteGuardService,
        { provide: LoadService,     useValue: loadServiceSpy },
        { provide: MatDialog,       useValue: dialogSpy },
        { provide: DownloadService, useValue: downloadServiceSpy },
        { provide: SaveService,     useValue: saveServiceSpy }
      ]
    });

    service = TestBed.inject(OverwriteGuardService);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('check → retourne true si le slot est null (vide)', async () => {
    loadServiceSpy.getSlot.and.returnValue(null);

    const result = await service.check(1);

    expect(result).toBeTrue();
  });

  it('check → retourne true si le slot a un nomEval vide', async () => {
    loadServiceSpy.getSlot.and.returnValue({ nomEval: '' } as any);

    const result = await service.check(1);

    expect(result).toBeTrue();
  });

  it('check → retourne true si skipIfSameEvalName correspond au nomEval existant', async () => {
    loadServiceSpy.getSlot.and.returnValue({ nomEval: 'TestEval' } as any);

    const result = await service.check(1, 'TestEval');

    expect(result).toBeTrue();
  });


  it('check slot 0 → sauvegarde silencieuse si nomEval trouvé dans slots 1-3', async () => {
    loadServiceSpy.getSlot.and.callFake((index) => {
      if (index === 0) return { nomEval: 'TestEval' } as any;
      if (index === 2) return { nomEval: 'TestEval' } as any;
      return null;
    });

    const result = await service.check(0);

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, saveServiceSpy.dataAuto);
    expect(result).toBeTrue();
  });


  it('check → popup, réponse download → génère zip + retourne true', async () => {
    loadServiceSpy.getSlot.and.returnValue({ nomEval: 'TestEval' } as any);
    downloadServiceSpy.generateSlotZip.and.returnValue(Promise.resolve(true));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of('download')
    } as any);

    const result = await service.check(1);

    expect(downloadServiceSpy.generateSlotZip).toHaveBeenCalledWith({ nomEval: 'TestEval' } as any);
    expect(result).toBeTrue();
  });

  it('check → popup, réponse overwrite → retourne true sans download', async () => {
    loadServiceSpy.getSlot.and.returnValue({ nomEval: 'TestEval' } as any);
    downloadServiceSpy.generateSlotZip.and.returnValue(Promise.resolve(true));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of('overwrite')
    } as any);

    const result = await service.check(1);

    expect(downloadServiceSpy.generateSlotZip).not.toHaveBeenCalled();
    expect(result).toBeTrue();
  });

  it('check → popup, réponse null → retourne false', async () => {
    loadServiceSpy.getSlot.and.returnValue({ nomEval: 'TestEval' } as any);
    downloadServiceSpy.generateSlotZip.and.returnValue(Promise.resolve(true));
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(null)
    } as any);

    const result = await service.check(1);

    expect(downloadServiceSpy.generateSlotZip).not.toHaveBeenCalled();

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
    expect(result).toBeFalse();
  });

  it('getUniqueEvalName → retourne le nom intact si pas de conflit', () => {
    loadServiceSpy.getSlot.and.returnValue(null);

    const result = service.getUniqueEvalName('MonEval', 1);

    expect(result).toBe('MonEval');
  });

  it('getUniqueEvalName → ajoute suffixe " 1", " 2" si conflit', async () => {
    loadServiceSpy.getSlot.and.callFake((index) => {
      if (index === 2) return { nomEval: 'MonEval' } as any;
      return null;
    });

    const result = service.getUniqueEvalName('MonEval', 1);

    expect(result).toBe('MonEval 1');


  });
});
