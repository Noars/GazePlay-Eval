import {inject, Injectable} from '@angular/core';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {LoadService} from '../../services/load/load.service';
import {SaveService} from '../../services/save/save.service';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {collectMediaReferences, emptyReferences, isReferenced, MediaReferences} from './media-references';
import {TabSessionService} from '../tab/tab-session.service';

/**
 * Suppression **prudente** des médias IndexedDB.
 *
 * Avant cette classe, supprimer un emplacement ou renommer une évaluation appelait
 * `deleteFileByProject(nom)` (supprimée depuis), qui effaçait tous les médias du projet même s'ils étaient
 * encore utilisés par l'évaluation en cours ou par un autre emplacement portant le même
 * nom. Ici, un média n'est supprimé que si **aucune** évaluation connue (emplacements 0 à 3,
 * évaluation de travail, et évaluations des autres onglets) ne le référence, ni par identifiant
 * ni par nom de fichier.
 */
@Injectable({providedIn: 'root'})
export class MediaCleanupService {
  private readonly idb = inject(IndexedDBService);
  private readonly loadService = inject(LoadService);
  private readonly saveService = inject(SaveService);
  private readonly tabSession = inject(TabSessionService);

  /** Inventaire des médias utilisés par toutes les évaluations connues. */
  collectAllReferences(): MediaReferences {
    const refs = emptyReferences();
    for (const slot of [0, 1, 2, 3] as FormatTypeConfig[]) {
      collectMediaReferences(this.loadService.getSlot(slot), refs);
    }
    collectMediaReferences(this.saveService.dataAuto, refs);
    // Médias des évaluations ouvertes dans les autres onglets (chacun a son propre slot 0).
    for (const evaluation of this.tabSession.otherTabsEvaluations()) {
      collectMediaReferences(evaluation, refs);
    }
    return refs;
  }

  /**
   * Supprime les médias d'un projet qui ne sont plus référencés nulle part.
   * @param projectName préfixe des identifiants concernés (`"<projectName>/…"`).
   * @returns le nombre de médias supprimés.
   */
  async cleanupProject(projectName: string): Promise<number> {
    if (!projectName) return 0;
    const files = await this.idb.getFilesByProject(projectName);
    return this.deleteUnreferenced(files.map(file => file.id));
  }

  /**
   * Supprime tous les médias qui ne sont plus référencés par aucune évaluation.
   * @returns le nombre de médias supprimés.
   */
  async cleanupAll(): Promise<number> {
    const files = await this.idb.getAllFiles();
    return this.deleteUnreferenced(files.map(file => file.id));
  }

  private async deleteUnreferenced(ids: string[]): Promise<number> {
    const refs = this.collectAllReferences();
    let deleted = 0;
    for (const id of ids) {
      if (isReferenced(id, refs)) continue;
      await this.idb.deleteFile(id);
      deleted++;
    }
    return deleted;
  }
}
