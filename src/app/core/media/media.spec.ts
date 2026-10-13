import {TestBed} from '@angular/core/testing';
import {collectMediaReferences, emptyReferences, fileNameFromId, isReferenced} from './media-references';
import {MediaCleanupService} from './media-cleanup.service';
import {MediaLibraryService} from './media-library.service';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {LoadService} from '../../services/load/load.service';
import {SaveService} from '../../services/save/save.service';
import {EvalFile} from '../../shared/eval-file.model';

function evaluation(nomEval: string, screens: any[]): any {
  return {nomEval, listScreens: screens};
}

const instruction = (name: string, id = '', type = 'Image') =>
  ({name: 'I', type: 'instruction', values: [false, 1, true, type, name, undefined, false, 1, id]});

const stimuli = (cells: Record<number, any>, soundName = '', soundId = '') =>
  ({name: 'S', type: 'stimuli', values: [1, 1, false, 10, 1, 'Tout', 1, false, false, !!soundName, soundName, undefined, cells, soundId]});

describe('media-references', () => {
  it('fileNameFromId → dernier segment, File ou vide', () => {
    expect(fileNameFromId('Eval/sous/chat.png')).toBe('chat.png');
    expect(fileNameFromId(new File([''], 'a.png'))).toBe('a.png');
    expect(fileNameFromId(null)).toBe('');
  });

  it('collecte les identifiants et noms des instructions, sons et cases', () => {
    const refs = collectMediaReferences(evaluation('Eval', [
      instruction('consigne.mp4', 'Eval/consigne.mp4', 'Video'),
      stimuli({
        0: {imageName: 'chat.png', imageId: 'Eval/chat.png', soundName: 'miaou.mp3', soundId: ''},
        1: {imageName: '', soundName: ''},
      }, 'bip.mp3', 'Eval/bip.mp3'),
    ]));

    expect(refs.ids.has('Eval/consigne.mp4')).toBeTrue();
    expect(refs.ids.has('Eval/chat.png')).toBeTrue();
    expect(refs.ids.has('Eval/bip.mp3')).toBeTrue();
    // identifiant implicite déduit du nom (sauvegardes sans id)
    expect(refs.ids.has('Eval/miaou.mp3')).toBeTrue();
    expect(refs.fileNames.has('miaou.mp3')).toBeTrue();
  });

  it('une consigne de type Texte ne référence aucun média', () => {
    const refs = collectMediaReferences(evaluation('Eval', [instruction('Bonjour à tous', '', 'Texte')]));
    expect(refs.ids.size).toBe(0);
    expect(refs.fileNames.size).toBe(0);
  });

  it('robuste aux sauvegardes partielles ou corrompues', () => {
    const refs = emptyReferences();
    expect(() => {
      collectMediaReferences(null, refs);
      collectMediaReferences({nomEval: 'X', listScreens: 'pas une liste'}, refs);
      collectMediaReferences(evaluation('X', [null, {type: 'stimuli'}, {type: 'stimuli', values: [1, 1, , , , , , , , , , , {0: null}]}]), refs);
    }).not.toThrow();
  });

  it('isReferenced → par identifiant ou par nom de fichier seul', () => {
    const refs = emptyReferences();
    refs.ids.add('Eval/a.png');
    refs.fileNames.add('b.png');
    expect(isReferenced('Eval/a.png', refs)).toBeTrue();
    expect(isReferenced('Autre/b.png', refs)).toBeTrue();
    expect(isReferenced('Eval/c.png', refs)).toBeFalse();
  });
});

