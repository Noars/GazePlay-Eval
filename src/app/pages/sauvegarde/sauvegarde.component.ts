import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { PopupDeleteSaveComponent } from '../../components/popup-delete-save/popup-delete-save.component';
import { LoadService } from '../../services/load/load.service';
import { SaveService } from '../../services/save/save.service';
import { AutoSaveService } from '../../services/auto-save/auto-save.service';
import { saveModel } from '../../shared/saveModel';
import { FormatTypeConfig } from '../../shared/dataBaseConfig';
import { Router } from '@angular/router';
import {DatePipe} from '@angular/common';
import {DownloadService} from '../../services/download/download.service';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';

@Component({
  selector: 'app-sauvegarde',
  imports: [MatTooltip, DatePipe],
  templateUrl: './sauvegarde.component.html',
  styleUrl: './sauvegarde.component.css'
})
export class SauvegardeComponent implements OnInit {

  slots: { index: FormatTypeConfig; data: saveModel | null }[] = [];
  selectedSlot: FormatTypeConfig | null = null;

  constructor(
    private dialog: MatDialog,
    private loadService: LoadService,
    private saveService: SaveService,
    private autoSaveService: AutoSaveService,
    private router: Router,
    private downloadService: DownloadService,
    private overwriteGuard: OverwriteGuardService
  ) {}

  ngOnInit(): void {
    this.slots = ([1, 2, 3] as FormatTypeConfig[]).map(i => ({
      index: i,
      data: this.loadService.getSlot(i)
    }));
  }

  selectSlot(index: FormatTypeConfig): void {
    if (this.slots.find(s => s.index === index)?.data === null) return;
    this.selectedSlot = this.selectedSlot === index ? null : index; // toggle
  }

  async editSlot(index: FormatTypeConfig): Promise<void> {
    const save = this.loadService.getSlot(index);
    if (!save) return;

    if (!await this.overwriteGuard.check(0, save.nomEval)) return;

    const step = save.step >= 0 ? save.step : 3;
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
    this.saveService.saveToSlot(0, this.saveService.dataAuto);
    this.autoSaveService.tryResume();
  }

  downloadSlot(slot: { index: FormatTypeConfig; data: saveModel | null }): void {
    console.log('[downloadSlot] slot:', slot);
    if (!slot.data) return;
    this.downloadService.generateSlotZip(slot.data);
  }

  openDeletePopup(slot: { index: FormatTypeConfig; data: saveModel | null }): void {
    const dialogRef = this.dialog.open(PopupDeleteSaveComponent, {
      data: { slotName: slot.data?.nomEval ?? `Slot ${slot.index}` },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.saveService.clearSlot(slot.index);
        this.ngOnInit(); // rafraîchit les slots
        this.selectedSlot = null;
      }
      if (result === 'download' && slot.data) {
        this.downloadService.generateSlotZip(slot.data);
      }
    });
  }

  async newEval(): Promise<void> {
    if (!await this.overwriteGuard.check(0)) return;
    this.saveService.newSaveDataAuto();
    this.router.navigate(['/info-eval']);
  }

  saveLastEval(): void {
    this.saveService.saveToSlot(0, this.saveService.dataAuto);
  }
}
