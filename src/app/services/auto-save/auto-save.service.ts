import {inject, Injectable, OnDestroy} from '@angular/core';
import {Event, NavigationStart, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {SaveService} from '../save/save.service';
import {FlashService} from '../flash-message/flash.service';
import {LoadService} from '../load/load.service';
import {ROUTE_TO_STEP, STEP_TO_ROUTE} from '../../shared/stepRoute.model';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {I18nService} from '../../core/i18n/i18n.service';

/**
 * Sauvegarde automatique de l'évaluation en cours (slot 0, et emplacement nommé actif).
 *
 * Déclenchée à chaque navigation vers une étape du parcours de création, et appelée
 * directement par l'éditeur avec des pseudo-routes (`stimuli`, `instruction`,
 * `backToScreenList`, voir `ROUTE_TO_STEP`). Les autres pages (accueil, sauvegardes,
 * options, guide…) ne déclenchent pas de sauvegarde.
 */
@Injectable({providedIn: 'root'})
export class AutoSaveService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly saveService = inject(SaveService);
  private readonly flashService = inject(FlashService);
  private readonly loadService = inject(LoadService);
  private readonly mediaCleanup = inject(MediaCleanupService);
  private readonly i18n = inject(I18nService);

  private subscription?: Subscription;
  private isResuming = false; // vrai pendant la restauration d'une session

  init(): void {
    if (this.subscription) return;
    this.subscription = this.router.events.pipe(
      filter((event: Event): event is NavigationStart => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (!this.isResuming) {
        this.autoSave(event.url);
      }
    });
  }

  /**
   * Sauvegarde l'évaluation courante dans le localStorage et mémorise l'étape atteinte
   * pour pouvoir y revenir au rechargement.
   *
   * @param targetUrl l'URL (ou pseudo-route) de la page concernée.
   */
  public autoSave(targetUrl: string): void {
    // Nettoyage de l'URL : sans le premier « / » ni les paramètres.
    const pageActuelle = targetUrl.split('?')[0].replace(/^\//, '');

    // Seules les étapes du parcours (et leurs sous-pages) sont sauvegardées.
    if (!Object.hasOwn(ROUTE_TO_STEP, pageActuelle)) return;

    const previousName = this.loadService.getSlot(0)?.nomEval;

    try {
      this.saveService.dataAuto.step = ROUTE_TO_STEP[pageActuelle];
      this.saveService.saveToSlot(0, this.saveService.dataAuto);
      // Un modèle vide (page ouverte sans reprise) n'est jamais recopié dans un emplacement.
      if (this.saveService.activeSlotIndex !== null && this.saveService.hasLoadedWorkspace) {
        this.saveService.saveToSlot(this.saveService.activeSlotIndex, this.saveService.dataAuto);
      }
      this.flashService.show('info', this.i18n.t('autoSave.saved'));
    } catch (e) {
      console.error('Sauvegarde automatique impossible :', e);
      this.flashService.show('error', this.i18n.t('autoSave.error'));
      return;
    }

    // Après un renommage, les médias de l'ancien nom qui ne servent plus à aucune
    // sauvegarde sont libérés (les médias encore référencés sont conservés).
    if (previousName && previousName !== this.saveService.dataAuto.nomEval) {
      this.mediaCleanup.cleanupProject(previousName).catch(error =>
        console.warn('Nettoyage des médias ignoré :', error));
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Ramène l'utilisateur à l'étape de l'évaluation enregistrée dans le slot 0
   * (ou au début du parcours si `resumeFromStart`).
   *
   * Ne fait rien s'il n'y a pas de sauvegarde ; affiche une erreur si l'étape est invalide.
   */
  tryResume(resumeFromStart: boolean): void {
    const save = this.loadService.getSlot(0);
    if (!save) {
      return;
    }

    if (save.step === -1) {
      this.flashService.show('error', this.i18n.t('autoSave.resumeError'));
      return;
    }

    const route = resumeFromStart ? STEP_TO_ROUTE[0] : STEP_TO_ROUTE[save.step];
    if (!route) return;

    this.saveService.loadIntoWorkspace(save);

    this.isResuming = true;
    this.router.navigate([route]).finally(() => {
      this.isResuming = false;
    });
  }
}
