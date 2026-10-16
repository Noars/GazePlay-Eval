import {inject, Injectable} from '@angular/core';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {SaveService} from '../../services/save/save.service';
import {EvalFile} from '../../shared/eval-file.model';
import {fileNameFromId, isReferenced} from './media-references';
import {MediaCleanupService} from './media-cleanup.service';

export type MediaType = EvalFile['type'];

/** Média retrouvé dans IndexedDB. */
export interface ResolvedMedia {
  file: File;
  /** Identifiant IndexedDB effectivement trouvé. */
  id: string;
}

/**
 * Accès aux médias (images, sons, vidéos) des évaluations, partagé par l'éditeur.
 *
 * Remplace trois copies quasi identiques de la même logique (liste des écrans, édition
 * d'écran, configuration d'une case). Les règles historiques sont conservées :
 *  - identifiant `"<nomEval>/<nomFichier>"` ;
 *  - ajout d'un fichier déjà présent = une référence de plus (`incrementRef`) ;
 *  - résolution par identifiants candidats, puis repli par nom de fichier seul
 *    (sauvegardes anciennes ou importées sous un autre nom d'évaluation).
 */
@Injectable({providedIn: 'root'})
export class MediaLibraryService {
  private readonly idb = inject(IndexedDBService);
  private readonly saveService = inject(SaveService);
  private readonly cleanup = inject(MediaCleanupService);

  /** Identifiant IndexedDB d'un fichier pour l'évaluation en cours. */
  idFor(fileName: string): string {
    return `${this.saveService.getEvalName()}/${fileName}`;
  }

  /**
   * Enregistre un fichier pour l'évaluation en cours. S'il existe déjà sous le même
   * identifiant, ajoute une référence au lieu de le dupliquer.
   * @returns l'identifiant IndexedDB du média.
   */
  async store(file: File, type: MediaType): Promise<string> {
    const id = this.idFor(file.name);
    try {
      await this.idb.addFile(id, file, type);
    } catch {
      await this.idb.incrementRef(id);
    }
    return id;
  }

  /**
   * Enregistre un fichier sous un identifiant **nouveau** (suffixe numérique si besoin),
   * par exemple une image recadrée qui ne doit pas remplacer l'original partagé.
   * @returns le nom de fichier et l'identifiant retenus.
   */
  async storeAsNew(file: File, type: MediaType): Promise<{fileName: string, id: string}> {
    const dot = file.name.lastIndexOf('.');
    const base = dot > 0 ? file.name.slice(0, dot) : file.name;
    const extension = dot > 0 ? file.name.slice(dot) : '';

    for (let attempt = 0; attempt < 1000; attempt++) {
      const fileName = attempt === 0 ? file.name : `${base}-${attempt}${extension}`;
      const id = this.idFor(fileName);
      try {
        const named = fileName === file.name ? file : new File([file], fileName, {type: file.type});
        await this.idb.addFile(id, named, type);
        return {fileName, id};
      } catch {
        // identifiant déjà pris : on essaie le suffixe suivant
      }
    }
    throw new Error(`Impossible d'enregistrer « ${file.name} » : trop de fichiers portent ce nom.`);
  }

  /**
   * Remplace le contenu d'un média existant sans changer son compteur de références
   * (même nom de fichier choisi à nouveau pour la même case).
   */
  async replaceContent(id: string, file: File, type: MediaType): Promise<void> {
    await this.idb.updateFile(id, file, type);
  }

  /** Ajoute une référence à un média existant (duplication d'une case ou d'un écran). */
  async addReference(id: string): Promise<void> {
    if (id) {
      await this.idb.incrementRef(id);
    }
  }

  /**
   * Libère une référence vers un média (identifiant ou nom de fichier).
   *
   * Le compteur est décrémenté ; à la dernière référence, le fichier n'est supprimé que
   * si **aucune** évaluation connue ne l'utilise encore (les compteurs des médias importés
   * ne reflètent pas toujours le nombre réel d'utilisations). L'appelant doit donc retirer
   * la référence de l'évaluation **avant** d'appeler cette méthode.
   * Seuls les identifiants candidats sont essayés (jamais le repli par nom seul, qui
   * pourrait viser le média d'une autre évaluation).
   * @returns vrai si une référence a été trouvée.
   */
  async release(ref: unknown, type: MediaType): Promise<boolean> {
    for (const id of this.candidateIds(ref)) {
      let entry: EvalFile;
      try {
        entry = await this.idb.getFile(id);
      } catch {
        continue; // candidat suivant
      }
      if (entry.type !== type) continue;

      if ((entry.refCount ?? 1) > 1) {
        await this.idb.releaseFile(id);
      } else if (!isReferenced(id, this.cleanup.collectAllReferences())) {
        await this.idb.deleteFile(id);
      }
      return true;
    }
    return false;
  }

  /**
   * Retrouve un média à partir d'un identifiant ou d'un nom de fichier.
   * @returns le fichier (toujours un `File`, nommé d'après l'identifiant) ou `undefined`.
   */
  async resolve(ref: unknown, type: MediaType): Promise<ResolvedMedia | undefined> {
    for (const id of this.candidateIds(ref)) {
      try {
        const entry = await this.idb.getFile(id);
        if (entry.type === type && entry.file instanceof Blob) {
          return {file: this.asFile(entry.file, fileNameFromId(id)), id};
        }
      } catch {
        // candidat suivant
      }
    }

    // Repli : même nom de fichier et même type, quel que soit le préfixe d'évaluation.
    try {
      const baseName = this.extractName(ref);
      if (!baseName) return undefined;
      const match = (await this.idb.getAllFiles())
        .find(entry => entry.type === type && fileNameFromId(entry.id) === baseName);
      if (match?.file instanceof Blob) {
        return {file: this.asFile(match.file, baseName), id: match.id};
      }
    } catch {
      // repli best-effort
    }
    return undefined;
  }

  /**
   * Identifiants à essayer pour une référence : telle quelle, nom seul, et préfixée par
   * le nom de l'évaluation en cours.
   */
  candidateIds(ref: unknown): string[] {
    const cleanName = this.extractRef(ref);
    if (!cleanName) return [];

    const projectName = this.saveService.getEvalName();
    const baseName = fileNameFromId(cleanName);
    const ids = new Set<string>([cleanName, baseName]);
    if (projectName) {
      ids.add(`${projectName}/${cleanName}`);
      ids.add(`${projectName}/${baseName}`);
    }
    return [...ids];
  }

  private extractRef(ref: unknown): string {
    if (ref === null || ref === undefined) return '';
    if (typeof ref === 'string') return ref.trim();
    if (ref instanceof File) return (ref.name || '').trim();
    if (typeof ref === 'object') {
      const candidate = (ref as {name?: unknown, id?: unknown}).name ?? (ref as {id?: unknown}).id;
      return candidate ? String(candidate).trim() : '';
    }
    return String(ref).trim();
  }

  private extractName(ref: unknown): string {
    return fileNameFromId(this.extractRef(ref));
  }

  private asFile(blob: Blob, name: string): File {
    return blob instanceof File ? blob : new File([blob], name, {type: blob.type});
  }
}
