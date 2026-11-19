import {AfterViewInit, Component, computed, inject, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {I18nService} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';
import {LEXIQUE_ENTRIES, LexiqueEntry, LexiqueGuideLink} from './lexique-entries';

/** Terme affiché dans la langue courante. */
export interface LexiqueItem {
  id: string;
  term: string;
  definition: string;
  related: {id: string, term: string}[];
  guide?: LexiqueGuideLink;
}

/** Termes regroupés sous une même lettre. */
export interface LexiqueGroup {
  letter: string;
  items: LexiqueItem[];
}

/** Minuscules sans accents, pour le tri, le regroupement et la recherche. */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Lexique : termes employés dans l'application et leur explication.
 *
 * Les termes sont triés et regroupés par lettre dans la langue affichée (« Écran » sous E,
 * « .gpSave » sous G). La recherche porte sur le terme et sur sa définition, sans tenir
 * compte des accents ni des majuscules. Comme le sommaire du guide, les liens vers un terme
 * pointent vers `#/lexique#term-<id>` et le clic fait défiler la page sans navigation.
 *
 * À l'arrivée sur la page, le focus est dans le champ de recherche : par `RouteFocusService`
 * (attribut `data-route-focus`) après une navigation, et ici au chargement direct de la page.
 * Une adresse visant un terme (`#/lexique#term-<id>`) place plutôt le focus sur ce terme.
 */
@Component({
  selector: 'app-lexique',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './lexique.component.html',
  styleUrl: './lexique.component.scss',
})
export class LexiqueComponent implements AfterViewInit {
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute, {optional: true});

  /** Texte saisi dans le champ de recherche. */
  readonly query = signal('');

  /** Tous les termes dans la langue affichée, triés par ordre alphabétique. */
  readonly items = computed<LexiqueItem[]>(() => {
    const language = this.i18n.language() === 'en' ? 'en' : 'fr';
    const termOf = (entry: LexiqueEntry) => entry[language].term;
    const byId = new Map(LEXIQUE_ENTRIES.map(entry => [entry.id, entry]));
    return LEXIQUE_ENTRIES
      .map(entry => ({
        id: entry.id,
        term: termOf(entry),
        definition: entry[language].definition,
        related: (entry.related ?? [])
          .map(id => byId.get(id))
          .filter((related): related is LexiqueEntry => !!related)
          .map(related => ({id: related.id, term: termOf(related)})),
        guide: entry.guide,
      }))
      .sort((a, b) => sortKey(a.term).localeCompare(sortKey(b.term), language));
  });

  /** Termes correspondant à la recherche, regroupés par lettre. */
  readonly groups = computed<LexiqueGroup[]>(() => {
    const query = normalizeForSearch(this.query().trim());
    const groups: LexiqueGroup[] = [];
    for (const item of this.items()) {
      if (query && !normalizeForSearch(`${item.term} ${item.definition}`).includes(query)) continue;
      const letter = sortKey(item.term).charAt(0).toUpperCase() || '#';
      const last = groups[groups.length - 1];
      if (last?.letter === letter) last.items.push(item);
      else groups.push({letter, items: [item]});
    }
    return groups;
  });

  /** Nombre de termes affichés. */
  readonly count = computed(() => this.groups().reduce((total, group) => total + group.items.length, 0));

  ngAfterViewInit(): void {
    const fragment = this.route?.snapshot.fragment;
    if (fragment) {
      // Après le rendu de la page et la remise en haut faite par le routeur.
      setTimeout(() => this.scrollTo(fragment), 100);
      return;
    }
    document.getElementById('lexique-search')?.focus({preventScroll: true});
  }

  onSearch(value: string): void {
    this.query.set(value);
  }

  clearSearch(): void {
    this.query.set('');
    document.getElementById('lexique-search')?.focus();
  }

  hrefFor(anchor: string): string {
    return `#/lexique#${anchor}`;
  }

  guideHref(link: LexiqueGuideLink): string {
    const page = link.page ? `/guide/${link.page}` : '/guide';
    return link.section ? `#${page}#${link.section}` : `#${page}`;
  }

  /** Lien vers une lettre ou un terme : défilement sans changer de route. */
  goTo(event: Event, anchor: string): void {
    event.preventDefault();
    if (document.getElementById(anchor)) {
      this.scrollTo(anchor);
      return;
    }
    // Terme masqué par la recherche : on l'affiche avant d'y aller.
    this.query.set('');
    setTimeout(() => this.scrollTo(anchor));
  }

  /**
   * Fait défiler jusqu'à l'élément `id` puis lui donne le focus (sans second défilement),
   * instantanément si l'utilisateur a demandé des animations réduites.
   * @returns `false` si l'élément n'existe pas.
   */
  scrollTo(id: string): boolean {
    const target = document.getElementById(id);
    if (!target) return false;
    const reduceMotion = document.documentElement.getAttribute('data-motion') === 'reduce'
      || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block: 'start'});
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({preventScroll: true});
    return true;
  }
}

/** Clé de tri : sans accents ni ponctuation initiale (« .gpSave » est rangé sous G). */
function sortKey(term: string): string {
  return normalizeForSearch(term).replace(/^[^a-z0-9]+/, '');
}
