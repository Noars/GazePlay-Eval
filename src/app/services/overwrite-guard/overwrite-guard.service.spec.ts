import { TestBed } from '@angular/core/testing';
import { isEmptyEvaluation, OverwriteGuardService, sameEvaluation } from './overwrite-guard.service';
import { LoadService } from '../load/load.service';
import { DownloadService } from '../download/download.service';
import { SaveService } from '../save/save.service';
import { MatDialog } from '@angular/material/dialog';
import {of} from 'rxjs';
import {saveModel} from '../../shared/saveModel';
import type {Mock, Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

/** Sauvegarde complète de test ; `screens` différencie les contenus. */
function evaluation(nomEval: string, screens: string[] = []): saveModel {
  return {
    nomEval, format: 'Csv', infoParticipant: [], globalParamsTransitionScreen: [], globalParamsInstructionScreen: [],
    globalParamsStimuliScreen: [], listScreens: screens.map(name => ({name, type: 'transition', values: []})) as any,
    step: 0, createdAt: '2026-10-15T10:00:00.000Z', version: 1,
  };
}

describe('OverwriteGuardService', () => {
  let service: OverwriteGuardService;
  let loadServiceSpy: Mocked<LoadService>;
  let saveServiceFake: {saveToSlot: Mock; dataAuto: any; activeSlotIndex: number | null; hasLoadedWorkspace: boolean};
  let dialogSpy: Mocked<MatDialog>;
  let downloadServiceSpy: Mocked<DownloadService>;
  let slots: Record<number, saveModel | null>;

  /** Réponse de la fenêtre de remplacement : 'download', 'overwrite' ou null (annuler). */
  function dialogAnswers(answer: 'download' | 'overwrite' | null): void {
    dialogSpy.open.mockReturnValue({afterClosed: () => of(answer)} as any);
  }

  beforeEach(() => {
    slots = {0: null, 1: null, 2: null, 3: null};
    loadServiceSpy = createSpyObj('LoadService', ['getSlot']);
    loadServiceSpy.getSlot.mockImplementation((index: any) => slots[index] ?? null);
    saveServiceFake = {saveToSlot: vi.fn().mockName('saveToSlot'), dataAuto: {nomEval: 'TestEval'}, activeSlotIndex: null, hasLoadedWorkspace: true};
    dialogSpy = createSpyObj('MatDialog', ['open']);
    dialogAnswers(null);
    downloadServiceSpy = createSpyObj('DownloadService', ['generateSlotZip']);
    downloadServiceSpy.generateSlotZip.mockReturnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        OverwriteGuardService,
        { provide: LoadService,     useValue: loadServiceSpy },
        { provide: MatDialog,       useValue: dialogSpy },
        { provide: DownloadService, useValue: downloadServiceSpy },
        { provide: SaveService,     useValue: saveServiceFake }
      ]
    });

    service = TestBed.inject(OverwriteGuardService);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('check → retourne true si le slot est null (vide)', async () => {
    expect(await service.check(1)).toBe(true);
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('check → retourne true si l\'évaluation du slot est réellement vide (pas de nom, rien d\'autre)', async () => {
    slots[1] = {...evaluation(''), format: 'Csv&Xlsx'};
    expect(await service.check(1)).toBe(true);
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('check → fenêtre si le slot n\'a pas de nom mais contient des écrans (le nom vide ne veut pas dire vide)', async () => {
    slots[1] = evaluation('', ['Ecran 1']);
    expect(await service.check(1)).toBe(false);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  describe('évaluation en cours (slot 0)', () => {
    it('liée à un emplacement → reportée sans question dans cet emplacement', async () => {
      slots[0] = evaluation('TestEval');
      slots[2] = evaluation('TestEval', ['ancienne version']);
      saveServiceFake.activeSlotIndex = 2;

      expect(await service.check(0)).toBe(true);
      expect(saveServiceFake.saveToSlot).toHaveBeenCalledWith(2, saveServiceFake.dataAuto);
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('liée, mais copie de travail jamais chargée (nouvel onglet) → reporte le slot 0 enregistré, jamais le modèle vide', async () => {
      slots[0] = evaluation('Travail', ['T1', 'T2']);
      slots[1] = evaluation('Travail', ['T1', 'T2']);
      saveServiceFake.activeSlotIndex = 1;
      saveServiceFake.hasLoadedWorkspace = false;
      saveServiceFake.dataAuto = {nomEval: '', listScreens: []};

      expect(await service.check(0)).toBe(true);
      expect(saveServiceFake.saveToSlot).toHaveBeenCalledWith(1, slots[0]);
    });

    it('lien vers un emplacement vidé entre-temps → ignoré, la fenêtre s\'affiche', async () => {
      slots[0] = evaluation('TestEval');
      saveServiceFake.activeSlotIndex = 3;

      expect(await service.check(0)).toBe(false);
      expect(saveServiceFake.saveToSlot).not.toHaveBeenCalled();
      expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('non liée, emplacement HOMONYME au contenu différent → fenêtre, rien n\'est copié (le nom ne suffit plus)', async () => {
      slots[0] = evaluation('TestEval', ['nouvelle']);
      slots[2] = evaluation('TestEval', ['A', 'B', 'C']);
      saveServiceFake.dataAuto = slots[0];

      expect(await service.check(0)).toBe(false);
      expect(dialogSpy.open).toHaveBeenCalled();
      expect(saveServiceFake.saveToSlot).not.toHaveBeenCalled();
    });

    it('non liée, mais un emplacement contient exactement la même évaluation → rien à perdre, pas de fenêtre', async () => {
      slots[0] = evaluation('TestEval', ['A']);
      slots[3] = {...evaluation('TestEval', ['A']), createdAt: '2020-01-01T00:00:00.000Z', step: 4};
      saveServiceFake.dataAuto = {...slots[0]};

      expect(await service.check(0)).toBe(true);
      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(saveServiceFake.saveToSlot).not.toHaveBeenCalled();
    });
  });

  describe('emplacement nommé', () => {
    it('occupé → fenêtre, même si le nom est identique', async () => {
      slots[1] = evaluation('TestEval');

      expect(await service.check(1)).toBe(false);
      expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('replacingWithCurrent sur l\'emplacement lié → pas de fenêtre (il contient déjà cette évaluation)', async () => {
      slots[1] = evaluation('TestEval', ['ancienne version']);
      saveServiceFake.activeSlotIndex = 1;

      expect(await service.check(1, {replacingWithCurrent: true})).toBe(true);
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('replacingWithCurrent, contenu identique à l\'évaluation en cours → pas de fenêtre', async () => {
      slots[1] = evaluation('Brouillon', ['B1']);
      saveServiceFake.dataAuto = evaluation('Brouillon', ['B1']);

      expect(await service.check(1, {replacingWithCurrent: true})).toBe(true);
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('replacingWithCurrent sur une AUTRE évaluation → fenêtre (remplacement confirmé)', async () => {
      slots[1] = evaluation('Important', ['I1', 'I2']);
      saveServiceFake.dataAuto = evaluation('Brouillon', ['B1']);

      expect(await service.check(1, {replacingWithCurrent: true})).toBe(false);
      expect(dialogSpy.open).toHaveBeenCalled();
    });
  });

  it('check → popup, réponse download → génère zip + retourne true', async () => {
    slots[1] = evaluation('TestEval');
    dialogAnswers('download');

    const result = await service.check(1);

    expect(downloadServiceSpy.generateSlotZip).toHaveBeenCalledWith(slots[1]!);
    expect(result).toBe(true);
  });

  it('check → popup, réponse overwrite → retourne true sans download', async () => {
    slots[1] = evaluation('TestEval');
    dialogAnswers('overwrite');

    const result = await service.check(1);

    expect(downloadServiceSpy.generateSlotZip).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('check → popup, réponse null → retourne false', async () => {
    slots[1] = evaluation('TestEval');

    const result = await service.check(1);

    expect(downloadServiceSpy.generateSlotZip).not.toHaveBeenCalled();
    expect(saveServiceFake.saveToSlot).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('findSlotHolding → emplacement au contenu identique, sinon null', () => {
    slots[2] = evaluation('E', ['X']);
    expect(service.findSlotHolding(evaluation('E', ['X']))).toBe(2);
    expect(service.findSlotHolding(evaluation('E', ['Y']))).toBeNull();
    expect(service.findSlotHolding(null)).toBeNull();
  });

  it('getUniqueEvalName → retourne le nom intact si pas de conflit', () => {
    expect(service.getUniqueEvalName('MonEval', 1)).toBe('MonEval');
  });

  it('getUniqueEvalName → ajoute suffixe " 1", " 2" si conflit', () => {
    slots[2] = evaluation('MonEval');
    expect(service.getUniqueEvalName('MonEval', 1)).toBe('MonEval 1');
  });
});

describe('sameEvaluation', () => {
  it('ignore la date, la version et l\'étape', () => {
    expect(sameEvaluation(evaluation('E', ['A']), {...evaluation('E', ['A']), createdAt: 'autre', version: 2, step: 4})).toBe(true);
  });

  it('ignore l\'ordre des clés des objets', () => {
    const a = evaluation('E');
    const b = evaluation('E');
    a.listScreens = [{name: 'S', type: 'stimuli', values: [{imageName: 'x', goodAnswer: true}]}] as any;
    b.listScreens = [{values: [{goodAnswer: true, imageName: 'x'}], type: 'stimuli', name: 'S'}] as any;
    expect(sameEvaluation(a, b)).toBe(true);
  });

  it('un File en mémoire équivaut à sa forme enregistrée ({})', () => {
    const memory = evaluation('E');
    const stored = evaluation('E');
    memory.listScreens = [{name: 'S', type: 'instruction', values: [true, 1, true, 'Image', 'a.png', new File(['x'], 'a.png')]}] as any;
    stored.listScreens = JSON.parse(JSON.stringify(memory.listScreens));
    expect(sameEvaluation(memory, stored)).toBe(true);
  });

  it('détecte une différence de nom, de champs ou d\'écrans', () => {
    expect(sameEvaluation(evaluation('E'), evaluation('F'))).toBe(false);
    expect(sameEvaluation(evaluation('E', ['A']), evaluation('E', ['A', 'B']))).toBe(false);
    expect(sameEvaluation(evaluation('E'), {...evaluation('E'), infoParticipant: ['Nom']})).toBe(false);
  });
});

describe('isEmptyEvaluation', () => {
  const base = (): saveModel => ({
    nomEval: '', format: 'Csv&Xlsx', infoParticipant: [], globalParamsTransitionScreen: [true, 10, false, false, 0],
    globalParamsInstructionScreen: [true, 10, false, 'Image', false, 1], globalParamsStimuliScreen: [1, 1, false, 10, 1, 1, false, false],
    listScreens: [], step: 0, createdAt: 'x', version: 1,
  });

  it('nouvelle évaluation non modifiée, ou modèle jamais renseigné : vide', () => {
    expect(isEmptyEvaluation(base())).toBe(true);
    expect(isEmptyEvaluation({...base(), globalParamsTransitionScreen: [], globalParamsInstructionScreen: [], globalParamsStimuliScreen: []})).toBe(true);
    expect(isEmptyEvaluation({...base(), nomEval: '   '})).toBe(true);
  });

  it('dès qu\'il y a un nom, un champ, un écran, un autre format ou des paramètres modifiés : pas vide', () => {
    expect(isEmptyEvaluation({...base(), nomEval: 'E'})).toBe(false);
    expect(isEmptyEvaluation({...base(), infoParticipant: ['Nom']})).toBe(false);
    expect(isEmptyEvaluation({...base(), listScreens: [{name: 'S'} as any]})).toBe(false);
    expect(isEmptyEvaluation({...base(), format: 'Csv'})).toBe(false);
    expect(isEmptyEvaluation({...base(), globalParamsStimuliScreen: [2, 2, false, 10, 1, 1, false, false]})).toBe(false);
  });
});
