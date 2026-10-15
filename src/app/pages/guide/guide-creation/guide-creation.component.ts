import {RouterLink} from '@angular/router';
import {Component, inject, Input, OnChanges} from '@angular/core';
import {I18nService} from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-guide-creation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './guide-creation.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideCreationComponent implements OnChanges {
  /** Langue affichée : choisit la version du texte du guide. */
  protected readonly language = inject(I18nService).language;

  @Input() sectionId: string = '';

  ngOnChanges(): void {
    if (this.sectionId) {
      setTimeout(() => {
        const target = document.getElementById(this.sectionId);
        if (!target) return;

        const scrollContainer = target.closest('.guide-popup-body') as HTMLElement;
        if (scrollContainer) {
          const offset = target.offsetTop - scrollContainer.offsetTop;
          // Scroll jusqu'à la bonne partie du guide
          scrollContainer.scrollTo({ top: offset, behavior: 'smooth' });
        } else {
          // on affiche tout en haut
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
    }
  }
}

