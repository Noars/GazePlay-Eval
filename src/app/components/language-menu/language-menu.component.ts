import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
  ViewChild
} from '@angular/core';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {LANGUAGES, LanguagePreference} from '../../core/preferences/user-preferences.model';
import {I18nService, TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Sélecteur de langue de l'en-tête : un bouton affichant la langue en cours (« FR ») ouvre
 * une liste de toutes les langues disponibles (`LANGUAGES`). Ajouter une langue à cette
 * liste (avec son dictionnaire et sa clé `language.xx`) suffit à la proposer ici.
 *
 * Motif « bouton de menu » (WAI-ARIA) : `aria-haspopup` / `aria-expanded`, éléments
 * `menuitemradio` cochés selon la langue courante, flèches / Début / Fin pour se déplacer,
 * Échap pour fermer en rendant le focus au bouton, Tab ou clic extérieur pour fermer.
 */
@Component({
  selector: 'app-language-menu',
  imports: [TranslatePipe],
  templateUrl: './language-menu.component.html',
  styleUrl: './language-menu.component.scss',
})
export class LanguageMenuComponent {
  private readonly preferences = inject(UserPreferencesService);
  private readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;

  readonly languages = LANGUAGES;
  readonly current = this.i18n.language;
  readonly isOpen = signal(false);

  /** Nom de la langue courante, écrit dans cette langue (« Français », « English »). */
  readonly currentName = computed(() => this.i18n.t(this.nameKey(this.current())));

  /** Clé du nom d'une langue (chaque nom est écrit dans sa propre langue). */
  nameKey(language: LanguagePreference): TranslationKey {
    return `language.${language}` as const;
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close(false);
    } else {
      this.open(this.languages.indexOf(this.current()));
    }
  }

  /** Ouvre la liste et place le focus sur l'élément d'index donné. */
  open(focusIndex: number): void {
    this.isOpen.set(true);
    // Après le rendu : avec la coalescence des événements, la liste n'est pas encore visible ici.
    afterNextRender(() => this.focusItem(focusIndex), {injector: this.injector});
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    if (restoreFocus) {
      this.trigger?.nativeElement.focus();
    }
  }

  /** Choisit une langue : appliquée immédiatement et enregistrée dans les préférences. */
  select(language: LanguagePreference): void {
    this.close(true);
    if (language !== this.current()) {
      void this.preferences.setLanguage(language);
    }
  }

  /** Flèche bas / haut sur le bouton : ouvre la liste sur la première / dernière langue. */
  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open(event.key === 'ArrowDown' ? 0 : this.languages.length - 1);
    }
  }

  onMenuKeydown(event: KeyboardEvent, index: number): void {
    const last = this.languages.length - 1;
    const target: Record<string, number> = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    if (event.key in target) {
      event.preventDefault();
      this.focusItem(target[event.key]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
    } else if (event.key === 'Tab') {
      this.close(false);
    }
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  private focusItem(index: number): void {
    const items = this.host.nativeElement.querySelectorAll('[role="menuitemradio"]') as NodeListOf<HTMLElement>;
    items[Math.max(0, index)]?.focus();
  }
}
