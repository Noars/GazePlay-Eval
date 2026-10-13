import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {DownloadEvalComponent} from './download-eval.component';
import {SaveService} from '../../services/save/save.service';
import {DownloadService} from '../../services/download/download.service';
import {FlashService} from '../../services/flash-message/flash.service';

describe('DownloadEvalComponent', () => {
  let component: DownloadEvalComponent;
  let fixture: ComponentFixture<DownloadEvalComponent>;
  let downloadSpy: jasmine.SpyObj<DownloadService>;
  let saveSpy: jasmine.SpyObj<SaveService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let flashSpy: jasmine.SpyObj<FlashService>;

  function stimuliScreen(cells: Record<number, any>, values: Record<number, any> = {}) {
    const v: any[] = [1, 1, false, 10, 1, 'Tout', 1, false, false, false, '', undefined, cells, ''];
    Object.entries(values).forEach(([i, value]) => v[Number(i)] = value);
    return {name: 'Grille', type: 'stimuli', values: v} as any;
  }

  beforeEach(async () => {
    downloadSpy = jasmine.createSpyObj('DownloadService', ['generateEvalZip', 'generateSlotZip']);
    saveSpy = jasmine.createSpyObj('SaveService', ['getEvalName']);
    saveSpy.dataAuto = {
      nomEval: 'Couleurs', format: 'Csv&Xlsx', infoParticipant: ['Nom', ' '],
      globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: [],
      listScreens: [], step: 4,
    };
    saveSpy.getEvalName.and.returnValue('Couleurs');
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    flashSpy = jasmine.createSpyObj('FlashService', ['show']);

    downloadSpy.generateEvalZip.and.returnValue(Promise.resolve());
    downloadSpy.generateSlotZip.and.returnValue(Promise.resolve(true));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [DownloadEvalComponent],
      providers: [
        {provide: DownloadService, useValue: downloadSpy},
        {provide: SaveService, useValue: saveSpy},
        {provide: Router, useValue: routerSpy},
        {provide: FlashService, useValue: flashSpy},
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadEvalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('récapitulatif → nom, format lisible et champs participant non vides', () => {
    expect(component.evalName).toBe('Couleurs');
    expect(component.format).toBe('CSV et XLSX');
    expect(component.participantFields).toEqual(['Nom']);
  });

  it('goDownload → generateSlotZip avec createdAt et version, puis message de succès', async () => {
    await component.goDownload();
    expect(downloadSpy.generateSlotZip).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({nomEval: 'Couleurs', createdAt: jasmine.any(String), version: 1})
    );
    expect(flashSpy.show).toHaveBeenCalledWith('success', jasmine.any(String));
    expect(component.busy).toBeNull();
  });

  it('goDownload — échec signalé → message d\'erreur', async () => {
    downloadSpy.generateSlotZip.and.returnValue(Promise.resolve(false));
    await component.goDownload();
    expect(flashSpy.show).toHaveBeenCalledWith('error', jasmine.any(String));
  });

  it('goExport → generateEvalZip avec le SaveService', async () => {
    await component.goExport();
    expect(downloadSpy.generateEvalZip).toHaveBeenCalledOnceWith(saveSpy as any);
    expect(flashSpy.show).toHaveBeenCalledWith('success', jasmine.any(String));
  });

  it('goExport — erreur → message d\'erreur et boutons réactivés', async () => {
    downloadSpy.generateEvalZip.and.returnValue(Promise.reject(new Error('média manquant')));
    spyOn(console, 'error');
    await component.goExport();
    expect(flashSpy.show).toHaveBeenCalledWith('error', jasmine.any(String));
    expect(component.busy).toBeNull();
  });

  it('goExport — un export déjà en cours → second clic ignoré', async () => {
    let resolveExport!: () => void;
    downloadSpy.generateEvalZip.and.returnValue(new Promise<void>(resolve => resolveExport = resolve));

    const first = component.goExport();
    await component.goExport();
    expect(downloadSpy.generateEvalZip).toHaveBeenCalledTimes(1);

    resolveExport();
    await first;
  });

  it('backToCreateEval → navigue vers /create-eval', () => {
    component.backToCreateEval();
    expect(routerSpy.navigate).toHaveBeenCalledOnceWith(['/create-eval']);
  });

  // ─── Vérifications avant export ─────────────────────────────────────────────

  it('computeChecks — aucune écran → avertissement', () => {
    expect(component.computeChecks([]).map(c => c.message)).toContain('L\'évaluation ne contient aucun écran.');
  });

  it('computeChecks — instruction avec média activé mais sans fichier → avertissement', () => {
    const checks = component.computeChecks([
      {name: 'Consigne', type: 'instruction', values: [true, 1, true, 'Image', '', undefined, false, 1, '']} as any,
    ]);
    expect(checks.length).toBe(1);
    expect(checks[0].message).toContain('Consigne');
  });

  it('computeChecks — grille sans aucun média, son activé sans fichier → deux avertissements', () => {
    const checks = component.computeChecks([
      stimuliScreen({0: {imageName: '', soundName: '', hidden: false}}, {9: true}),
    ]);
    expect(checks.length).toBe(2);
  });

  it('computeChecks — écrans complets → aucune remarque', () => {
    const checks = component.computeChecks([
      stimuliScreen({0: {imageName: 'chat.png', soundName: '', hidden: false}}),
      {name: 'Pause', type: 'transition', values: [true, 2, false, false, 0]} as any,
    ]);
    expect(checks).toEqual([]);
  });

  it('screenCounts → compte les écrans par type', () => {
    saveSpy.dataAuto.listScreens = [
      stimuliScreen({}),
      {name: 'Pause', type: 'transition', values: []} as any,
      {name: 'Consigne', type: 'instruction', values: []} as any,
    ];
    expect(component.screenCounts).toEqual({transition: 1, instruction: 1, stimuli: 1, total: 3});
  });
});
