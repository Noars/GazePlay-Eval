import {AfterViewInit, Component, inject, Input} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

/** Entrée du sommaire : identifiant de la section visée et texte du lien. */
export interface GuideTocItem {
  id: string;
  label: string;
}

/**
 * Sommaire « Sur cette page » d'une page du guide.
 *
 * Avec le routage par hash, un lien `href="#section"` serait lu comme une route : chaque lien
 * pointe donc vers `#/guide/<page>#section` (utilisable dans un nouvel onglet) et le clic,
 * intercepté, fait défiler la page jusqu'à la section sans navigation (une navigation
 * ramènerait la page en haut), puis y place le focus pour le clavier et les lecteurs d'écran.
 * Un fragment présent à l'ouverture de la page est aussi pris en compte.
 */
@Component({
  selector: 'app-guide-toc',
  standalone: true,
  templateUrl: './guide-toc.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideTocComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute, {optional: true});

  /** Titre visible du sommaire (dans la langue de la page). */
  @Input() title = '';
  /** Route de la page du guide, par exemple `/guide/creation`. */
  @Input() page = '/guide';
  @Input() items: GuideTocItem[] = [];

  hrefFor(id: string): string {
    return `#${this.page}#${id}`;
  }

  ngAfterViewInit(): void {
    const fragment = this.route?.snapshot.fragment;
    if (fragment && this.items.some(item => item.id === fragment)) {
      // Après le rendu de la page et la remise en haut faite par le routeur.
      setTimeout(() => this.scrollToSection(fragment), 100);
    }
  }

  /** Clic sur un lien : défilement jusqu'à la section sans changer de route. */
  goTo(event: Event, id: string): void {
    event.preventDefault();
    this.scrollToSection(id);
  }

  /**
   * Fait défiler jusqu'à la section `id` puis lui donne le focus (sans second défilement).
   * Le défilement est instantané si l'utilisateur a demandé des animations réduites.
   * @returns `false` si la section n'existe pas.
   */
  scrollToSection(id: string): boolean {
    const target = document.getElementById(id);
    if (!target) return false;

    const reduceMotion = document.documentElement.getAttribute('data-motion') === 'reduce'
      || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});

    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({preventScroll: true});
    return true;
  }
}
