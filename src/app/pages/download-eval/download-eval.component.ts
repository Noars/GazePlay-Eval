import {Component, OnInit} from '@angular/core';
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
  imports: [],
  templateUrl: './download-eval.component.html',
  standalone: true,
  styleUrl: './download-eval.component.css'
})
export class DownloadEvalComponent implements OnInit {

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
    return this.saveService.dataAuto.format === 'Csv&Xlsx' ? 'CSV et XLSX' : (this.saveService.dataAuto.format ?? '').toUpperCase();
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
      this.flashService.show('success', 'Le fichier .zip pour GazePlay-Learning a été généré.');
    } catch (error) {
      console.error('Export impossible :', error);
      this.flashService.show('error', 'L\'export a échoué. Vérifiez que les médias de l\'évaluation sont toujours disponibles, puis réessayez.');
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
        this.flashService.show('error', 'Le téléchargement du fichier .gpSave a échoué.');
      } else {
        this.flashService.show('success', 'Le fichier .gpSave a été généré.');
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
      checks.push({level: 'warning', message: 'L\'évaluation ne contient aucun écran.'});
    }
    if (!this.saveService.dataAuto.nomEval) {
      checks.push({level: 'info', message: 'L\'évaluation n\'a pas de nom : les fichiers s\'appelleront « Nouvelle Evaluation ».'});
    }
    screens.forEach((screen, index) => {
      const label = `« ${screen.name || 'Écran ' + (index + 1)} »`;
      const values = screen.values ?? [];
      if (screen.type === instructionScreenConstModel && values[2] && !values[4]) {
        checks.push({
          level: 'warning',
          message: `${label} : un média est prévu mais ${values[3] === 'Texte' ? 'aucun texte n\'est saisi' : 'aucun fichier n\'est choisi'}.`,
        });
      }
      if (screen.type === stimuliScreenConstModel) {
        const cells = Object.values(values[12] ?? {}) as any[];
        const filled = cells.filter(cell => cell && !cell.hidden && (cell.imageName || cell.soundName));
        if (filled.length === 0) {
          checks.push({level: 'warning', message: `${label} : aucune case ne contient d'image ou de son.`});
        }
        if (values[9] && !values[10]) {
          checks.push({level: 'warning', message: `${label} : le son de l'écran est activé mais aucun fichier n'est choisi.`});
        }
      }
    });
    return checks;
  }
}