describe('MediaCleanupService', () => {
  let service: MediaCleanupService;
  let idbSpy: jasmine.SpyObj<IndexedDBService>;
  let slots: Record<number, any>;

  const file = (id: string): EvalFile => ({id, file: new Blob(['x']), type: 'image', lastEdit: new Date(), refCount: 1});

  beforeEach(() => {
    slots = {};
    idbSpy = jasmine.createSpyObj('IndexedDBService', ['getFilesByProject', 'getAllFiles', 'deleteFile']);
    idbSpy.deleteFile.and.returnValue(Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        {provide: IndexedDBService, useValue: idbSpy},
        {provide: LoadService, useValue: {getSlot: (i: number) => slots[i] ?? null}},
        {provide: SaveService, useValue: {dataAuto: evaluation('', [])}},
      ]
    });
    service = TestBed.inject(MediaCleanupService);
  });

  it('cleanupProject → ne supprime que les médias du projet qu\'aucune sauvegarde n\'utilise', async () => {
    slots[2] = evaluation('Eval', [stimuli({0: {imageName: 'garde.png', imageId: 'Eval/garde.png'}})]);
    idbSpy.getFilesByProject.and.returnValue(Promise.resolve([file('Eval/garde.png'), file('Eval/orphelin.png')]));

    const deleted = await service.cleanupProject('Eval');

    expect(deleted).toBe(1);
    expect(idbSpy.deleteFile).toHaveBeenCalledOnceWith('Eval/orphelin.png');
  });

  it('cleanupProject → protège les médias utilisés par l\'évaluation en cours (renommée)', async () => {
    TestBed.inject(SaveService).dataAuto = evaluation('NouveauNom', [instruction('photo.png', 'AncienNom/photo.png')]);
    idbSpy.getFilesByProject.and.returnValue(Promise.resolve([file('AncienNom/photo.png')]));

    expect(await service.cleanupProject('AncienNom')).toBe(0);
    expect(idbSpy.deleteFile).not.toHaveBeenCalled();
  });

  it('cleanupProject → protège un média retrouvable par simple nom de fichier', async () => {
    slots[1] = evaluation('Autre', [stimuli({0: {imageName: 'chat.png'}})]);
    idbSpy.getFilesByProject.and.returnValue(Promise.resolve([file('Eval/chat.png')]));

    expect(await service.cleanupProject('Eval')).toBe(0);
  });

  it('cleanupProject — nom vide → aucune opération', async () => {
    expect(await service.cleanupProject('')).toBe(0);
    expect(idbSpy.getFilesByProject).not.toHaveBeenCalled();
  });

  it('cleanupAll → supprime tous les médias orphelins, tous projets confondus', async () => {
    slots[0] = evaluation('A', [instruction('a.png', 'A/a.png')]);
    idbSpy.getAllFiles.and.returnValue(Promise.resolve([file('A/a.png'), file('B/b.png'), file('C/c.png')]));

    expect(await service.cleanupAll()).toBe(2);
    expect(idbSpy.deleteFile).toHaveBeenCalledWith('B/b.png');
    expect(idbSpy.deleteFile).toHaveBeenCalledWith('C/c.png');
  });
});

