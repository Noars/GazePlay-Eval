import {
  APP_DB_NAME,
  APP_DB_VERSION,
  STORE_EVAL_FILES,
  STORE_USER_PREFERENCES,
  upgradeAppDatabase
} from './app-database';

/**
 * Tests de migration du schéma IndexedDB.
 *
 * Ils utilisent une base **temporaire au nom distinct** (jamais `GazePlayEvalDB`) :
 *  1. création d'une base v1 contenant un média, comme l'ancienne application ;
 *  2. réouverture en v2 avec la fonction de migration de l'application ;
 *  3. vérification que le média est intact et que le nouveau store existe.
 */
describe('Migration de la base IndexedDB', () => {
  const testDbName = `GazePlayEvalDB-test-migration-${Date.now()}`;

  function open(version: number, upgrade?: (db: IDBDatabase, oldVersion: number) => void): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(testDbName, version);
      request.onupgradeneeded = event => upgrade?.(request.result, event.oldVersion);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function deleteTestDb(): Promise<void> {
    return new Promise(resolve => {
      const request = indexedDB.deleteDatabase(testDbName);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }

  afterEach(async () => {
    await deleteTestDb();
  });

  it('la base de l\'application est en version 2 et garde son nom historique', () => {
    expect(APP_DB_NAME).toBe('GazePlayEvalDB');
    expect(APP_DB_VERSION).toBe(2);
  });

  it('v1 → v2 : les médias existants sont conservés et le store userPreferences est créé', async () => {
    // Base telle que créée par l'ancienne application (v1, store evalFiles uniquement).
    const v1 = await open(1, db => db.createObjectStore(STORE_EVAL_FILES, {keyPath: 'id'}));
    await new Promise<void>((resolve, reject) => {
      const tx = v1.transaction(STORE_EVAL_FILES, 'readwrite');
      tx.objectStore(STORE_EVAL_FILES).put({
        id: 'Eval/chat.png', file: new Blob(['image'], {type: 'image/png'}), type: 'image', lastEdit: new Date(), refCount: 3
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    v1.close();

    const v2 = await open(2, upgradeAppDatabase);

    expect(Array.from(v2.objectStoreNames).sort()).toStrictEqual([STORE_EVAL_FILES, STORE_USER_PREFERENCES].sort());
    const media = await new Promise<any>((resolve, reject) => {
      const request = v2.transaction(STORE_EVAL_FILES, 'readonly').objectStore(STORE_EVAL_FILES).get('Eval/chat.png');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(media.refCount).toBe(3);
    expect(media.type).toBe('image');
    expect(await (media.file as Blob).text()).toBe('image');
    v2.close();
  });

  it('création depuis zéro : les deux stores sont créés', async () => {
    const db = await open(2, upgradeAppDatabase);
    expect(db.objectStoreNames.contains(STORE_EVAL_FILES)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_USER_PREFERENCES)).toBe(true);
    db.close();
  });

  it('migration idempotente : relancée sur une base déjà à jour, elle ne recrée rien', async () => {
    const db = await open(2, upgradeAppDatabase);
    expect(() => upgradeAppDatabase(db, 2)).not.toThrow();
    db.close();
  });
});
