import { TestBed } from '@angular/core/testing';
import { LoadZipService } from './load-zip.service';
import { SaveService } from '../save/save.service';
import { IndexedDBService } from '../indexedDB/indexed-db.service';
import { InvalidEvaluationArchiveError } from './load-zip.service';
import JSZip from 'jszip';
import {
  transitionScreenConstModel,
  instructionScreenConstModel,
  stimuliScreenConstModel
} from '../../shared/screenModel';

function createMockZip(entries: Record<string, { dir?: boolean; content: string | Blob }>) {
  return {
    forEach: (callback: (path: string, entry: any) => void) => {
      for (const [path, { dir, content }] of Object.entries(entries)) {
        callback(path, {
          dir: dir ?? false,
          async: (_type: string) => Promise.resolve(content)
        });
      }
    }
  };
}

describe('LoadZipService', () => {
  let service: LoadZipService;
  let saveServiceSpy: jasmine.SpyObj<SaveService>;
  let idbServiceSpy: jasmine.SpyObj<IndexedDBService>;
  let mockZipFile: File;

  beforeEach(() => {
    saveServiceSpy = jasmine.createSpyObj('SaveService', ['saveDataAuto', 'saveToSlot']);
    saveServiceSpy.dataAuto = {
      nomEval: '',
      format: 'Csv&Xlsx',
      infoParticipant: [],
      globalParamsTransitionScreen: ['default-transition'] as any,
      globalParamsInstructionScreen: ['default-instruction'] as any,
      globalParamsStimuliScreen: ['default-stimuli'] as any,
      listScreens: [],
      step: 0
    };

    idbServiceSpy = jasmine.createSpyObj('IndexedDBService', ['addFile', 'updateFile', 'getFile']);
    idbServiceSpy.addFile.and.returnValue(Promise.resolve());
    idbServiceSpy.updateFile.and.returnValue(Promise.resolve());
    idbServiceSpy.getFile.and.returnValue(Promise.reject(new Error('introuvable')));

    TestBed.configureTestingModule({
      providers: [
        LoadZipService,
        { provide: SaveService, useValue: saveServiceSpy },
        { provide: IndexedDBService, useValue: idbServiceSpy }
      ]
    });

    service = TestBed.inject(LoadZipService);
    mockZipFile = new File(['dummy'], 'test.zip', { type: 'application/zip' });
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('loadZip — écran transition → saveDataAuto appelé avec les bons paramètres', async () => {
    const evalInfo = {
      "Nom de l'évaluation": 'MonEval',
      "Format choisi": 'Csv&Xlsx',
      "Informations participant": [],
      globalParamsTransitionScreen: {
        "Mettre un temps avant passage à l'écran suivant": true,
        "Combien de temps": 2,
        "Mettre une croix de fixation": false,
        "Mettre un temps de fixation": false,
        "Combien de temps de fixation": 1
      },
      globalParamsInstructionScreen: {
        "Mettre un temps avant passage à l'écran suivant": false,
        "Combien de temps": 1,
        "Ajouter un media": false,
        "Type de media": 'Image',
        "Ajouter un bouton pour lancer evaluation": false,
        "Combien de temps de fixation": 1
      },
      globalParamsStimuliScreen: {
        "Nombre de lignes": 1,
        "Nombre de colonnes": 1,
        "Mettre un temps avant passage à l'écran suivant": false,
        "Combien de temps": 10,
        "Combien de temps de fixation": 1,
        "Choix de sélection": 'Tout',
        "Combien à sélectionner": 1,
        "Position stimuli aléatoire": false
      }
    };
    const evalData = [{
      Type: transitionScreenConstModel,
      Name: 'Ecran T',
      "Mettre un temps avant passage à l'écran suivant": true,
      "Combien de temps": 2,
      "Mettre une croix de fixation": false,
      "Mettre un temps de fixation": false,
      "Combien de temps de fixation": 1
    }];

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: JSON.stringify(evalData) }
    }) as any));

    await service.loadZip(mockZipFile);

    const args = saveServiceSpy.saveDataAuto.calls.mostRecent().args;
    expect(args[0]).toBe('MonEval');
    expect(args[1]).toBe('Csv&Xlsx');
    expect(args[3] as any).toEqual([true, 2, false, false, 1]);
    expect(args[4] as any).toEqual([false, 1, false, 'Image', false, 1]);
    expect(args[5] as any).toEqual([1, 1, false, 10, 1, 'Tout', 1, false]);
    expect(args[6] as any).toEqual([{ name: 'Ecran T', type: transitionScreenConstModel, values: [true, 2, false, false, 1] }]);
  });

  it('loadZip — écran instruction → idbId construit correctement dans values[8]', async () => {
    const evalInfo = { "Nom de l'évaluation": 'MyEval' };
    const evalData = [{
      Type: instructionScreenConstModel,
      name: 'Ecran I',
      "Mettre un temps avant passage à l'écran suivant": false,
      "Combien de temps": 1,
      "Ajouter un media": true,
      "Type de media": 'Image',
      "Lien du fichier": 'photo.png',
      "Ajouter un bouton pour lancer evaluation": false,
      "Combien de temps de fixation": 2
    }];

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: JSON.stringify(evalData) }
    }) as any));

    await service.loadZip(mockZipFile);

    const listScreens = saveServiceSpy.saveDataAuto.calls.mostRecent().args[6];
    expect(listScreens[0].values[8]).toBe('MyEval/photo.png');
  });

  it('loadZip — écran stimuli → imageId et soundId injectés dans les cellules', async () => {
    const evalInfo = { "Nom de l'évaluation": 'StimuliEval' };
    const evalData = [{
      Type: stimuliScreenConstModel,
      name: 'Ecran S',
      "Nombre de lignes": 2,
      "Nombre de colonnes": 2,
      "Mettre un temps avant passage à l'écran suivant": false,
      "Combien de temps": 10,
      "Combien de temps de fixation": 1,
      "Choix de sélection": 'Tout',
      "Combien à sélectionner": 1,
      "Position stimuli aléatoire": false,
      "Caché stimuli après selection": false,
      "Mettre un son": false,
      "Type du fichier": '',
      "Liste des stimuli": {
        0: { imageName: 'img1.png', soundName: 'snd1.mp3', goodAnswer: true }
      }
    }];

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: JSON.stringify(evalData) }
    }) as any));

    await service.loadZip(mockZipFile);

    const listScreens = saveServiceSpy.saveDataAuto.calls.mostRecent().args[6];
    const cells = listScreens[0].values[12];
    expect(cells[0].imageId).toBe('StimuliEval/img1.png');
    expect(cells[0].soundId).toBe('StimuliEval/snd1.mp3');
  });

  it('loadZip — evalInfo.json invalide → evalName par défaut (GazePlayEvalDefaultName)', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: 'NOT_JSON' },
      'evalData.json': { content: '[]' }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(saveServiceSpy.saveDataAuto.calls.mostRecent().args[0]).toBe('GazePlayEvalDefaultName');
  });

  it('loadZip — evalData.json illisible → import refusé, rien n\'est enregistré (régression)', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'EvalOK' }) },
      'evalData.json': { content: 'NOT_JSON' },
      'EvalOK/images/photo.png': { content: new Blob(['img']) }
    }) as any));

    await expectAsync(service.loadZip(mockZipFile)).toBeRejectedWithError(InvalidEvaluationArchiveError);
    expect(saveServiceSpy.saveDataAuto).not.toHaveBeenCalled();
    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
  });

  it('loadZip — archive sans evalData.json (autre fichier .zip) → import refusé, rien n\'est enregistré', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'documents/rapport.txt': { content: new Blob(['texte']) }
    }) as any));

    await expectAsync(service.loadZip(mockZipFile)).toBeRejectedWithError(InvalidEvaluationArchiveError);
    expect(saveServiceSpy.saveDataAuto).not.toHaveBeenCalled();
    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
  });

  it('loadZip — evalData.json qui n\'est pas un tableau → import refusé', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: '{}' },
      'evalData.json': { content: JSON.stringify({ Type: 'transition' }) }
    }) as any));

    await expectAsync(service.loadZip(mockZipFile)).toBeRejectedWithError(InvalidEvaluationArchiveError);
    expect(saveServiceSpy.saveDataAuto).not.toHaveBeenCalled();
  });

  it('loadZip — évaluation sans écran (tableau vide) → importée normalement', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'Vide' }) },
      'evalData.json': { content: '[]' }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(saveServiceSpy.saveDataAuto.calls.mostRecent().args[6]).toEqual([]);
  });

  it('loadZip — fichiers __MACOSX ignorés → addFile non appelé', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: '{}' },
      'evalData.json': { content: '[]' },
      '__MACOSX/images/photo.png': { content: new Blob(['img']) }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
  });

  it('loadZip — fichier image/ → stocké dans l\'IDB avec type image', async () => {
    const evalInfo = { "Nom de l'évaluation": 'EvalImg' };
    const blob = new Blob(['img-data'], { type: 'image/png' });

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: '[]' },
      'EvalImg/images/photo.png': { content: blob }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('EvalImg/photo.png', blob, 'image');
  });

  it('loadZip — addFile échoue → updateFile appelé en fallback', async () => {
    idbServiceSpy.addFile.and.returnValue(Promise.reject(new Error('déjà présent')));
    const evalInfo = { "Nom de l'évaluation": 'EvalFallback' };
    const blob = new Blob(['data']);

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: '[]' },
      'EvalFallback/images/img.png': { content: blob }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.updateFile).toHaveBeenCalledWith('EvalFallback/img.png', blob, 'image');
  });

  it('loadZip — chemin audio/ → type sound dans l\'IDB', async () => {
    const evalInfo = { "Nom de l'évaluation": 'EvalAudio' };
    const blob = new Blob(['audio-data']);

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: '[]' },
      'EvalAudio/audio/son.mp3': { content: blob }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('EvalAudio/son.mp3', blob, 'sound');
  });

  it('loadZip — chemin videos/ → type video dans l\'IDB', async () => {
    const evalInfo = { "Nom de l'évaluation": 'EvalVideo' };
    const blob = new Blob(['video-data']);

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: '[]' },
      'EvalVideo/videos/clip.mp4': { content: blob }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('EvalVideo/clip.mp4', blob, 'video');
  });

  it('loadZip — type d\'écran inconnu → lève une erreur', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'EvalErr' }) },
      'evalData.json': { content: JSON.stringify([{ Type: 'unknown_type' }]) }
    }) as any));

    await expectAsync(service.loadZip(mockZipFile))
      .toBeRejectedWithError("Type d'écran inconnu : unknown_type");
  });

  it('loadZip — type d\'écran inconnu → aucun média écrit avant l\'échec (régression)', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'EvalErr' }) },
      'evalData.json': { content: JSON.stringify([{ Type: 'unknown_type' }]) },
      'EvalErr/images/photo.png': { content: new Blob(['img']) }
    }) as any));

    await expectAsync(service.loadZip(mockZipFile)).toBeRejected();
    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
    expect(idbServiceSpy.updateFile).not.toHaveBeenCalled();
  });

  it('loadZip — média homonyme au contenu différent déjà enregistré → jamais remplacé, nouvelle clé (régression)', async () => {
    const existing = new Blob(['photo-de-l-autre-evaluation']);
    const imported = new Blob(['photo-importee']);
    idbServiceSpy.addFile.and.callFake((id: string) =>
      id === 'Test/chat.png' ? Promise.reject(new Error('existe')) : Promise.resolve());
    idbServiceSpy.getFile.and.callFake((id: string) => id === 'Test/chat.png'
      ? Promise.resolve({ id, file: existing, type: 'image', lastEdit: new Date(), refCount: 1 } as any)
      : Promise.reject(new Error('introuvable')));

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'Test/evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'Test' }) },
      'Test/evalData.json': { content: JSON.stringify([{
        Type: stimuliScreenConstModel, Name: 'S',
        'Liste des stimuli': { 0: { imageName: 'chat.png', soundName: '', goodAnswer: true } }
      }, {
        Type: instructionScreenConstModel, Name: 'I', 'Type de media': 'Image', 'Nom du fichier': 'chat.png'
      }]) },
      'Test/images/chat.png': { content: imported }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.updateFile).not.toHaveBeenCalled();
    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('Test/chat-1.png', imported, 'image');
    const screens = saveServiceSpy.saveDataAuto.calls.mostRecent().args[6] as any[];
    expect(screens[0].values[12][0].imageId).toBe('Test/chat-1.png');
    expect(screens[0].values[12][0].imageName).toBe('chat.png');
    expect(screens[1].values[8]).toBe('Test/chat-1.png');
    expect(screens[1].values[4]).toBe('chat.png');
  });

  it('loadZip — média homonyme au contenu identique → réutilisé sans doublon ni réécriture', async () => {
    idbServiceSpy.addFile.and.returnValue(Promise.reject(new Error('existe')));
    idbServiceSpy.getFile.and.callFake((id: string) =>
      Promise.resolve({ id, file: new Blob(['meme-contenu']), type: 'image', lastEdit: new Date(), refCount: 1 } as any));

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'Test' }) },
      'evalData.json': { content: JSON.stringify([{
        Type: stimuliScreenConstModel, 'Liste des stimuli': { 0: { imageName: 'chat.png' } }
      }]) },
      'Test/images/chat.png': { content: new Blob(['meme-contenu']) }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.addFile).toHaveBeenCalledTimes(1);
    expect(idbServiceSpy.updateFile).not.toHaveBeenCalled();
    const screens = saveServiceSpy.saveDataAuto.calls.mostRecent().args[6] as any[];
    expect(screens[0].values[12][0].imageId).toBe('Test/chat.png');
  });

  it('loadZip — evalInfo sans format ni champs participant → valeurs par défaut', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'Incomplete' }) },
      'evalData.json': { content: '[]' }
    }) as any));

    await service.loadZip(mockZipFile);

    const args = saveServiceSpy.saveDataAuto.calls.mostRecent().args;
    expect(args[1]).toBe('Csv&Xlsx');
    expect(args[2]).toEqual([]);
  });

  it('loadZip — case de stimuli nulle dans un fichier abîmé → import sans plantage', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: '{}' },
      'evalData.json': { content: JSON.stringify([{ Type: stimuliScreenConstModel, 'Liste des stimuli': { 0: null } }]) }
    }) as any));

    await expectAsync(service.loadZip(mockZipFile)).toBeResolved();
  });

  it('loadZip — globalParams absents → utilise les valeurs de dataAuto', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify({ "Nom de l'évaluation": 'EvalDefault' }) },
      'evalData.json': { content: '[]' }
    }) as any));

    await service.loadZip(mockZipFile);

    const args = saveServiceSpy.saveDataAuto.calls.mostRecent().args;
    expect(args[3]).toEqual(['default-transition'] as any);
    expect(args[4]).toEqual(['default-instruction'] as any);
    expect(args[5]).toEqual(['default-stimuli'] as any);
  });

  it('loadZip — fichier avec préfixe ._ → ignoré (addFile non appelé)', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: '{}' },
      'evalData.json': { content: '[]' },
      'EvalTest/images/._photo.png': { content: new Blob(['hidden']) }
    }) as any));

    await service.loadZip(mockZipFile);

    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
  });

  it('loadZip — item sans champ "name" → utilise le nom de fallback', async () => {
    const evalInfo = { "Nom de l'évaluation": 'FallbackEval' };
    const evalData = [{
      Type: transitionScreenConstModel,
      // pas de champ 'name'
      "Mettre un temps avant passage à l'écran suivant": false,
      "Combien de temps": 0,
      "Mettre une croix de fixation": false,
      "Mettre un temps de fixation": false,
      "Combien de temps de fixation": 0
    }];

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: JSON.stringify(evalData) }
    }) as any));

    await service.loadZip(mockZipFile);

    const listScreens = saveServiceSpy.saveDataAuto.calls.mostRecent().args[6];
    expect(listScreens[0].name).toBe('Ecran 1');
  });

  it('loadZip — instruction sans "Lien du fichier" ni "Nom du fichier" → idbId vide', async () => {
    const evalInfo = { "Nom de l'évaluation": 'EvalEmpty' };
    const evalData = [{
      Type: instructionScreenConstModel,
      "Mettre un temps avant passage à l'écran suivant": false,
      "Combien de temps": 1,
      "Ajouter un media": false,
      "Type de media": 'Texte',
      "Combien de temps de fixation": 1
    }];

    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: JSON.stringify(evalInfo) },
      'evalData.json': { content: JSON.stringify(evalData) }
    }) as any));

    await service.loadZip(mockZipFile);

    const screen = saveServiceSpy.saveDataAuto.calls.mostRecent().args[6][0];
    expect(screen.values[8]).toBe('');
  });

  it('loadZip — loadZipToSlot → appelle loadZip puis saveToSlot avec le bon index', async () => {
    spyOn(JSZip, 'loadAsync').and.returnValue(Promise.resolve(createMockZip({
      'evalInfo.json': { content: '{}' },
      'evalData.json': { content: '[]' }
    }) as any));

    await service.loadZipToSlot(mockZipFile, 2);

    expect(saveServiceSpy.saveDataAuto).toHaveBeenCalled();
    expect(saveServiceSpy.saveToSlot).toHaveBeenCalledWith(2, saveServiceSpy.dataAuto);
  });
});
