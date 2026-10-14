import { TestBed } from '@angular/core/testing';
import { DownloadService } from './download.service';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { IndexedDBService } from '../indexedDB/indexed-db.service';
import { saveModelDefault } from '../../shared/saveModel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTransitionScreen(): any {
  return { name: 'T', type: 'transition', values: [true, 5, false, false, 0] };
}

function makeInstructionScreen(typeFile = 'Texte', fileName = '', fileBlob?: Blob, fileId = ''): any {
  return {
    name: 'I', type: 'instruction',
    values: [false, 1, true, typeFile, fileName, fileBlob, false, 1, fileId]
  };
}

function makeStimuliScreen(opts: {
  soundName?: string;
  soundBlob?: Blob;
  soundId?: string;
  stimuliList?: any;
} = {}): any {
  return {
    name: 'S', type: 'stimuli',
    values: [
      1, 1, false, 10, 1, 'Tout', 1, false, false, false,
      opts.soundName ?? '',
      opts.soundBlob  ?? undefined,
      opts.stimuliList ?? {
        0: { imageName: '', imageFile: undefined, soundName: '', soundFile: undefined,
             goodAnswer: false, imageId: '', soundId: '' }
      },
      opts.soundId ?? ''
    ]
  };
}

function makeSaveService(screens: any[] = []): any {
  return {
    dataAuto: { nomEval: 'TestEval', format: 'Csv&Xlsx', infoParticipant: ['Age'], listScreens: screens },
    getEvalName: () => 'TestEval'
  };
}

