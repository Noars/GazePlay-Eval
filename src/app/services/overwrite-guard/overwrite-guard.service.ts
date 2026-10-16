import {inject, Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {LoadService} from '../load/load.service';
import {DownloadService} from '../download/download.service';
import {SaveService} from '../save/save.service';
import {PopupOverwriteSaveComponent} from '../../components/popup-overwrite-save/popup-overwrite-save.component';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {I18nService} from '../../core/i18n/i18n.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {FlashService} from '../flash-message/flash.service';
import {SlotReservation} from '../../core/tab/tab-session.service';

/** Ouverture d'un emplacement : lié à cet onglet (réservé), ou copie non liée s'il est ouvert ailleurs. */
export type SlotOpening = {mode: 'link'; reservation: SlotReservation} | {mode: 'copy'};
import {EvaluationContent, isEmptyEvaluation, sameEvaluation} from '../../shared/evaluation-content';

export {isEmptyEvaluation, sameEvaluation} from '../../shared/evaluation-content';

@Injectable({providedIn: 'root'})
export class OverwriteGuardService {
  private readonly i18n = inject(I18nService);
  private readonly confirmService = inject(ConfirmService);
  private readonly flash = inject(FlashService);

  constructor(
    private dialog: MatDialog,
    private loadService: LoadService,
    private downloadService: DownloadService,
    private saveService: SaveService
  ) {}

  /**
   * Vérifie si un emplacement est occupé et protège l'utilisateur avant de l'écraser.
   *
   * Emplacement 0 (évaluation en cours), avant de la remplacer :
   *  - si elle est liée à un emplacement nommé (`activeSlotIndex`), elle y est d'abord
   *    reportée sans question : l'utilisateur ne perd rien ;
   *  - sinon, si un emplacement nommé contient exactement la même évaluation, rien ne peut
   *    être perdu ;
   *  - sinon, la fenêtre de confirmation s'affiche (même si un emplacement porte le même nom :
   *    un nom identique ne prouve pas qu'il s'agit de la même évaluation).
   *
   * Emplacement nommé (1-3) : la fenêtre s'affiche, sauf avec `replacingWithCurrent` quand
   * l'emplacement contient déjà l'évaluation en cours (il est lié, ou son contenu est identique).
   *
   * @param slotIndex Emplacement à vérifier (0 = évaluation en cours, 1-3 = emplacements nommés)
   * @param options.replacingWithCurrent l'emplacement va recevoir l'évaluation en cours
   * @returns true si l'opération peut continuer, false si l'utilisateur a annulé
   */
  async check(slotIndex: FormatTypeConfig, options: {replacingWithCurrent?: boolean} = {}): Promise<boolean> {
    const existing = this.loadService.getSlot(slotIndex);

    // Rien à protéger : emplacement libre, ou évaluation encore vide (le nom seul ne compte pas).
    if (!existing || isEmptyEvaluation(existing)) return true;

    const current = this.currentEvaluation();
    if (slotIndex === 0) {
      const linkedSlot = this.saveService.activeSlotIndex;
      if (linkedSlot !== null && this.loadService.getSlot(linkedSlot) !== null) {
        this.saveService.saveToSlot(linkedSlot, current ?? existing);
        return true;
      }
      if (this.findSlotHolding(current ?? existing) !== null) return true;
    } else if (options.replacingWithCurrent && current &&
      (this.saveService.activeSlotIndex === slotIndex || sameEvaluation(existing, current))) {
      return true;
    }

    // Le slot contient une évaluation qui serait perdue : on demande à l'utilisateur quoi faire
    const result = await firstValueFrom(
      this.dialog.open(PopupOverwriteSaveComponent, {
        data: {save: existing, slotLabel: this.slotLabel(slotIndex)},
        disableClose: true,
        panelClass: 'gp-dialog-panel',
        autoFocus: '.js-cancel',
        ariaLabelledBy: 'overwrite-title',
        ariaDescribedBy: 'overwrite-message',
      }).afterClosed()
    );

    if (result === 'download') {
      await this.downloadService.generateSlotZip(existing); // télécharge l'existant puis laisse passer
      return true;
    }
    return result === 'overwrite'; // 'overwrite' = continuer sans télécharger, null = annulé
  }

  /**
   * Avant d'ouvrir un emplacement (Ouvrir, Charger) : le réserve pour cet onglet. S'il est en
   * cours de modification dans un autre onglet, propose d'en ouvrir une copie non liée.
   * @returns `null` si l'utilisateur annule.
   */
  async reserveForOpening(slotIndex: FormatTypeConfig): Promise<SlotOpening | null> {
    const reservation = await this.saveService.reserveSlot(slotIndex);
    if (reservation) return {mode: 'link', reservation};
    const copy = await this.confirmService.confirm({
      title: this.i18n.t('tabs.busySlot.title'),
      message: this.i18n.t('tabs.busySlot.message', {n: slotIndex}),
      confirmLabel: this.i18n.t('tabs.busySlot.openCopy'),
    });
    return copy ? {mode: 'copy'} : null;
  }

  /**
   * Avant d'importer dans un emplacement : le réserve. S'il est ouvert dans un autre onglet,
   * propose d'ouvrir l'évaluation importée sans l'enregistrer (`'open'`).
   * @returns `null` si l'utilisateur annule.
   */
  async reserveForImport(slotIndex: FormatTypeConfig): Promise<SlotReservation | 'open' | null> {
    const reservation = await this.saveService.reserveSlot(slotIndex);
    if (reservation) return reservation;
    const open = await this.confirmService.confirm({
      title: this.i18n.t('tabs.busySlot.title'),
      message: this.i18n.t('tabs.busySlot.importMessage', {n: slotIndex}),
      confirmLabel: this.i18n.t('tabs.busySlot.importOpen'),
    });
    return open ? 'open' : null;
  }

  /**
   * Avant d'écrire dans un emplacement (Enregistrer ici, Remplacer) : le réserve, ou affiche
   * un avertissement s'il est en cours de modification dans un autre onglet.
   */
  async reserveForWriting(slotIndex: FormatTypeConfig): Promise<SlotReservation | null> {
    const reservation = await this.saveService.reserveSlot(slotIndex);
    if (!reservation) this.flash.show('warning', this.i18n.t('tabs.busySlot.blocked', {n: slotIndex}));
    return reservation;
  }

  /** Avant de supprimer un emplacement : faux (avec avertissement) s'il est ouvert ailleurs. */
  async ensureNotOpenElsewhere(slotIndex: FormatTypeConfig): Promise<boolean> {
    if (!await this.saveService.isSlotOpenElsewhere(slotIndex)) return true;
    this.flash.show('warning', this.i18n.t('tabs.busySlot.blocked', {n: slotIndex}));
    return false;
  }

  /**
   * Emplacement nommé (1-3) contenant exactement l'évaluation donnée, ou `null`.
   * Sert à savoir si l'évaluation en cours est déjà en lieu sûr.
   */
  findSlotHolding(evaluation: EvaluationContent | null): FormatTypeConfig | null {
    if (!evaluation) return null;
    for (const i of [1, 2, 3] as FormatTypeConfig[]) {
      const slot = this.loadService.getSlot(i);
      if (slot && sameEvaluation(slot, evaluation)) return i;
    }
    return null;
  }

  /**
   * Évaluation en cours la plus fiable : la copie de travail si elle a été chargée dans
   * cette page (elle peut être plus récente), sinon le slot 0 enregistré. Ne renvoie jamais
   * le modèle vide présent en mémoire au démarrage.
   */
  private currentEvaluation(): EvaluationContent | null {
    if (this.saveService.hasLoadedWorkspace) return this.saveService.dataAuto;
    return this.loadService.getSlot(0);
  }

  /**
   * Retourne un nom d'évaluation unique parmi les slots nommés (1, 2, 3).
   * Si le nom existe déjà dans un autre slot, ajoute " 1", " 2", etc.
   *
   * @param nomEval         Nom initial de l'évaluation
   * @param targetSlotIndex Slot de destination (exclu de la vérification)
   */
  getUniqueEvalName(nomEval: string, targetSlotIndex: FormatTypeConfig): string {
    const existingNames = new Set<string>();
    for (const i of [1, 2, 3] as FormatTypeConfig[]) {
      if (i === targetSlotIndex) continue;
      const slot = this.loadService.getSlot(i);
      if (slot?.nomEval) existingNames.add(slot.nomEval);
    }
    if (!existingNames.has(nomEval)) return nomEval;
    let counter = 1;
    while (existingNames.has(`${nomEval} ${counter}`)) counter++;
    return `${nomEval} ${counter}`;
  }

  /** Libellé affiché dans la fenêtre pour identifier l'emplacement menacé. */
  private slotLabel(slotIndex: number): string {
    return slotIndex === 0 ? this.i18n.t('saves.autoSlot') : this.i18n.t('saves.slot', {n: slotIndex});
  }
}
