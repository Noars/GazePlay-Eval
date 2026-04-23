import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import { CommonModule } from '@angular/common';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';

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
    private saveService: SaveService,
    private autoSaveService: AutoSaveService
  ) {}

  ngOnInit(): void {
    this.slots = [1, 2, 3].map(i => ({
      index: i,
      data: this.loadService.getSlot(i as FormatTypeConfig)
    }));
  }

  loadSlot(slotIndex: number): void {
    const save = this.loadService.getSlot(slotIndex as FormatTypeConfig);
    if (!save) return;

    this.saveService.dataAuto = {
      nomEval: save.nomEval,
      format: save.format,
      infoParticipant: save.infoParticipant,
      globalParamsTransitionScreen: save.globalParamsTransitionScreen,
      globalParamsInstructionScreen: save.globalParamsInstructionScreen,
      globalParamsStimuliScreen: save.globalParamsStimuliScreen,
      listScreens: save.listScreens,
      step: save.step
    };

    this.autoSaveService.tryResume();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR');
  }

  goBack(): void {
    this.router.navigate(['/sauvegarde']);
  }
}
