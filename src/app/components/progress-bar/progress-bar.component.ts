import {Component, inject, Input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {STEP_TO_ROUTE} from '../../shared/stepRoute.model';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Indicateur des étapes du parcours de création.
 *
 * Les étapes déjà franchies sont des liens (retour en arrière possible) ; l'étape courante
 * est signalée par `aria-current="step"`. Sur petit écran, seule l'étape courante est
 * détaillée (« Étape 2 sur 5 ») avec une barre de progression.
 */
@Component({
  selector: 'app-progress-bar',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './progress-bar.component.html',
  standalone: true,
  styleUrl: './progress-bar.component.scss'
})
export class ProgressBarComponent {
  private readonly saveService = inject(SaveService);

  @Input() steps: string[] = [];
  @Input() currentStepIndex = 0;

  getEvalName(): string {
    return this.saveService.getEvalName();
  }

  routeFor(index: number): string {
    return STEP_TO_ROUTE[index];
  }

  get progressPercent(): number {
    if (this.steps.length <= 1) return 100;
    return Math.round((this.currentStepIndex / (this.steps.length - 1)) * 100);
  }
}
