import { TestBed } from '@angular/core/testing';
import { AutoSaveService } from './auto-save.service';
import { Router, NavigationStart } from '@angular/router';
import { SaveService } from '../save/save.service';
import { FlashService } from '../flash-message/flash.service';
import { LoadService } from '../load/load.service';
import { IndexedDBService } from '../indexedDB/indexed-db.service';
import { Subject } from 'rxjs';
import { saveModelDefault } from '../../shared/saveModel';

describe('AutoSaveService', () => {
  let service: AutoSaveService;
  let routerEvents$: Subject<any>;
  let routerSpy: jasmine.SpyObj<Router>;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;
  let flashServiceSpy: jasmine.SpyObj<FlashService>;
  let loadServiceSpy: jasmine.SpyObj<LoadService>;
  let indexedDbSpy: jasmine.SpyObj<IndexedDBService>;

  beforeEach(() => {
    routerEvents$ = new Subject();
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEvents$.asObservable()
    });
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveToSlot'], {
      dataAuto: { ...saveModelDefault, nomEval: 'TestEval', step: 0 }
    });
    saveServiceSpy.activeSlotIndex = null;

    flashServiceSpy = jasmine.createSpyObj('FlashService', ['show']);
    loadServiceSpy = jasmine.createSpyObj('LoadService', ['getSlot']);
    indexedDbSpy = jasmine.createSpyObj('IndexedDBService', ['deleteFileByProject']);
    indexedDbSpy.deleteFileByProject.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        AutoSaveService,
        { provide: Router,         useValue: routerSpy },
        { provide: SaveService,    useValue: saveServiceSpy },
        { provide: FlashService,   useValue: flashServiceSpy },
        { provide: LoadService,    useValue: loadServiceSpy },
        { provide: IndexedDBService, useValue: indexedDbSpy }
      ]
    });

    service = TestBed.inject(AutoSaveService);
    loadServiceSpy.getSlot.and.returnValue({ ...saveModelDefault, nomEval: 'TestEval', step: 0 });
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('init → s\'abonne aux événements NavigationStart', () => {
    service.init();
    routerEvents$.next(new NavigationStart(1, '/create-eval'));
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalled();
  });

  it('autoSave sur page exclue → ne sauvegarde pas', () => {
    service.autoSave('/home');
    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it('autoSave sur page normale → step mis à jour et slot 0 sauvegardé', () => {
    service.autoSave('/create-eval');
    expect(saveServiceSpy.dataAuto.step).toBe(3);
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, saveServiceSpy.dataAuto);
    expect(flashServiceSpy.show).toHaveBeenCalledWith('info', jasmine.any(String));
  });

  it('autoSave avec activeSlotIndex défini → slot 0 ET activeSlot sauvegardés', () => {
    saveServiceSpy.activeSlotIndex = 2 as any;

    service.autoSave('/create-eval');

    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(0, saveServiceSpy.dataAuto);
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, saveServiceSpy.dataAuto);
  });

  it('tryResume → reconstruit dataAuto et navigue vers la bonne route', () => {
    loadServiceSpy.getSlot.and.returnValue({ ...saveModelDefault, nomEval: 'TestEval', step: 3 });

    expect(saveServiceSpy.dataAuto.nomEval).toBe('TestEval');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/create-eval']);
  });

  it('tryResume → ne fait rien si slot null', () => {
    loadServiceSpy.getSlot.and.returnValue(null);

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('tryResume → ne fait rien si step = -1', () => {
    loadServiceSpy.getSlot.and.returnValue({ ...saveModelDefault, step: -1 });

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('ngOnDestroy → unsubscribe() appelé', () => {
    service.init();
    const sub = (service as any).subscription;
    spyOn(sub, 'unsubscribe');

    service.ngOnDestroy();

    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('init — isResuming = true → NavigationStart n\'appelle pas autoSave', () => {
    service.init();
    (service as any).isResuming = true;

    routerEvents$.next(new NavigationStart(1, '/create-eval'));

    expect(saveServiceSpy.saveToSlot).not.toHaveBeenCalled();
  });

  it('autoSave — nomEvals différents → deleteFileByProject appelé', () => {
    saveServiceSpy.dataAuto.nomEval = 'NouvelleEval';
    loadServiceSpy.getSlot.and.returnValue({ ...saveModelDefault, nomEval: 'AncienneEval', step: 0 });

    service.autoSave('/create-eval');

    expect(indexedDbSpy.deleteFileByProject).toHaveBeenCalled();
  });

  it('tryResume — step sans route → ne navigue pas', () => {
    loadServiceSpy.getSlot.and.returnValue({ ...saveModelDefault, step: 99 });

    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
