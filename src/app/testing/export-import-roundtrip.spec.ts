import {TestBed} from '@angular/core/testing';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import {DownloadService} from '../services/download/download.service';
import {LoadZipService} from '../services/load-zip/load-zip.service';
import {SaveService} from '../services/save/save.service';
import {IndexedDBService} from '../services/indexedDB/indexed-db.service';
import {SHARED_STORAGE, TAB_LOCKS, TAB_STORAGE} from '../core/tab/tab-session.service';
import {MemoryStorage} from '../core/tab/testing/fake-tabs.spec';
import {saveModel} from '../shared/saveModel';

/**
 * Aller-retour réel export → import : vraie archive JSZip, vraie base IndexedDB du navigateur
 * de test (identifiants préfixés par un nom d'évaluation unique, supprimés à la fin), stockage
 * des onglets en mémoire. Seul l'enregistrement du fichier sur le disque est intercepté.
 */
describe('Aller-retour export / import', () => {
  let download: DownloadService;
  let loadZip: LoadZipService;
  let save: SaveService;
  let idb: IndexedDBService;
  let archive: Blob | null;
  let archiveName: string;
  const evalName = `AllerRetour-${Date.now()}`;

  const bytes = (text: string) => new Blob([text], {type: 'application/octet-stream'});
  const media: Record<string, {blob: Blob, type: 'image' | 'sound' | 'video'}> = {
    'consigne.png': {blob: bytes('png-consigne'), type: 'image'},
    'chat.png': {blob: bytes('png-chat'), type: 'image'},
    'chien.png': {blob: bytes('png-chien'), type: 'image'},
    'miaou.mp3': {blob: bytes('mp3-miaou'), type: 'sound'},
    'ecran.mp3': {blob: bytes('mp3-ecran'), type: 'sound'},
  };
  const id = (file: string) => `${evalName}/${file}`;

  function evaluation(): saveModel {
    return {
      nomEval: evalName,
      format: 'Xlsx',
      infoParticipant: ['Prénom', 'Classe', 'Âge'],
      globalParamsTransitionScreen: [true, 7, true, false, 0],
      globalParamsInstructionScreen: [false, 3, true, 'Video', true, 2.5],
      globalParamsStimuliScreen: [2, 3, true, 12, 1.5, 2, true, false],
      listScreens: [
        {name: 'Pause', type: 'transition', values: [true, 4.5, true, true, 1.2]},
        {name: 'Consigne image', type: 'instruction',
          values: [true, 6, true, 'Image', 'consigne.png', undefined, true, 1.5, id('consigne.png')]},
        {name: 'Consigne texte', type: 'instruction',
          values: [false, 1, true, 'Texte', 'Regarde le chat', undefined, false, 1, '']},
        {name: 'Grille', type: 'stimuli', values: [
          2, 2, true, 8, 1.2, 'BonneReponse', 1, true, true, true, 'ecran.mp3', undefined,
          {
            0: {imageName: 'chat.png', imageId: id('chat.png'), soundName: 'miaou.mp3', soundId: id('miaou.mp3'), goodAnswer: true, hidden: false},
            1: {imageName: 'chien.png', imageId: id('chien.png'), soundName: '', soundId: '', goodAnswer: false, hidden: false},
            2: {imageName: '', imageId: '', soundName: '', soundId: '', goodAnswer: false, hidden: true},
            3: {imageName: 'chat.png', imageId: id('chat.png'), soundName: '', soundId: '', goodAnswer: false, hidden: false},
          },
          id('ecran.mp3'),
        ]},
      ] as any,
      createdAt: new Date().toISOString(),
      step: 3,
      version: 1,
    };
  }

  async function removeTestMedia(): Promise<void> {
    for (const file of await idb.getFilesByProject(evalName)) {
      await idb.deleteFile(file.id);
    }
  }

  async function readEntry(zip: JSZip, path: string): Promise<string | null> {
    const entry = zip.file(path);
    return entry ? entry.async('string') : null;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        {provide: TAB_STORAGE, useValue: new MemoryStorage()},
        {provide: SHARED_STORAGE, useValue: new MemoryStorage()},
        {provide: TAB_LOCKS, useValue: null},
      ],
    });
    download = TestBed.inject(DownloadService);
    loadZip = TestBed.inject(LoadZipService);
    save = TestBed.inject(SaveService);
    idb = TestBed.inject(IndexedDBService);
    await removeTestMedia();
    for (const [file, {blob, type}] of Object.entries(media)) {
      await idb.addFile(id(file), blob, type);
    }
    archive = null;
    vi.spyOn(FileSaver as any, 'saveAs').mockImplementation((...args: unknown[]) => {
      archive = args[0] as Blob;
      archiveName = args[1] as string;
    });
  });

  afterEach(async () => {
    await removeTestMedia();
  });

  it('.gpSave → réimport : contenu, ordre, positions des cases, paramètres et médias préservés', async () => {
    const original = evaluation();
    expect(await download.generateSlotZip(original)).toBe(true);
    expect(archiveName).toBe(`${evalName}-gazeplayEval.gpSave`);

    // Comme sur un autre ordinateur : les médias ne sont plus dans le navigateur.
    await removeTestMedia();
    await loadZip.loadZip(new File([archive!], archiveName));

    const imported = save.dataAuto;
    expect(imported.nomEval).toBe(evalName);
    expect(imported.format).toBe('Xlsx');
    expect(imported.infoParticipant).toStrictEqual(['Prénom', 'Classe', 'Âge']);
    expect(imported.globalParamsTransitionScreen).toStrictEqual(original.globalParamsTransitionScreen);
    expect(imported.globalParamsInstructionScreen).toStrictEqual(original.globalParamsInstructionScreen);
    expect(imported.globalParamsStimuliScreen).toStrictEqual(original.globalParamsStimuliScreen);

    expect(imported.listScreens.map(s => [s.name, s.type])).toStrictEqual(original.listScreens.map(s => [s.name, s.type]));
    original.listScreens.forEach((screen, index) => {
      const values = imported.listScreens[index].values;
      screen.values.forEach((value, i) => {
        const isFileOrCells = (screen.type === 'instruction' && i === 5) || (screen.type === 'stimuli' && (i === 11 || i === 12));
        if (!isFileOrCells) expect(values[i], `${screen.name} values[${i}]`).toStrictEqual(value);
      });
    });

    const cells = imported.listScreens[3].values[12];
    const originalCells = original.listScreens[3].values[12];
    for (const key of Object.keys(originalCells)) {
      for (const field of ['imageName', 'soundName', 'goodAnswer', 'hidden']) {
        expect(cells[key][field], `case ${key}.${field}`).toStrictEqual(originalCells[key][field]);
      }
    }

    // Médias restaurés depuis l'archive, au contenu identique, sous les identifiants référencés.
    for (const [file, {blob, type}] of Object.entries(media)) {
      const stored = await idb.getFile(id(file));
      expect(stored.type, file).toBe(type);
      expect(await stored.file.text(), file).toBe(await blob.text());
    }
    expect(cells[0].imageId).toBe(id('chat.png'));
    expect(cells[0].soundId).toBe(id('miaou.mp3'));
    expect(imported.listScreens[1].values[8]).toBe(id('consigne.png'));
    expect(imported.listScreens[3].values[13]).toBe(id('ecran.mp3'));
  });

  it('.zip GazePlay-Learning : structure attendue, sans données internes à l\'éditeur', async () => {
    save.loadIntoWorkspace(evaluation());
    await download.generateEvalZip(save);
    expect(archiveName).toBe(`${evalName}-gazeplayEval.zip`);

    const zip = await JSZip.loadAsync(archive!);
    const data = JSON.parse((await readEntry(zip, `${evalName}/evalData.json`))!);
    const info = JSON.parse((await readEntry(zip, `${evalName}/evalInfo.json`))!);

    expect(Object.keys(info).sort()).toStrictEqual(["Format choisi", "Informations participant", "Nom de l'évaluation"].sort());
    expect(data.map((s: any) => s.Type)).toStrictEqual(['transition', 'instruction', 'instruction', 'stimuli']);
    expect(data.some((s: any) => 'Name' in s)).toBe(false);
    const cells = data[3]['Liste des stimuli'];
    for (const cell of Object.values(cells) as any[]) {
      expect('hidden' in cell).toBe(false);
      expect('imageId' in cell || 'soundId' in cell).toBe(false);
    }
    for (const path of ['images/consigne.png', 'images/chat.png', 'images/chien.png', 'audio/miaou.mp3', 'audio/ecran.mp3']) {
      expect(zip.file(`${evalName}/${path}`), path).not.toBeNull();
    }
  });

  it('.zip GazePlay-Learning réimporté : écrans et médias relus (noms d\'écrans par défaut)', async () => {
    save.loadIntoWorkspace(evaluation());
    await download.generateEvalZip(save);
    await removeTestMedia();

    await loadZip.loadZip(new File([archive!], archiveName));

    expect(save.dataAuto.listScreens.map(s => s.type)).toStrictEqual(['transition', 'instruction', 'instruction', 'stimuli']);
    expect(save.dataAuto.listScreens[3].values[12][0].imageName).toBe('chat.png');
    expect(await (await idb.getFile(id('chat.png'))).file.text()).toBe('png-chat');
  });

  it('import d\'une évaluation homonyme aux médias différents : les médias existants restent intacts', async () => {
    expect(await download.generateSlotZip(evaluation())).toBe(true);
    const exported = archive!;
    // Une autre évaluation du même nom utilise déjà « chat.png » avec un autre contenu.
    await idb.updateFile(id('chat.png'), bytes('png-chat-autre-evaluation'), 'image');

    await loadZip.loadZip(new File([exported], archiveName));

    expect(await (await idb.getFile(id('chat.png'))).file.text()).toBe('png-chat-autre-evaluation');
    const importedCell = save.dataAuto.listScreens[3].values[12][0];
    expect(importedCell.imageName).toBe('chat.png');
    expect(importedCell.imageId).not.toBe(id('chat.png'));
    expect(await (await idb.getFile(importedCell.imageId)).file.text()).toBe('png-chat');
  });
});
