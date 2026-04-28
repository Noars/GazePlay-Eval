import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import { CommonModule } from '@angular/common';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';

@Component({
  selector: 'app-load-save',
  templateUrl: './load-save.component.html',
  styleUrl: './load-save.component.css',
  standalone: true,
  imports: [CommonModule]
})
export class LoadSaveComponent implements OnInit {

  slots: { index: number; data: saveModel | null }[] = [];

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
    this.saveService.dataAuto = {
      nomEval: save.nomEval,
      format: save.format,
      infoParticipant: save.infoParticipant,
      globalParamsTransitionScreen: save.globalParamsTransitionScreen,
      globalParamsInstructionScreen: save.globalParamsInstructionScreen,
      globalParamsStimuliScreen: save.globalParamsStimuliScreen,
      listScreens: save.listScreens,
      step: step
    };
    this.saveService.activeSlotIndex = slotIndex as FormatTypeConfig;
    this.saveService.saveToSlot(0, this.saveService.dataAuto);
    this.autoSaveService.tryResume();
  }

  /**
   * Formate une date ISO en date lisible au format français (jj/mm/aaaa).
   * @param dateStr date au format ISO 8601
   * @returns date formatée en français
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  /**
   * Redirige vers la page de gestion des sauvegardes.
   */
  goBack(): void {
    this.router.navigate(['/sauvegarde']);
  }
}
