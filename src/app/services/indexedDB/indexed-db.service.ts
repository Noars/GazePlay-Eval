import {Injectable} from '@angular/core';
import {EvalFile} from '../../shared/eval-file.model';
import {openAppDatabase, STORE_EVAL_FILES} from '../../core/storage/app-database';

type MediaType = EvalFile['type'];

/**
 * Accès au store IndexedDB `evalFiles`, qui contient les médias des évaluations.
 *
 * Identifiant d'un média : `"<nomEval>/<nomFichier>"`. Un même média peut être référencé
 * par plusieurs cases ou écrans : `refCount` compte ces références, `releaseFile` ne
 * supprime l'entrée que lorsque la dernière référence est libérée.
 *
 * L'ouverture de la base et ses migrations sont centralisées dans `core/storage/app-database.ts`.
 */
@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private readonly storeName = STORE_EVAL_FILES;
  private db!: IDBDatabase;
  readonly dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.initDB();
    // Évite une erreur « unhandled rejection » si IndexedDB est indisponible :
    // chaque méthode publique propage déjà l'erreur à son appelant.
    this.dbReady.catch(() => undefined);
  }

  /**
   * Ouvre la base partagée de l'application (version et migrations centralisées).
   */
  initDB(): Promise<void> {
    return openAppDatabase().then(db => {
      this.db = db;
    });
  }

  /**
   * Exécute une requête dans une transaction sur le store des médias et résout avec son résultat.
   */
  private async run<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    await this.dbReady;
    return new Promise<T>((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, mode);
      const request = operation(transaction.objectStore(this.storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ajoute un fichier image, son ou vidéo à l'IDB avec un compteur de références à 1.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   * @param file Le fichier à stocker.
   * @param type son type (image, sound, video).
   * @throws si un fichier portant cet identifiant existe déjà.
   */
  async addFile(id: string, file: File | Blob, type: MediaType): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const entry: EvalFile = {id, file, type, lastEdit: new Date(), refCount: 1};

      const check = store.get(id);
      check.onsuccess = () => {
        if (check.result) {
          reject(new Error(`L'id "${id}" existe déjà`));
          return;
        }
        const request = store.add(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      };
      check.onerror = () => reject(check.error);
    });
  }

  /**
   * Renvoie un fichier de l'IDB à partir de son ID.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   * @throws si le fichier est introuvable.
   */
  async getFile(id: string): Promise<EvalFile> {
    const result = await this.run<EvalFile | undefined>('readonly', store => store.get(id));
    if (!result) {
      throw new Error(`Fichier "${id}" introuvable`);
    }
    return result;
  }

  /**
   * Renvoie tous les fichiers de l'IDB.
   */
  async getAllFiles(): Promise<EvalFile[]> {
    const result = await this.run<EvalFile[]>('readonly', store => store.getAll());
    if (!result) {
      throw new Error('Erreur lors de la récupération des fichiers');
    }
    return result;
  }

  /**
   * Remplace le contenu d'un fichier en conservant son compteur de références
   * (ou le crée avec un compteur à 1 s'il n'existe pas).
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   * @param file Le fichier à stocker.
   * @param type son type (image, sound, video).
   */
  async updateFile(id: string, file: File | Blob, type: MediaType): Promise<void> {
    let refCount = 1;
    try {
      const existing = await this.getFile(id);
      refCount = existing.refCount ?? 1;
    } catch { /* fichier absent, refCount par défaut à 1 */ }

    const entry: EvalFile = {id, file, type, lastEdit: new Date(), refCount};
    await this.run('readwrite', store => store.put(entry));
  }

  /**
   * Incrémente le compteur de références d'un fichier dans l'IDB.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   * @throws si le fichier est introuvable.
   */
  async incrementRef(id: string): Promise<void> {
    const entry = await this.getFile(id);
    entry.refCount = (entry.refCount ?? 1) + 1;
    await this.run('readwrite', store => store.put(entry));
  }

  /**
   * Libère une référence vers un fichier : décrémente son compteur, ou supprime
   * l'entrée lorsqu'il s'agissait de la dernière référence.
   * @throws si le fichier est introuvable.
   */
  async releaseFile(id: string): Promise<void> {
    const entry = await this.getFile(id);

    if ((entry.refCount ?? 1) <= 1) {
      await this.deleteFile(id);
      return;
    }

    entry.refCount = (entry.refCount ?? 1) - 1;
    await this.run('readwrite', store => store.put(entry));
  }

  /**
   * Supprime un fichier de l'IDB, quel que soit son compteur de références.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   */
  async deleteFile(id: string): Promise<void> {
    await this.run('readwrite', store => store.delete(id));
  }

  /**
   * Supprime tous les fichiers de l'IDB. Les sauvegardes qui y faisaient référence
   * perdent alors leurs médias : à n'appeler qu'après confirmation explicite.
   */
  async deleteAll(): Promise<void> {
    await this.run('readwrite', store => store.clear());
  }

  /**
   * Renvoie tous les fichiers dont l'identifiant commence par `"<projectName>/"`.
   * @param projectName le nom du projet.
   */
  async getFilesByProject(projectName: string): Promise<EvalFile[]> {
    const allFiles = await this.run<EvalFile[]>('readonly', store => store.getAll());
    return allFiles.filter(f => f.id.startsWith(`${projectName}/`));
  }

  /**
   * Supprime tous les fichiers d'un projet, **sans vérifier** s'ils sont encore utilisés.
   * Préférer `MediaCleanupService.cleanupProject()` qui ne supprime que les médias
   * qu'aucune sauvegarde ne référence plus.
   * @param projectName le nom du projet.
   */
  async deleteFileByProject(projectName: string): Promise<void> {
    const files = await this.getFilesByProject(projectName);
    for (const file of files) {
      await this.deleteFile(file.id);
    }
  }
}
