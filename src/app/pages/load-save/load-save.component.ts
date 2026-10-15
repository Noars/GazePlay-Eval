import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import { CommonModule } from '@angular/common';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import {I18nService} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';


@Component({
  selector: 'app-load-save',
  templateUrl: './load-save.component.html',
  styleUrl: './load-save.component.css',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe]
})
export class LoadSaveComponent implements OnInit {

  slots: { index: number; data: saveModel | null }[] = [];
  private readonly i18n = inject(I18nService);

  constructor(
    private router: Router,
    private loadService: LoadService,
    public saveService: SaveService,
    private autoSaveService: AutoSaveService,
    private overwriteGuard: OverwriteGuardService
  ) {}

  /**
   * Initialise les slots dans l'interface de load
   */
  ngOnInit(): void {
    this.slots = [1, 2, 3].map(i => ({
      index: i,
      data: this.loadService.getSlot(i as FormatTypeConfig) // Recup data du LocalStorage
    }));
  }

  /**
   * Charge la sauvegarde d'un slot nommé (1, 2 ou 3) dans le slot de travail (slot 0).
   * Avertit l'utilisateur si le slot 0 contient une sauvegarde différente qui serait écrasée.
   * @param slotIndex index du slot à charger : 1, 2 ou 3
   */
  async loadSlot(slotIndex: number): Promise<void> {
    const save = this.loadService.getSlot(slotIndex as FormatTypeConfig);
    if (!save) return;

    if (!await this.overwriteGuard.check(0, save.nomEval)) return;

    const step = save.step >= 0 ? save.step : 3; // fallback sur create-eval si le step n'a pas été enregistré
    this.saveService.loadIntoWorkspace(save, step);
    this.saveService.setActiveSlot(slotIndex as FormatTypeConfig);
    this.saveService.saveToSlot(0, this.saveService.dataAuto);
    this.autoSaveService.tryResume(true);
  }

  /**
   * Formate une date ISO en date lisible dans la langue de l'interface (jj/mm/aaaa en français).
   * @param dateStr date au format ISO 8601
   * @returns date formatée
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(this.i18n.language() === 'en' ? 'en-GB' : 'fr-FR');
  }

  /**
   * Redirige vers la page d'accueil.
   */
  goBack(): void {
    this.router.navigate(['/home']);
  }
}
