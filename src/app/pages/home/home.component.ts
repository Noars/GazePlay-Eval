import {Component, inject, OnInit} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {SaveService} from '../../services/save/save.service';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {LoadService} from '../../services/load/load.service';
import {ImportFlowService} from '../../services/import-flow/import-flow.service';
import {saveModel} from '../../shared/saveModel';
import {STEP_LABEL_KEYS} from '../../shared/stepRoute.model';
import {I18nService} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';
import {ExclusiveAction} from '../../shared/exclusive-action';

/**
 * Page d'accueil : démarrer une nouvelle évaluation, reprendre l'évaluation en cours,
 * ou accéder aux sauvegardes, au chargement, à l'import et au guide.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, TranslatePipe],
  templateUrl: './home.component.html',
  standalone: true,
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly saveService = inject(SaveService);
  private readonly autoSaveService = inject(AutoSaveService);
  protected readonly loadService = inject(LoadService);
  private readonly overwriteGuard = inject(OverwriteGuardService);
  private readonly importFlow = inject(ImportFlowService);
  private readonly i18n = inject(I18nService);

  /** Un double clic sur « Nouvelle évaluation » n'ouvre pas deux fois la fenêtre de remplacement. */
  private readonly newEvalAction = new ExclusiveAction();

  /** Évaluation en cours (slot 0), lue à l'affichage de la page. */
  currentEval: saveModel | null = null;

  ngOnInit(): void {
    this.currentEval = this.loadService.getSlot(0);
  }

  goToInfoEval(): Promise<void> {
    return this.newEvalAction.run(async () => {
      if (!await this.overwriteGuard.check(0)) return;
      this.saveService.newSaveDataAuto();
      this.router.navigate(['/info-eval']);
    });
  }

  async goToLastStep(): Promise<void> {
    this.autoSaveService.tryResume(false);
  }

  openImport(): void {
    void this.importFlow.start();
  }

  /** Libellé de l'étape où l'utilisateur s'est arrêté. */
  currentStepLabel(): string {
    const step = this.currentEval?.step ?? -1;
    const key = STEP_LABEL_KEYS[step];
    return key ? this.i18n.t(key) : '';
  }
}
