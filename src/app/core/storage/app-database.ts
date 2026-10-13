/**
 * Point d'entrée unique vers la base IndexedDB de l'application.
 *
 * Toute ouverture de `GazePlayEvalDB` doit passer par {@link openAppDatabase} afin que
 * chaque service utilise la même version de schéma et la même logique de migration.
 *
 * Historique du schéma (les migrations sont strictement additives) :
 *  - v1 : store `evalFiles` (médias image/son/vidéo des évaluations, clé `id`).
 *  - v2 : store `userPreferences` (préférences d'affichage, clé `id`).
 *
 * Règles de migration :
 *  - ne jamais supprimer ni vider `evalFiles` ;
 *  - chaque étape ne fait que créer ce qui manque ;
 *  - une migration IndexedDB est transactionnelle : si elle échoue, la base reste
 *    dans sa version précédente avec ses données intactes.
 */

export const APP_DB_NAME = 'GazePlayEvalDB';
export const APP_DB_VERSION = 2;

export const STORE_EVAL_FILES = 'evalFiles';
export const STORE_USER_PREFERENCES = 'userPreferences';

export interface OpenDatabaseOptions {
  /**
   * Appelé lorsque la mise à niveau est bloquée par un autre onglet resté ouvert sur
   * l'ancienne version. L'ouverture reprend automatiquement dès que cet onglet se ferme.
   */
  onBlocked?: () => void;
}

/**
 * Applique les étapes de migration nécessaires entre `oldVersion` et la version courante.
 * Exportée pour pouvoir être testée indépendamment.
 */
export function upgradeAppDatabase(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_EVAL_FILES)) {
    db.createObjectStore(STORE_EVAL_FILES, {keyPath: 'id'});
  }
  if (oldVersion < 2 && !db.objectStoreNames.contains(STORE_USER_PREFERENCES)) {
    db.createObjectStore(STORE_USER_PREFERENCES, {keyPath: 'id'});
  }
  // Filet de sécurité : si une base existante a perdu `evalFiles` (cas anormal),
  // on le recrée vide plutôt que de laisser l'application sans store de médias.
  if (!db.objectStoreNames.contains(STORE_EVAL_FILES)) {
    db.createObjectStore(STORE_EVAL_FILES, {keyPath: 'id'});
  }
}

let sharedConnection: Promise<IDBDatabase> | null = null;

/**
 * Ouvre (une seule fois par onglet) la base de l'application à la version courante.
 *
 * La connexion est partagée : les appels suivants renvoient la même promesse.
 * Si un autre onglet demande une version plus récente, la connexion est fermée pour ne
 * pas bloquer sa migration ; l'appel suivant rouvrira la base.
 *
 * @throws si IndexedDB est indisponible (navigation privée de certains navigateurs, etc.).
 */
export function openAppDatabase(options: OpenDatabaseOptions = {}): Promise<IDBDatabase> {
  if (sharedConnection) {
    return sharedConnection;
  }

  sharedConnection = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB n\'est pas disponible dans ce navigateur.'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(APP_DB_NAME, APP_DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = (event) => {
      upgradeAppDatabase(request.result, event.oldVersion);
    };

    request.onblocked = () => options.onBlocked?.();

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        sharedConnection = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Ouverture d\'IndexedDB impossible.'));
    };
  }).catch((error) => {
    // On n'enregistre pas l'échec : un prochain appel pourra retenter l'ouverture.
    sharedConnection = null;
    throw error;
  });

  return sharedConnection;
}

/**
 * Ferme la connexion partagée. Réservé aux tests (suppression/recréation de la base).
 */
export async function closeAppDatabase(): Promise<void> {
  const pending = sharedConnection;
  sharedConnection = null;
  if (!pending) return;
  try {
    (await pending).close();
  } catch {
    // ouverture déjà en échec : rien à fermer
  }
}
