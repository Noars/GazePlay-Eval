import { Injectable } from '@angular/core';
import { EvalFile} from '../../shared/eval-file.model';

@Injectable({
  providedIn: 'root',
})
export class IndexedDBService {
  private dbName = 'GazePlayEvalDB';
  private storeName = 'evalFiles';
  private dbVersion = 1
  private db!: IDBDatabase;
  readonly dbReady: Promise<void>;
  constructor() {
    this.dbReady = this.initDB();
  }

  /**
   * Initialise l'IndexedDB.
   */
  initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        this.db = event.target.result;
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          this.db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };
      request.onerror = () => reject(new Error('Erreur IndexedDB'));
    });
  }

  /**
   * Ajoute un fichier image, son ou vidéo à l'IDB.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   * @param file Le fichier à stocker.
   * @param type son type (image, sound, video).
   */
  async addFile(id: string, file: File | Blob, type: 'image' | 'sound' | 'video'): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {

      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const entry: EvalFile = {
        id,
        file,
        type,
        lastEdit: new Date()
      };

      const check = store.get(id);

      check.onsuccess = () => {
        if (check.result) { // Si déjà présent dans l'IDB
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
   */
  async getFile(id:string): Promise<EvalFile> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const req   = store.get(id);
      req.onsuccess = () => {
        if (!req.result) {
          reject(new Error(`Fichier "${id}" introuvable`));
          return;
        }
        resolve(req.result as EvalFile);
      };
      req.onerror = (e) => reject(req.error);
    });
  }

  /**
   * Renvoie tout les fichiers de l'IDB.
   */
  async getAllFiles(): Promise<EvalFile[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        if (!request.result) {
          reject(new Error(`Erreur lors de la récupération des fichiers`));
          return;
        }
        resolve(request.result as EvalFile[]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Met à jour un fichier dans l'IDB.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   * @param file Le fichier à stocker.
   * @param type son type (image, sound, video).
   */
  async updateFile(id: string, file: File | Blob, type: 'image' | 'sound' | 'video'): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const entry: EvalFile = {
        id,
        file,
        type,
        lastEdit: new Date()
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime un fichier de l'IDB.
   * @param id L'identifiant du fichier. Doit être de la forme "nomProjet/nomFichier".
   */
  async deleteFile(id: string): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime tout les fichiers de l'IDB.
   */
  async deleteAll(): Promise<void> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const tx    = this.db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const req   = store.clear();
      req.onsuccess = () => resolve();
      req.onerror   = (e) => reject(req.error);
    });
  }

  /**
   * Remplace un id d'un fichier de l'IDB.
   * @param oldID l'ancien identifiant.
   * @param newID le nouvel identifiant.
   */
  async changeID(oldID: string, newID: string): Promise<void> {
    await this.dbReady;

    let evalFile = await this.getFile(oldID);
    await this.deleteFile(oldID);
    await this.addFile(newID, evalFile.file, evalFile.type);
  }

  /**
   * Renvoie tout les fichiers qui contiennent le nom du projet dans leur id.
   * @param projectName le nom du projet.
   */
  async getFilesByProject(projectName: string): Promise<EvalFile[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const allFiles = request.result as EvalFile[];
        const filtered = allFiles.filter(f => f.id.startsWith(`${projectName}/`));
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime tout les fichiers qui contiennent le nom du projet dans leur id.
   * @param projectName le nom du projet.
   */
  async deleteFileByProject(projectName: string): Promise<void> {
    await this.dbReady;

    const files = await this.getFilesByProject(projectName);
    for (const file of files) {
      await this.deleteFile(file.id);
    }
  }
}
