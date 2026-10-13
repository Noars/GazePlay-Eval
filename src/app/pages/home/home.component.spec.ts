import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {HomeComponent} from './home.component';
import {SaveService} from '../../services/save/save.service';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {LoadService} from '../../services/load/load.service';
import {ImportFlowService} from '../../services/import-flow/import-flow.service';
import {saveModelDefault} from '../../shared/saveModel';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;
  let overwriteGuardSpy: jasmine.SpyObj<OverwriteGuardService>;
  let autoSaveSpy: jasmine.SpyObj<AutoSaveService>;
  let loadServiceSpy: jasmine.SpyObj<LoadService>;
  let importFlowSpy: jasmine.SpyObj<ImportFlowService>;

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['newSaveDataAuto']);
    overwriteGuardSpy = jasmine.createSpyObj('OverwriteGuardService', ['check']);
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(true));
    autoSaveSpy = jasmine.createSpyObj('AutoSaveService', ['tryResume']);
    loadServiceSpy = jasmine.createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.and.returnValue(null);
    importFlowSpy = jasmine.createSpyObj('ImportFlowService', ['start']);
    importFlowSpy.start.and.returnValue(Promise.resolve(false));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        {provide: SaveService, useValue: saveServiceSpy},
        {provide: OverwriteGuardService, useValue: overwriteGuardSpy},
        {provide: AutoSaveService, useValue: autoSaveSpy},
        {provide: LoadService, useValue: loadServiceSpy},
        {provide: ImportFlowService, useValue: importFlowSpy},
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  it('devrait être créé avec un unique titre de niveau 1', async () => {
    await create();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
  });

  it('goToInfoEval → nouvelle évaluation puis /info-eval', async () => {
    await create();
    await component.goToInfoEval();

    expect(overwriteGuardSpy.check).toHaveBeenCalledWith(0);
    expect(saveServiceSpy.newSaveDataAuto).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/info-eval']);
  });

  it('goToInfoEval → protection refusée → aucune navigation', async () => {
    overwriteGuardSpy.check.and.returnValue(Promise.resolve(false));
    await create();

    await component.goToInfoEval();

    expect(saveServiceSpy.newSaveDataAuto).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clic sur « Nouvelle évaluation » → goToInfoEval', async () => {
    await create();
    const spy = spyOn(component, 'goToInfoEval').and.returnValue(Promise.resolve());
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(b => b.textContent?.includes('Nouvelle évaluation'));

    button!.click();

    expect(spy).toHaveBeenCalled();
  });

  it('sans évaluation en cours → pas de carte de reprise', async () => {
    await create();
    expect(fixture.nativeElement.textContent).not.toContain('Reprendre cette évaluation');
  });

  it('avec une évaluation en cours → carte de reprise avec son nom et son étape', async () => {
    loadServiceSpy.getSlot.and.returnValue({...saveModelDefault, nomEval: 'Couleurs', step: 3, listScreens: []});
    await create();

    expect(fixture.nativeElement.textContent).toContain('Couleurs');
    expect(fixture.nativeElement.textContent).toContain('Création des écrans');
    expect(component.currentStepLabel()).toBe('Création des écrans');
  });

  it('goToLastStep → tryResume(false)', async () => {
    await create();
    await component.goToLastStep();
    expect(autoSaveSpy.tryResume).toHaveBeenCalledWith(false);
  });

  it('openImport → démarre le parcours d\'import', async () => {
    await create();
    component.openImport();
    expect(importFlowSpy.start).toHaveBeenCalled();
  });
});
