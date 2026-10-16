import {DOCUMENT, inject, Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';

/**
 * Gestion du focus lors des changements de page (application monopage).
 *
 * Sans cela, après une navigation, le focus clavier reste sur le bouton cliqué (souvent
 * détruit) et les lecteurs d'écran n'annoncent pas le nouveau contenu. À chaque navigation
 * demandée par l'utilisateur, le focus est placé sur le titre principal (`h1`) de la page,
 * ou à défaut sur la zone de contenu `#main-content`.
 *
 * Les navigations qui précèdent toute interaction (chargement, reprise automatique de l'étape
 * au rechargement) ne déplacent pas le focus : la page vient d'être chargée, et un focus
 * programmatique sans interaction préalable est traité comme `:focus-visible` par les
 * navigateurs, ce qui affichait un cadre de focus sur le titre jusqu'au premier clic.
 */
@Injectable({providedIn: 'root'})
export class RouteFocusService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    let userInteracted = false;
    const markInteraction = () => {
      userInteracted = true;
      for (const type of INTERACTION_EVENTS) this.document.removeEventListener(type, markInteraction, true);
    };
    for (const type of INTERACTION_EVENTS) this.document.addEventListener(type, markInteraction, true);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        if (!userInteracted) return;
        // Laisse au nouveau composant le temps d'être rendu.
        setTimeout(() => this.focusMainHeading(), 0);
      });
  }

  /** Place le focus sur le titre principal de la page affichée. */
  focusMainHeading(): void {
    const main = this.document.getElementById('main-content');
    if (!main) return;

    const heading = main.querySelector<HTMLElement>('h1');
    const target = heading ?? main;
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({preventScroll: false});
  }
}

/** Actions de l'utilisateur (souris, toucher, clavier) après lesquelles le focus suit la navigation. */
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'click'] as const;
