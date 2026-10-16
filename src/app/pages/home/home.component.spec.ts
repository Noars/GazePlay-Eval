import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {HomeComponent} from './home.component';
import {SaveService} from '../../services/save/save.service';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {LoadService} from '../../services/load/load.service';
import {ImportFlowService} from '../../services/import-flow/import-flow.service';
import {saveModelDefault} from '../../shared/saveModel';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let router: Router;
  let saveServiceSpy: Mocked<SaveService>;
  let overwriteGuardSpy: Mocked<OverwriteGuardService>;
  let autoSaveSpy: Mocked<AutoSaveService>;
  let loadServiceSpy: Mocked<LoadService>;
  let importFlowSpy: Mocked<ImportFlowService>;

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    saveServiceSpy = createSpyObj('SaveService', ['newSaveDataAuto']);
    overwriteGuardSpy = createSpyObj('OverwriteGuardService', ['check']);
    overwriteGuardSpy.check.mockReturnValue(Promise.resolve(true));
    autoSaveSpy = createSpyObj('AutoSaveService', ['tryResume']);
    loadServiceSpy = createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.mockReturnValue(null);
    importFlowSpy = createSpyObj('ImportFlowService', ['start']);
    importFlowSpy.start.mockReturnValue(Promise.resolve(false));

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
    vi.spyOn(router, 'navigate').mockReturnValue(Promise.resolve(true));
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

  it('goToInfoEval — double clic → une seule vérification et une seule nouvelle évaluation', async () => {
    await create();

    await Promise.all([component.goToInfoEval(), component.goToInfoEval()]);

    expect(overwriteGuardSpy.check).toHaveBeenCalledTimes(1);
    expect(saveServiceSpy.newSaveDataAuto).toHaveBeenCalledTimes(1);
  });

  it('goToInfoEval → protection refusée → aucune navigation', async () => {
    overwriteGuardSpy.check.mockReturnValue(Promise.resolve(false));
    await create();

    await component.goToInfoEval();

    expect(saveServiceSpy.newSaveDataAuto).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clic sur « Nouvelle évaluation » → goToInfoEval', async () => {
    await create();
    const spy = vi.spyOn(component, 'goToInfoEval').mockReturnValue(Promise.resolve());
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
    loadServiceSpy.getSlot.mockReturnValue({...saveModelDefault, nomEval: 'Couleurs', step: 3, listScreens: []});
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
