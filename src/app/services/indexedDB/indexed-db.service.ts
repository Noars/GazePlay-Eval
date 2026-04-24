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
  private dbReady: Promise<void>;
  constructor() {
    this.dbReady = this.initDB();
  }
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
}
