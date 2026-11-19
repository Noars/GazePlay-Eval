import {Injectable, signal} from '@angular/core';

/**
 * Avertissements globaux liés au stockage local, affichés en haut de l'application.
 */
@Injectable({providedIn: 'root'})
export class StorageNoticeService {
  /**
   * Vrai lorsque la mise à jour de la base IndexedDB attend la fermeture d'un autre onglet
   * de GazePlay Eval resté ouvert sur une ancienne version.
   */
  readonly upgradeBlocked = signal(false);
}
