import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {LoadService} from '../load/load.service';
import {DownloadService} from '../download/download.service';
import {SaveService} from '../save/save.service';
import {PopupOverwriteSaveComponent} from '../../components/popup-overwrite-save/popup-overwrite-save.component';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';

// Labels affichés dans la popup pour identifier le slot menacé
const SLOT_LABELS: Record<number, string> = {
  0: 'Sauvegarde automatique',
  1: 'Emplacement 1',
  2: 'Emplacement 2',
  3: 'Emplacement 3',
};

@Injectable({providedIn: 'root'})
export class OverwriteGuardService {

  constructor(
    private dialog: MatDialog,
    private loadService: LoadService,
    private downloadService: DownloadService,
    private saveService: SaveService
  ) {}

  /**
   * Vérifie si un slot est occupé et protège l'utilisateur avant écrasement.
   *
   * Cas spécial slot 0 : si l'auto-save contient une évaluation déjà présente
   * dans un slot nommé (1, 2 ou 3), les modifications sont silencieusement
   * re-sauvegardées dans ce slot sans afficher de popup.
   *
   * @param slotIndex          Index du slot à vérifier (0 = auto-save, 1-3 = slots nommés)
   * @param skipIfSameEvalName Nom d'évaluation pour lequel aucun avertissement n'est nécessaire
   *                           (cas où on charge la même évaluation que celle déjà en slot 0)
   * @returns true si l'opération peut continuer, false si l'utilisateur a annulé
   */
  async check(slotIndex: FormatTypeConfig, skipIfSameEvalName?: string): Promise<boolean> {
    const existing = this.loadService.getSlot(slotIndex);

    if (!existing || !existing.nomEval) return true; // slot vide, rien à protéger

    if (skipIfSameEvalName && existing.nomEval === skipIfSameEvalName) return true; // même éval, pas d'écrasement réel

    if (slotIndex === 0) {
      // Si l'auto-save correspond à un slot nommé, on y reporte les modifications
      // silencieusement avant de laisser passer : l'utilisateur ne perd rien
      const linkedSlot = this.findNamedSlotByEvalName(existing.nomEval);
      if (linkedSlot !== null) {
        this.saveService.saveToSlot(linkedSlot, this.saveService.dataAuto);
        return true;
      }
    }

    // Le slot contient une évaluation non liée : on demande à l'utilisateur quoi faire
    const result = await firstValueFrom(
      this.dialog.open(PopupOverwriteSaveComponent, {
        data: {save: existing, slotLabel: SLOT_LABELS[slotIndex] ?? `Emplacement ${slotIndex}`},
        disableClose: true
      }).afterClosed()
    );

    if (result === 'download') {
      await this.downloadService.generateSlotZip(existing); // télécharge l'existant puis laisse passer
      return true;
    }
    return result === 'overwrite'; // 'overwrite' = continuer sans télécharger, null = annulé
  }

  /**
   * Cherche parmi les slots nommés (1, 2, 3) lequel contient une évaluation
   * portant le même nom que celui passé en paramètre.
   *
   * @param nomEval Nom de l'évaluation à rechercher
   * @returns L'index du slot correspondant, ou null si aucun slot ne correspond
   */
  private findNamedSlotByEvalName(nomEval: string): FormatTypeConfig | null {
    for (const i of [1, 2, 3] as FormatTypeConfig[]) {
      const slot = this.loadService.getSlot(i);
      if (slot && slot.nomEval === nomEval) return i;
    }
    return null;
  }
}
