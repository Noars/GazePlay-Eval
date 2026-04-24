import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {LoadService} from '../load/load.service';
import {DownloadService} from '../download/download.service';
import {SaveService} from '../save/save.service';
import {PopupOverwriteSaveComponent} from '../../components/popup-overwrite-save/popup-overwrite-save.component';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';

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
   * Vérifie si le slot est occupé et avertit l'utilisateur avant écrasement.
   *
   * Cas spécial slot 0 : si l'auto-save correspond à un slot nommé (1/2/3),
   * les modifications sont silencieusement re-sauvegardées dans ce slot avant
   * de laisser passer — sans popup.
   *
   * @param slotIndex          Slot à vérifier
   * @param skipIfSameEvalName Si le nomEval du slot correspond à ce nom, aucun avertissement
   * @returns true = peut procéder, false = l'utilisateur a annulé
   */
  async check(slotIndex: FormatTypeConfig, skipIfSameEvalName?: string): Promise<boolean> {
    const existing = this.loadService.getSlot(slotIndex);
    if (!existing || !existing.nomEval) return true;
    if (skipIfSameEvalName && existing.nomEval === skipIfSameEvalName) return true;

    if (slotIndex === 0) {
      const linkedSlot = this.findNamedSlotByEvalName(existing.nomEval);
      if (linkedSlot !== null) {
        this.saveService.saveToSlot(linkedSlot, this.saveService.dataAuto);
        return true;
      }
    }

    const result = await firstValueFrom(
      this.dialog.open(PopupOverwriteSaveComponent, {
        data: {save: existing, slotLabel: SLOT_LABELS[slotIndex] ?? `Emplacement ${slotIndex}`},
        disableClose: true
      }).afterClosed()
    );

    if (result === 'download') {
      await this.downloadService.generateSlotZip(existing);
      return true;
    }
    return result === 'overwrite';
  }

  /**
   * Cette fonction cherche et renvoie l'index du slot à partir du nom de l'évaluation.
   * @param nomEval
   * @returns l'index correspondant au nom de l'évaluation (1, 2 ou 3), ou null si rien n'a été trouvé.
   */
  private findNamedSlotByEvalName(nomEval: string): FormatTypeConfig | null {
    for (const i of [1, 2, 3] as FormatTypeConfig[]) {
      const slot = this.loadService.getSlot(i);
      if (slot && slot.nomEval === nomEval) return i;
    }
    return null;
  }
}
