import {Component, inject, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {DownloadService} from '../../services/download/download.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {
  instructionScreenConstModel,
  screenTypeModel,
  stimuliScreenConstModel,
  transitionScreenConstModel
} from '../../shared/screenModel';
import {I18nService} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/** Point de vigilance affiché avant l'export (non bloquant). */
export interface ExportCheck {
  level: 'warning' | 'info';
  message: string;
}

/**
 * Étape 5 : récapitulatif, vérifications et export.
 *
 * - « Télécharger » produit un `.gpSave` (sauvegarde réimportable dans GazePlay Eval) ;
 * - « Exporter » produit le `.zip` lu par GazePlay-Learning.
 * Les vérifications sont indicatives : elles n'empêchent jamais l'export.
 */
@Component({
  selector: 'app-download-eval',
  imports: [TranslatePipe],
  templateUrl: './download-eval.component.html',
  standalone: true,
  styleUrl: './download-eval.component.css'
})
export class DownloadEvalComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  /** Action en cours (affiche un indicateur et désactive les boutons). */
  busy: 'export' | 'download' | null = null;
  checks: ExportCheck[] = [];

  constructor(private saveService: SaveService,
              private downloadService: DownloadService,
              private router: Router,
              private flashService: FlashService) {
  }

  ngOnInit(): void {
    this.checks = this.computeChecks(this.saveService.dataAuto.listScreens ?? []);
  }

  get evalName(): string {
    return this.saveService.getEvalName();
  }

  get format(): string {
    return this.saveService.dataAuto.format === 'Csv&Xlsx'
      ? this.i18n.t('infoEval.format.both')
      : (this.saveService.dataAuto.format ?? '').toUpperCase();
  }

  get participantFields(): string[] {
    return (this.saveService.dataAuto.infoParticipant ?? []).filter(field => !!field?.trim());
  }

  /** Nombre d'écrans par type, pour le récapitulatif. */
  get screenCounts(): {transition: number, instruction: number, stimuli: number, total: number} {
    const screens = this.saveService.dataAuto.listScreens ?? [];
    return {
      transition: screens.filter(s => s.type === transitionScreenConstModel).length,
      instruction: screens.filter(s => s.type === instructionScreenConstModel).length,
      stimuli: screens.filter(s => s.type === stimuliScreenConstModel).length,
      total: screens.length,
    };
  }

  async goExport(): Promise<void> {
    if (this.busy) return;
    this.busy = 'export';
    try {
      await this.downloadService.generateEvalZip(this.saveService);
      this.flashService.show('success', this.i18n.t('download.export.success'));
    } catch (error) {
      console.error('Export impossible :', error);
      this.flashService.show('error', this.i18n.t('download.export.error'));
    } finally {
      this.busy = null;
    }
  }

  async goDownload(): Promise<void> {
    if (this.busy) return;
    this.busy = 'download';
    try {
      const ok = await this.downloadService.generateSlotZip({
        ...this.saveService.dataAuto,
        createdAt: new Date().toISOString(),
        version: 1
      });
      if (ok === false) {
        this.flashService.show('error', this.i18n.t('download.backup.error'));
      } else {
        this.flashService.show('success', this.i18n.t('download.backup.success'));
      }
    } finally {
      this.busy = null;
    }
  }

  backToCreateEval(){
    this.router.navigate(['/create-eval']);
  }

  /** Détecte les écrans probablement incomplets (l'export reste possible). */
  computeChecks(screens: screenTypeModel[]): ExportCheck[] {
    const checks: ExportCheck[] = [];
    if (screens.length === 0) {
      checks.push({level: 'warning', message: this.i18n.t('download.check.noScreens')});
    }
    if (!this.saveService.dataAuto.nomEval) {
      checks.push({level: 'info', message: this.i18n.t('download.check.noName')});
    }
    screens.forEach((screen, index) => {
      const label = this.i18n.t('download.check.label', {name: screen.name || this.i18n.t('download.check.fallbackName', {n: index + 1})});
      const values = screen.values ?? [];
      if (screen.type === instructionScreenConstModel && values[2] && !values[4]) {
        checks.push({
          level: 'warning',
          message: this.i18n.t(values[3] === 'Texte' ? 'download.check.noText' : 'download.check.noFile', {label}),
        });
      }
      if (screen.type === stimuliScreenConstModel) {
        const cells = Object.values(values[12] ?? {}) as any[];
        const filled = cells.filter(cell => cell && !cell.hidden && (cell.imageName || cell.soundName));
        if (filled.length === 0) {
          checks.push({level: 'warning', message: this.i18n.t('download.check.emptyCells', {label})});
        }
        if (values[9] && !values[10]) {
          checks.push({level: 'warning', message: this.i18n.t('download.check.noScreenSound', {label})});
        }
      }
    });
    return checks;
  }
}