function makeIdbEntry(id: string, blob: Blob, type: 'image' | 'sound' | 'video'): any {
  return { id, file: blob, type, lastEdit: new Date() };
}

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('DownloadService', () => {
  let service: DownloadService;
  let idbSpy: jasmine.SpyObj<IndexedDBService>;
  let zipFileSpy: jasmine.Spy;

  beforeEach(() => {
    idbSpy = jasmine.createSpyObj('IndexedDBService', ['getFile', 'getAllFiles']);
    idbSpy.getFile.and.returnValue(Promise.reject(new Error('not found')));
    idbSpy.getAllFiles.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        DownloadService,
        { provide: IndexedDBService, useValue: idbSpy }
      ]
    });

    service = TestBed.inject(DownloadService);

    zipFileSpy = spyOn(JSZip.prototype, 'file').and.callThrough();
    spyOn(JSZip.prototype, 'generateAsync').and.returnValue(Promise.resolve(new Blob(['zip'])));
    spyOn(FileSaver, 'saveAs' as any).and.callFake(() => {});
  });

  // ─── Création ─────────────────────────────────────────────────────────────

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  // ─── isValidFile (méthode privée) ─────────────────────────────────────────

  it('isValidFile — File → true', () => {
    expect((service as any).isValidFile(new File([''], 'f.txt'))).toBeTrue();
  });

  it('isValidFile — Blob → true', () => {
    expect((service as any).isValidFile(new Blob(['data']))).toBeTrue();
  });

  it('isValidFile — string → false', () => {
    expect((service as any).isValidFile('string')).toBeFalse();
  });

  it('isValidFile — null → false', () => {
    expect((service as any).isValidFile(null)).toBeFalse();
  });

  it('isValidFile — undefined → false', () => {
    expect((service as any).isValidFile(undefined)).toBeFalse();
  });

  it('isValidFile — nombre → false', () => {
    expect((service as any).isValidFile(42)).toBeFalse();
  });

  // ─── getInfoEval ──────────────────────────────────────────────────────────

  it('getInfoEval → retourne nom, format et infos participant', () => {
    const result = service.getInfoEval(makeSaveService() as any);
    expect(result["Nom de l'évaluation"]).toBe('TestEval');
    expect(result["Format choisi"]).toBe('Csv&Xlsx');
    expect(result["Informations participant"]).toEqual(['Age']);
  });

  // ─── getInfoEvalFromSlot ──────────────────────────────────────────────────

  it('getInfoEvalFromSlot → retourne nom, format et infos participant depuis saveData', () => {
    const saveData = { ...saveModelDefault, nomEval: 'SlotEval', format: 'Csv' as any, infoParticipant: ['Nom'] };
    const result = service.getInfoEvalFromSlot(saveData);
    expect(result["Nom de l'évaluation"]).toBe('SlotEval');
    expect(result["Format choisi"]).toBe('Csv');
    expect(result["Informations participant"]).toEqual(['Nom']);
  });

  // ─── globalParams dans evalInfo (anti-régression import) ──────────────────

  it('getInfoEval → n’inclut PAS les paramètres globaux (réservés au .gpSave)', () => {
    const ss: any = {
      getEvalName: () => 'TestEval',
      dataAuto: {
        format: 'Csv&Xlsx',
        infoParticipant: [],
        globalParamsTransitionScreen: [true, 10, false, true, 3],
        globalParamsInstructionScreen: [true, 8, true, 'Video', false, 2],
        globalParamsStimuliScreen: [2, 3, true, 12, 1, 'Un', 4, true]
      }
    };
    const info: any = service.getInfoEval(ss);

    // Le ZIP d'export final ne doit contenir que les métadonnées d'évaluation.
    expect(Object.keys(info)).toEqual([
      "Nom de l'évaluation",
      "Format choisi",
      "Informations participant"
    ]);
    expect(info.globalParamsTransitionScreen).toBeUndefined();
    expect(info.globalParamsInstructionScreen).toBeUndefined();
    expect(info.globalParamsStimuliScreen).toBeUndefined();
  });

  it('generateEvalZip → evalInfo.json du .zip ne contient aucun paramètre global', async () => {
    const ss: any = {
      getEvalName: () => 'TestEval',
      dataAuto: {
        format: 'Csv&Xlsx',
        infoParticipant: [],
        globalParamsTransitionScreen: [true, 10, false, true, 3],
        globalParamsInstructionScreen: [true, 8, true, 'Video', false, 2],
        globalParamsStimuliScreen: [2, 3, true, 12, 1, 'Un', 4, true],
        listScreens: []
      }
    };

    await service.generateEvalZip(ss);

    const call = zipFileSpy.calls.all().find(c => String(c.args[0]).endsWith('evalInfo.json'));
    expect(call).toBeDefined();
    expect(call!.args[1] as string).not.toContain('globalParams');
  });

  it('getInfoEvalFromSlot → inclut les paramètres globaux de la sauvegarde', () => {
    const saveData = {
      ...saveModelDefault,
      nomEval: 'SlotEval',
      globalParamsTransitionScreen: [false, 4, true, false, 0]
    };
    const info: any = service.getInfoEvalFromSlot(saveData as any);

    expect(info.globalParamsTransitionScreen).toEqual({
      "Mettre un temps avant passage à l'écran suivant": false,
      "Combien de temps": 4,
      "Mettre une croix de fixation": true,
      "Mettre un temps de fixation": false,
      "Combien de temps de fixation": 0
    });
  });

  it('getInfoEvalFromSlot → tableaux globaux vides → remplis par les valeurs par défaut (non {})', () => {
    const saveData = {
      ...saveModelDefault,
      nomEval: 'SlotEval',
      globalParamsTransitionScreen: [],
      globalParamsInstructionScreen: [],
      globalParamsStimuliScreen: []
    };
    const info: any = service.getInfoEvalFromSlot(saveData as any);

    // Sans le repli sur saveModelDefault, JSON.stringify supprimait les champs undefined
    // et le .gpSave enregistrait des objets vides {} — paramètres globaux perdus.
    expect(info.globalParamsTransitionScreen).toEqual({
      "Mettre un temps avant passage à l'écran suivant": true,
      "Combien de temps": 10,
      "Mettre une croix de fixation": false,
      "Mettre un temps de fixation": false,
      "Combien de temps de fixation": 0
    });
    expect(info.globalParamsInstructionScreen["Type de media"]).toBe('Image');
    expect(info.globalParamsStimuliScreen["Nombre de lignes"]).toBe(1);
    expect(info.globalParamsStimuliScreen["Combien de temps"]).toBe(10);

    // Anti-régression : le JSON sérialisé ne doit plus contenir d'objet global vide.
    const json = JSON.stringify(info);
    expect(json).not.toContain('"globalParamsTransitionScreen":{}');
    expect(json).not.toContain('"globalParamsInstructionScreen":{}');
    expect(json).not.toContain('"globalParamsStimuliScreen":{}');
  });

  it('getInfoEvalFromSlot → conserve les valeurs légitimes false/0 (pas de repli abusif)', () => {
    const saveData = {
      ...saveModelDefault,
      globalParamsStimuliScreen: [0, 0, false, 0, 0, 0, false, false]
    };
    const info: any = service.getInfoEvalFromSlot(saveData as any);

    expect(info.globalParamsStimuliScreen["Nombre de lignes"]).toBe(0);
    expect(info.globalParamsStimuliScreen["Mettre un temps avant passage à l'écran suivant"]).toBe(false);
    expect(info.globalParamsStimuliScreen["Combien de temps"]).toBe(0);
  });

  // ─── Export-healing : aucun null/undefined dans l'export ───────────────────

  it('withDefaultValues → remplace null/undefined par les valeurs par défaut du modèle', () => {
    const polluted: any = { name: 'T', type: 'transition', values: [true, 3, false, undefined, null] };

    const healed = (service as any).withDefaultValues(polluted);

    expect(healed.values).toEqual([true, 3, false, false, 0]);
    expect(healed.values.some((v: any) => v === undefined || v === null)).toBeFalse();
    expect(polluted.values[3]).toBeUndefined(); // n'altère pas l'original
  });

  it('generateEvalZip → evalData.json sans null même depuis un modèle pollué', async () => {
    const polluted: any = { name: 'T', type: 'transition', values: [true, 3, false, undefined, null] };

    await service.generateEvalZip(makeSaveService([polluted]));

    const call = zipFileSpy.calls.all().find(c => String(c.args[0]).endsWith('evalData.json'));
    expect(call).toBeDefined();
    const json = call!.args[1] as string;
    expect(json).not.toContain('null');

    const parsed = JSON.parse(json);
    expect(parsed[0]["Mettre un temps de fixation"]).toBe(false);
    expect(parsed[0]["Combien de temps de fixation"]).toBe(0);
  });

  // ─── generateTransitionScreen ────────────────────────────────────────────

  it('generateTransitionScreen → pousse une entrée JSON avec Type=transition et les bonnes clés', () => {
    const jsonData: any[] = [];
    service.generateTransitionScreen(makeTransitionScreen(), jsonData);

    expect(jsonData.length).toBe(1);
    expect(jsonData[0].Type).toBe('transition');
    expect(jsonData[0]["Mettre un temps avant passage à l'écran suivant"]).toBeTrue();
    expect(jsonData[0]["Combien de temps"]).toBe(5);
  });

  it('generateTransitionScreen → ne modifie pas le tableau original', () => {
    const screen = makeTransitionScreen();
    const originalValues = [...screen.values];
    service.generateTransitionScreen(screen, []);
    expect(screen.values).toEqual(originalValues);
  });

  // ─── generateInstructionScreenText ───────────────────────────────────────

  it('generateInstructionScreenText → pousse JSON avec Type=instruction sans fichier zip', () => {
    const jsonData: any[] = [];
    service.generateInstructionScreenText(makeInstructionScreen('Texte'), jsonData);

    expect(jsonData.length).toBe(1);
    expect(jsonData[0].Type).toBe('instruction');
    expect(zipFileSpy).not.toHaveBeenCalled();
  });

  // ─── generateInstructionScreenMedia ──────────────────────────────────────

  it('generateInstructionScreenMedia — image en mémoire → zip.file pour images/ et JSON poussé', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Image', 'photo.png', blob);

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
    expect(jsonData[0].Type).toBe('instruction');
    expect(idbSpy.getFile).not.toHaveBeenCalled();
  });

  it('generateInstructionScreenMedia — image sans blob mais IDB → getFile + zip.file', async () => {
    const idbBlob = new Blob(['img'], { type: 'image/png' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/photo.png', idbBlob, 'image')));
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Image', 'photo.png', undefined, 'TestEval/photo.png');

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip);

    expect(idbSpy.getFile).toHaveBeenCalledWith('TestEval/photo.png');
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
  });

  it('generateInstructionScreenMedia — aucun fichier → zip.file non appelé pour images/, JSON toujours poussé', async () => {
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Image', '');

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).not.toHaveBeenCalledWith(jasmine.stringMatching(/images/), jasmine.anything());
    expect(jsonData.length).toBe(1);
  });

  it('generateInstructionScreenMedia — zip=false ajoute le nom de l’écran au JSON', async () => {
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Texte', 'Bonjour');

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip, false);

    expect(jsonData[0].Name).toBe('I');
  });

  it('generateInstructionScreenMedia — video en mémoire → zip.file pour videos/ et JSON poussé', async () => {
    const blob = new Blob(['vid'], { type: 'video/mp4' });
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Video', 'video.mp4', blob);

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/videos/video.mp4', jasmine.anything());
    expect(jsonData[0].Type).toBe('instruction');
    expect(idbSpy.getFile).not.toHaveBeenCalled();
  });

  it('generateInstructionScreenMedia — video sans blob mais IDB → getFile + zip.file', async () => {
    const idbBlob = new Blob(['vid'], { type: 'video/mp4' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/video.mp4', idbBlob, 'video')));
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Video', 'video.mp4', undefined, 'TestEval/video.mp4');

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip);

    expect(idbSpy.getFile).toHaveBeenCalled();
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/videos/video.mp4', jasmine.anything());
  });

  it('generateInstructionScreenMedia — aucun fichier → pas de zip.file pour videos/', async () => {
    const jsonData: any[] = [];
    const zip = new JSZip();
    const screen = makeInstructionScreen('Video', '');

    await service.generateInstructionScreenMedia(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).not.toHaveBeenCalledWith(jasmine.stringMatching(/videos/), jasmine.anything());
    expect(jsonData.length).toBe(1);
  });

  // ─── generateStimuliScreen ───────────────────────────────────────────────

  it('generateStimuliScreen — image en mémoire → zip.file pour images/ et JSON poussé', async () => {
    const imgBlob = new Blob(['img'], { type: 'image/png' });
    const screen = makeStimuliScreen({
      stimuliList: { 0: { imageName: 'photo.png', imageFile: imgBlob, soundName: '', soundFile: undefined,
                          goodAnswer: true, imageId: '', soundId: '' } }
    });
    const jsonData: any[] = [];
    const zip = new JSZip();

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
    expect(jsonData[0].Type).toBe('stimuli');
    expect(idbSpy.getFile).not.toHaveBeenCalled();
  });

  it('generateStimuliScreen — son de cellule en mémoire → zip.file pour audio/', async () => {
    const sndBlob = new Blob(['snd'], { type: 'audio/mp3' });
    const screen = makeStimuliScreen({
      stimuliList: { 0: { imageName: '', imageFile: undefined, soundName: 'son.mp3', soundFile: sndBlob,
                          goodAnswer: false, imageId: '', soundId: '' } }
    });
    const jsonData: any[] = [];
    const zip = new JSZip();

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/son.mp3', jasmine.anything());
  });

  it('generateStimuliScreen — son global en mémoire → zip.file pour audio/', async () => {
    const sndBlob = new Blob(['snd'], { type: 'audio/mp3' });
    const screen = makeStimuliScreen({ soundName: 'global.mp3', soundBlob: sndBlob });
    const jsonData: any[] = [];
    const zip = new JSZip();

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', zip);

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/global.mp3', jasmine.anything());
  });

  it('generateStimuliScreen — image depuis IDB → getFile + zip.file pour images/', async () => {
    const idbBlob = new Blob(['img'], { type: 'image/png' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/photo.png', idbBlob, 'image')));
    const screen = makeStimuliScreen({
      stimuliList: { 0: { imageName: 'photo.png', imageFile: undefined, soundName: '', soundFile: undefined,
                          goodAnswer: false, imageId: 'TestEval/photo.png', soundId: '' } }
    });
    const jsonData: any[] = [];

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', new JSZip());

    expect(idbSpy.getFile).toHaveBeenCalled();
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
  });

  it('generateStimuliScreen — son global depuis IDB → getFile + zip.file pour audio/', async () => {
    const idbBlob = new Blob(['snd'], { type: 'audio/mp3' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/global.mp3', idbBlob, 'sound')));
    const screen = makeStimuliScreen({ soundName: 'global.mp3', soundId: 'TestEval/global.mp3' });
    const jsonData: any[] = [];

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', new JSZip());

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/global.mp3', jasmine.anything());
  });

  it('generateStimuliScreen — cellule vide → aucun zip.file pour images/ ou audio/ de cellule', async () => {
    const screen = makeStimuliScreen();  // imageName et soundName vides
    const jsonData: any[] = [];

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', new JSZip());

    const calls = zipFileSpy.calls.allArgs().map(a => a[0] as string);
    expect(calls.some(p => p.includes('images/'))).toBeFalse();
    expect(jsonData.length).toBe(1);
  });

  it('generateStimuliScreen — zip=false ajoute le nom de l’écran au JSON', async () => {
    const screen = makeStimuliScreen({
      stimuliList: { 0: { imageName: '', imageFile: undefined, soundName: '', soundFile: undefined,
                          goodAnswer: false, imageId: '', soundId: '' } }
    });
    const jsonData: any[] = [];

    await service.generateStimuliScreen(screen, jsonData, 'TestEval', new JSZip(), false);

    expect(jsonData[0].Name).toBe('S');
  });

  // ─── generateInstructionScreenSlot ────────────────────────────────────────

  it('generateInstructionScreenSlot — type Image depuis IDB → zip.file pour images/', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/photo.png', blob, 'image')));
    const screen = makeInstructionScreen('Image', 'photo.png', undefined, 'TestEval/photo.png');
    const jsonData: any[] = [];

    await service.generateInstructionScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
    expect(jsonData[0].Type).toBe('instruction');
  });

  it('generateInstructionScreenSlot — type Video depuis IDB → zip.file pour videos/', async () => {
    const blob = new Blob(['vid'], { type: 'video/mp4' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/video.mp4', blob, 'video')));
    const screen = makeInstructionScreen('Video', 'video.mp4', undefined, 'TestEval/video.mp4');
    const jsonData: any[] = [];

    await service.generateInstructionScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/videos/video.mp4', jasmine.anything());
  });

  it('generateInstructionScreenSlot — type Son depuis IDB → zip.file pour audio/', async () => {
    const blob = new Blob(['snd'], { type: 'audio/mp3' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/son.mp3', blob, 'sound')));
    const screen = makeInstructionScreen('Son', 'son.mp3', undefined, 'TestEval/son.mp3');
    const jsonData: any[] = [];

    await service.generateInstructionScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/son.mp3', jasmine.anything());
  });

  it('generateInstructionScreenSlot — type Texte → getFile non appelé, JSON poussé', async () => {
    const screen = makeInstructionScreen('Texte', 'Bonjour');
    const jsonData: any[] = [];

    await service.generateInstructionScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(idbSpy.getFile).not.toHaveBeenCalled();
    expect(jsonData[0].Type).toBe('instruction');
  });

  it('generateInstructionScreenSlot — nom de fichier vide → getFile non appelé', async () => {
    const screen = makeInstructionScreen('Image', '');
    const jsonData: any[] = [];

    await service.generateInstructionScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(idbSpy.getFile).not.toHaveBeenCalled();
  });

  // ─── generateStimuliScreenSlot ───────────────────────────────────────────

  it('generateStimuliScreenSlot — image depuis IDB → zip.file pour images/ et JSON poussé', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/photo.png', blob, 'image')));
    const screen = makeStimuliScreen({
      stimuliList: { 0: { imageName: 'photo.png', imageFile: undefined, soundName: '', soundFile: undefined,
                          goodAnswer: false, imageId: 'TestEval/photo.png', soundId: '' } }
    });
    const jsonData: any[] = [];

    await service.generateStimuliScreenSlot(screen, jsonData, 'TestEval', new JSZip(), false);

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
    expect(jsonData[0].Type).toBe('stimuli');
    expect(jsonData[0].Name).toBe('S');
  });

  it('generateStimuliScreenSlot — son de cellule en mémoire → zip.file pour audio/', async () => {
    const sndBlob = new Blob(['snd'], { type: 'audio/mp3' });
    const screen = makeStimuliScreen({
      stimuliList: { 0: { imageName: '', imageFile: undefined, soundName: 'son.mp3', soundFile: sndBlob,
                          goodAnswer: false, imageId: '', soundId: '' } }
    });
    const jsonData: any[] = [];

    await service.generateStimuliScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/son.mp3', jasmine.anything());
  });

  it('generateStimuliScreenSlot — son global depuis IDB → zip.file pour audio/', async () => {
    const sndBlob = new Blob(['snd'], { type: 'audio/mp3' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('TestEval/global.mp3', sndBlob, 'sound')));
    const screen = makeStimuliScreen({ soundName: 'global.mp3', soundId: 'TestEval/global.mp3' });
    const jsonData: any[] = [];

    await service.generateStimuliScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/global.mp3', jasmine.anything());
  });

  it('generateStimuliScreenSlot — cellule vide → JSON poussé sans fichier media', async () => {
    const screen = makeStimuliScreen();
    const jsonData: any[] = [];

    await service.generateStimuliScreenSlot(screen, jsonData, 'TestEval', new JSZip());

    expect(jsonData[0].Type).toBe('stimuli');
    const calls = zipFileSpy.calls.allArgs().map(a => a[0] as string);
    expect(calls.some(p => p.includes('images/') || p.includes('audio/'))).toBeFalse();
  });

  // ─── generateEvalZip ──────────────────────────────────────────────────────

  it('generateEvalZip — liste vide → evalData.json + evalInfo.json + saveAs .zip', async () => {
    await service.generateEvalZip(makeSaveService([]) as any);
    await Promise.resolve();

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/evalData.json', jasmine.any(String));
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/evalInfo.json', jasmine.any(String));
    expect(JSZip.prototype.generateAsync).toHaveBeenCalled();
    expect(FileSaver.saveAs).toHaveBeenCalledWith(jasmine.any(Blob), 'TestEval-gazeplayEval.zip');
  });

  it('generateEvalZip — écran transition → generateTransitionScreen appelé', async () => {
    spyOn(service, 'generateTransitionScreen').and.callThrough();
    await service.generateEvalZip(makeSaveService([makeTransitionScreen()]) as any);
    await Promise.resolve();
    expect(service.generateTransitionScreen).toHaveBeenCalled();
  });

  it('generateEvalZip — instruction Texte → generateInstructionScreenText appelé', async () => {
    spyOn(service, 'generateInstructionScreenText').and.callThrough();
    await service.generateEvalZip(makeSaveService([makeInstructionScreen('Texte', 'Hello')]) as any);
    await Promise.resolve();
    expect(service.generateInstructionScreenText).toHaveBeenCalled();
  });

  it('generateEvalZip — instruction Image avec blob → zip.file pour images/', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    const ss = makeSaveService([makeInstructionScreen('Image', 'photo.png', blob)]);
    await service.generateEvalZip(ss as any);
    await Promise.resolve();
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/images/photo.png', jasmine.anything());
  });

  it('generateEvalZip — instruction Video avec blob → zip.file pour videos/', async () => {
    const blob = new Blob(['vid'], { type: 'video/mp4' });
    const ss = makeSaveService([makeInstructionScreen('Video', 'video.mp4', blob)]);
    await service.generateEvalZip(ss as any);
    await Promise.resolve();
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/videos/video.mp4', jasmine.anything());
  });

  it('generateEvalZip — instruction Son avec blob → zip.file pour audio/', async () => {
    const blob = new Blob(['snd'], { type: 'audio/mp3' });
    const ss = makeSaveService([makeInstructionScreen('Son', 'son.mp3', blob)]);
    await service.generateEvalZip(ss as any);
    await Promise.resolve();
    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/audio/son.mp3', jasmine.anything());
  });

  it('generateEvalZip — écran stimuli → generateStimuliScreen appelé', async () => {
    spyOn(service, 'generateStimuliScreen').and.callThrough();
    await service.generateEvalZip(makeSaveService([makeStimuliScreen()]) as any);
    await Promise.resolve();
    expect(service.generateStimuliScreen).toHaveBeenCalled();
  });

  it('generateEvalZip — plusieurs types d\'écrans → tous traités et zip généré', async () => {
    const imgBlob = new Blob(['img'], { type: 'image/png' });
    const ss = makeSaveService([
      makeTransitionScreen(),
      makeInstructionScreen('Texte', 'Bonjour'),
      makeInstructionScreen('Image', 'img.png', imgBlob),
      makeStimuliScreen()
    ]);
    await service.generateEvalZip(ss as any);
    await Promise.resolve();

    expect(zipFileSpy).toHaveBeenCalledWith('TestEval/evalData.json', jasmine.any(String));
    expect(FileSaver.saveAs).toHaveBeenCalledWith(jasmine.any(Blob), 'TestEval-gazeplayEval.zip');
  });

  // ─── generateSlotZip ──────────────────────────────────────────────────────

  it('generateSlotZip — liste vide → saveAs avec .gpSave', async () => {
    const saveData = { ...saveModelDefault, nomEval: 'SlotEval', listScreens: [] };
    await service.generateSlotZip(saveData);
    expect(FileSaver.saveAs).toHaveBeenCalledWith(jasmine.any(Blob), 'SlotEval-gazeplayEval.gpSave');
  });

  it('generateSlotZip — nomEval vide → utilise GazePlayEvalDefaultName', async () => {
    const saveData = { ...saveModelDefault, nomEval: '', listScreens: [] };
    await service.generateSlotZip(saveData);
    expect(FileSaver.saveAs).toHaveBeenCalledWith(jasmine.any(Blob), 'GazePlayEvalDefaultName-gazeplayEval.gpSave');
  });

  it('generateSlotZip — transition + instruction + stimuli → evalData.json et evalInfo.json générés', async () => {
    const saveData = {
      ...saveModelDefault,
      nomEval: 'Full',
      listScreens: [
        makeTransitionScreen(),
        makeInstructionScreen('Texte', 'Hello'),
        makeStimuliScreen()
      ]
    };
    await service.generateSlotZip(saveData);
    expect(zipFileSpy).toHaveBeenCalledWith('Full/evalData.json', jasmine.any(String));
    expect(zipFileSpy).toHaveBeenCalledWith('Full/evalInfo.json', jasmine.any(String));
  });

  it('generateSlotZip — instruction Image depuis IDB → zip.file pour images/', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    idbSpy.getFile.and.returnValue(Promise.resolve(makeIdbEntry('Full/img.png', blob, 'image')));
    const saveData = {
      ...saveModelDefault,
      nomEval: 'Full',
      listScreens: [makeInstructionScreen('Image', 'img.png', undefined, 'Full/img.png')]
    };
    await service.generateSlotZip(saveData);
    expect(zipFileSpy).toHaveBeenCalledWith('Full/images/img.png', jasmine.anything());
  });
});
