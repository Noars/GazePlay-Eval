import {DOCUMENT, inject, Injectable} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';

/**
 * Gestion du focus lors des changements de page (application monopage).
 *
 * Sans cela, après une navigation, le focus clavier reste sur le bouton cliqué (souvent
 * détruit) et les lecteurs d'écran n'annoncent pas le nouveau contenu. À chaque navigation
 * (sauf la première), le focus est placé sur le titre principal (`h1`) de la page, ou à
 * défaut sur la zone de contenu `#main-content`.
 */
@Injectable({providedIn: 'root'})
export class RouteFocusService {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    let isFirstNavigation = true;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        if (isFirstNavigation) {
          isFirstNavigation = false;
          return;
        }
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
