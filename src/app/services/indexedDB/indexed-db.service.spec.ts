import { TestBed } from '@angular/core/testing';
import { IndexedDBService } from './indexed-db.service';
import { closeAppDatabase } from '../../core/storage/app-database';

describe('IndexedDBService', () => {
  let service: IndexedDBService;

  /** Insère une entrée brute SANS refCount (simule des données écrites avant l'ajout du compteur). */
  async function putLegacy(id: string, type: 'image' | 'sound' | 'video' = 'image'): Promise<void> {
    const db = (service as any).db as IDBDatabase;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('evalFiles', 'readwrite');
      tx.objectStore('evalFiles').put({ id, file: new File([''], 'legacy'), type, lastEdit: new Date() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [IndexedDBService]
    });

    service = TestBed.inject(IndexedDBService);
    await service.dbReady;
  });

  afterEach(async () => {
    await service.deleteAll();
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('addFile → ajoute un fichier et getFile le retrouve', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');

    const result = await service.getFile('projet/test.png');

    expect(result.id).toBe('projet/test.png');
    expect(result.type).toBe('image');
    expect(result.file).toEqual(file);
  });

  it('addFile → initialise refCount à 1', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');

    const result = await service.getFile('projet/test.png');
    expect(result.refCount).toBe(1);
  });

  it('addFile → rejette si l\'id existe déjà', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');

    await expectAsync(
      service.addFile('projet/test.png', file, 'image')
    ).toBeRejectedWithError(`L'id "projet/test.png" existe déjà`);
  });

  it('getFile → rejette si le fichier est introuvable', async () => {
    await expectAsync(
      service.getFile('projet/inexistant.png')
    ).toBeRejectedWithError('Fichier "projet/inexistant.png" introuvable');
  });

  it('getAllFiles → retourne tous les fichiers', async () => {
    const file1 = new File(['a'], 'a.png', { type: 'image/png' });
    const file2 = new File(['b'], 'b.mp3', { type: 'audio/mpeg' });

    await service.addFile('projet/a.png', file1, 'image');
    await service.addFile('projet/b.mp3', file2, 'sound');

    const result = await service.getAllFiles();

    expect(result.length).toBe(2);
  });

  it('updateFile → met à jour un fichier existant', async () => {
    const file = new File(['v1'], 'test.png', { type: 'image/png' });
    const fileV2 = new File(['v2'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.updateFile('projet/test.png', fileV2, 'image');

    const result = await service.getFile('projet/test.png');

    expect(result.file).toEqual(fileV2);
  });

  it('updateFile → préserve le refCount existant', async () => {
    const file = new File(['v1'], 'test.png', { type: 'image/png' });
    const fileV2 = new File(['v2'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.incrementRef('projet/test.png'); // refCount = 2
    await service.updateFile('projet/test.png', fileV2, 'image');

    const result = await service.getFile('projet/test.png');
    expect(result.refCount).toBe(2);
  });

  it('updateFile → refCount à 1 si le fichier n\'existait pas', async () => {
    const file = new File(['v1'], 'test.png', { type: 'image/png' });

    await service.updateFile('projet/test.png', file, 'image');

    const result = await service.getFile('projet/test.png');
    expect(result.refCount).toBe(1);
  });

  // ─── incrementRef ───────────────────────────────────────────────────────────

  it('incrementRef → incrémente le refCount', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.incrementRef('projet/test.png');

    const result = await service.getFile('projet/test.png');
    expect(result.refCount).toBe(2);
  });

  it('incrementRef → plusieurs appels cumulent', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.incrementRef('projet/test.png');
    await service.incrementRef('projet/test.png');

    const result = await service.getFile('projet/test.png');
    expect(result.refCount).toBe(3);
  });

  it('incrementRef → rejette si le fichier est introuvable', async () => {
    await expectAsync(service.incrementRef('projet/inexistant.png')).toBeRejected();
  });

  // ─── releaseFile ────────────────────────────────────────────────────────────

  it('releaseFile → refCount > 1 : décrémente sans supprimer', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.incrementRef('projet/test.png'); // refCount = 2
    await service.releaseFile('projet/test.png');   // refCount = 1

    const result = await service.getFile('projet/test.png');
    expect(result.refCount).toBe(1);
  });

  it('releaseFile → refCount = 1 : supprime réellement le fichier', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.releaseFile('projet/test.png');

    await expectAsync(service.getFile('projet/test.png')).toBeRejected();
  });

  it('releaseFile → deux écrans partagés : suppression seulement au second release', async () => {
    const file = new File(['contenu'], 'shared.png', { type: 'image/png' });

    // 1er écran ajoute, 2e écran réutilise (incrementRef)
    await service.addFile('projet/shared.png', file, 'image');
    await service.incrementRef('projet/shared.png');

    // Suppression depuis le 1er écran → toujours présent
    await service.releaseFile('projet/shared.png');
    const stillThere = await service.getFile('projet/shared.png');
    expect(stillThere.refCount).toBe(1);

    // Suppression depuis le 2e écran → supprimé
    await service.releaseFile('projet/shared.png');
    await expectAsync(service.getFile('projet/shared.png')).toBeRejected();
  });

  // ─── Données legacy (entrées sans refCount) ─────────────────────────────────

  it('incrementRef → entrée legacy (sans refCount) traitée comme 1 → passe à 2', async () => {
    await putLegacy('projet/legacy.png');

    await service.incrementRef('projet/legacy.png');

    const result = await service.getFile('projet/legacy.png');
    expect(result.refCount).toBe(2);
  });

  it('releaseFile → entrée legacy (sans refCount) traitée comme 1 → supprimée', async () => {
    await putLegacy('projet/legacy.png');

    await service.releaseFile('projet/legacy.png');

    await expectAsync(service.getFile('projet/legacy.png')).toBeRejected();
  });

  it('updateFile → entrée legacy sans refCount → réécrit avec refCount à 1', async () => {
    await putLegacy('projet/legacy.png');
    const fileV2 = new File(['v2'], 'legacy.png', { type: 'image/png' });

    await service.updateFile('projet/legacy.png', fileV2, 'image');

    const result = await service.getFile('projet/legacy.png');
    expect(result.refCount).toBe(1);
  });

  it('deleteFile → supprime un fichier', async () => {
    const file = new File(['contenu'], 'test.png', { type: 'image/png' });

    await service.addFile('projet/test.png', file, 'image');
    await service.deleteFile('projet/test.png');

    await expectAsync(
      service.getFile('projet/test.png')
    ).toBeRejected();
  });

  it('deleteAll → supprime tous les fichiers', async () => {
    const file1 = new File(['a'], 'a.png', { type: 'image/png' });
    const file2 = new File(['b'], 'b.png', { type: 'image/png' });

    await service.addFile('projet/a.png', file1, 'image');
    await service.addFile('projet/b.png', file2, 'image');

    await service.deleteAll();

    const result = await service.getAllFiles();
    expect(result.length).toBe(0);
  });

  it('getFilesByProject → retourne uniquement les fichiers du projet', async () => {
    const file1 = new File(['a'], 'a.png', { type: 'image/png' });
    const file2 = new File(['b'], 'b.png', { type: 'image/png' });
    const file3 = new File(['c'], 'c.png', { type: 'image/png' });

    await service.addFile('projetA/a.png', file1, 'image');
    await service.addFile('projetA/b.png', file2, 'image');
    await service.addFile('projetB/c.png', file3, 'image'); // autre projet

    const result = await service.getFilesByProject('projetA');

    expect(result.length).toBe(2);
    expect(result.every(f => f.id.startsWith('projetA/'))).toBeTrue();
  });

  // ─── Robustesse des écritures et de la connexion ─────────────────────────────

  it('écriture annulée après le succès de sa requête (quota, disque plein) → rejetée et non enregistrée', async () => {
    const entry = { id: 'projet/quota.png', file: new File(['x'], 'quota.png'), type: 'image', lastEdit: new Date(), refCount: 1 };
    const write = (service as any).run('readwrite', (store: IDBObjectStore) => {
      const request = store.put(entry);
      // Simule une transaction qui échoue à la validation, après le succès de la requête.
      request.addEventListener('success', () => store.transaction.abort());
      return request;
    });

    await expectAsync(write).toBeRejected();
    await expectAsync(service.getFile('projet/quota.png')).toBeRejected();
  });

  it('connexion fermée par une mise à niveau dans un autre onglet → rouverte à la demande suivante', async () => {
    await service.addFile('projet/avant.png', new File(['a'], 'avant.png'), 'image');

    // Équivaut à `onversionchange` : la connexion partagée est fermée et oubliée.
    await closeAppDatabase();

    await service.addFile('projet/apres.png', new File(['b'], 'apres.png'), 'image');
    expect((await service.getFile('projet/avant.png')).id).toBe('projet/avant.png');
    expect((await service.getFile('projet/apres.png')).id).toBe('projet/apres.png');
  });
});
