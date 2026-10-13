import {ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, Input, signal} from '@angular/core';
import {uniqueId} from '../unique-id';

/**
 * Aide contextuelle « ⓘ » (motif *toggletip*).
 *
 * Remplace les anciennes icônes d'information à survoler, inaccessibles au clavier et au
 * tactile : ici un vrai bouton ouvre/ferme une bulle de texte, annoncée par les lecteurs
 * d'écran (région `status`). La bulle se ferme avec Échap ou en cliquant ailleurs.
 */
@Component({
  selector: 'app-help-tip',
  templateUrl: './help-tip.component.html',
  styleUrl: './help-tip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpTipComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Contenu de l'aide (les retours à la ligne sont conservés). */
  @Input({required: true}) text = '';
  /** Sujet de l'aide, utilisé dans le nom accessible du bouton (« Aide : … »). */
  @Input() topic = '';

  protected readonly open = signal(false);
  protected readonly bubbleId = uniqueId('help');

  protected toggle(): void {
    this.open.update(value => !value);
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