describe('MediaLibraryService', () => {
  let service: MediaLibraryService;
  let idbSpy: jasmine.SpyObj<IndexedDBService>;
  let references: ReturnType<typeof emptyReferences>;

  const entry = (id: string, type: EvalFile['type'], refCount = 1, blob: Blob = new File(['x'], 'f')): EvalFile =>
    ({id, file: blob, type, lastEdit: new Date(), refCount});

  beforeEach(() => {
    references = emptyReferences();
    idbSpy = jasmine.createSpyObj('IndexedDBService', ['addFile', 'incrementRef', 'getFile', 'getAllFiles', 'releaseFile', 'deleteFile', 'updateFile']);
    idbSpy.addFile.and.returnValue(Promise.resolve());
    idbSpy.incrementRef.and.returnValue(Promise.resolve());
    idbSpy.releaseFile.and.returnValue(Promise.resolve());
    idbSpy.deleteFile.and.returnValue(Promise.resolve());
    idbSpy.updateFile.and.returnValue(Promise.resolve());
    idbSpy.getFile.and.returnValue(Promise.reject(new Error('introuvable')));
    idbSpy.getAllFiles.and.returnValue(Promise.resolve([]));

    TestBed.configureTestingModule({
      providers: [
        {provide: IndexedDBService, useValue: idbSpy},
        {provide: SaveService, useValue: {getEvalName: () => 'Eval'}},
        {provide: MediaCleanupService, useValue: {collectAllReferences: () => references}},
      ]
    });
    service = TestBed.inject(MediaLibraryService);
  });

  it('store → nouveau fichier enregistré sous "<eval>/<nom>"', async () => {
    const f = new File(['x'], 'chat.png');
    expect(await service.store(f, 'image')).toBe('Eval/chat.png');
    expect(idbSpy.addFile).toHaveBeenCalledWith('Eval/chat.png', f, 'image');
  });

  it('store → fichier déjà présent → une référence de plus', async () => {
    idbSpy.addFile.and.returnValue(Promise.reject(new Error('existe')));
    await service.store(new File(['x'], 'chat.png'), 'image');
    expect(idbSpy.incrementRef).toHaveBeenCalledWith('Eval/chat.png');
  });

  it('storeAsNew → suffixe numérique jusqu\'à un identifiant libre', async () => {
    idbSpy.addFile.and.callFake((id: string) => id === 'Eval/a.png' || id === 'Eval/a-1.png'
      ? Promise.reject(new Error('existe')) : Promise.resolve());

    const result = await service.storeAsNew(new File(['x'], 'a.png'), 'image');

    expect(result).toEqual({fileName: 'a-2.png', id: 'Eval/a-2.png'});
  });

  it('candidateIds → tel quel, nom seul et préfixés par l\'évaluation', () => {
    expect(service.candidateIds('Autre/chat.png')).toEqual(['Autre/chat.png', 'chat.png', 'Eval/Autre/chat.png', 'Eval/chat.png']);
    expect(service.candidateIds(new File([''], 'son.mp3'))).toContain('Eval/son.mp3');
    expect(service.candidateIds({id: 'Eval/x.png'})).toContain('Eval/x.png');
    expect(service.candidateIds(null)).toEqual([]);
  });

  it('resolve → premier candidat du bon type ; un Blob est converti en File', async () => {
    idbSpy.getFile.and.callFake((id: string) => id === 'Eval/chat.png'
      ? Promise.resolve(entry(id, 'image', 1, new Blob(['img'], {type: 'image/png'})))
      : Promise.reject(new Error('introuvable')));

    const result = await service.resolve('chat.png', 'image');

    expect(result?.id).toBe('Eval/chat.png');
    expect(result?.file instanceof File).toBeTrue();
    expect(result?.file.name).toBe('chat.png');
  });

  it('resolve → type différent ignoré, puis repli par nom de fichier', async () => {
    idbSpy.getFile.and.returnValue(Promise.resolve(entry('Eval/chat.png', 'sound')));
    idbSpy.getAllFiles.and.returnValue(Promise.resolve([entry('Ancien/chat.png', 'image')]));

    expect((await service.resolve('Eval/chat.png', 'image'))?.id).toBe('Ancien/chat.png');
  });

  it('resolve → introuvable → undefined', async () => {
    expect(await service.resolve('absent.png', 'image')).toBeUndefined();
  });

  it('release → média partagé : décrémente seulement', async () => {
    idbSpy.getFile.and.returnValue(Promise.resolve(entry('Eval/a.png', 'image', 3)));
    expect(await service.release('Eval/a.png', 'image')).toBeTrue();
    expect(idbSpy.releaseFile).toHaveBeenCalledWith('Eval/a.png');
    expect(idbSpy.deleteFile).not.toHaveBeenCalled();
  });

  it('release → dernière référence et plus utilisé → supprimé', async () => {
    idbSpy.getFile.and.returnValue(Promise.resolve(entry('Eval/a.png', 'image', 1)));
    await service.release('Eval/a.png', 'image');
    expect(idbSpy.deleteFile).toHaveBeenCalledWith('Eval/a.png');
  });

  it('release → dernière référence mais encore utilisé (compteur sous-estimé, ex. import) → conservé', async () => {
    idbSpy.getFile.and.returnValue(Promise.resolve(entry('Eval/a.png', 'image', 1)));
    references.fileNames.add('a.png');

    await service.release('Eval/a.png', 'image');

    expect(idbSpy.deleteFile).not.toHaveBeenCalled();
    expect(idbSpy.releaseFile).not.toHaveBeenCalled();
  });

  it('release → n\'utilise jamais le repli par nom (ne touche pas un média d\'une autre évaluation)', async () => {
    idbSpy.getAllFiles.and.returnValue(Promise.resolve([entry('Autre/a.png', 'image')]));
    expect(await service.release('a.png', 'image')).toBeFalse();
    expect(idbSpy.getAllFiles).not.toHaveBeenCalled();
  });

  it('replaceContent → met à jour le contenu sans toucher au compteur', async () => {
    const f = new File(['v2'], 'a.png');
    await service.replaceContent('Eval/a.png', f, 'image');
    expect(idbSpy.updateFile).toHaveBeenCalledWith('Eval/a.png', f, 'image');
  });
});
