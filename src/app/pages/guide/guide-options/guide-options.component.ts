import {RouterLink} from '@angular/router';
import {Component, inject} from '@angular/core';
import {I18nService} from '../../../core/i18n/i18n.service';
import {GuideTocComponent} from '../guide-toc/guide-toc.component';

/** Guide « Options et accessibilité » : réglages d'affichage, stockage des médias et usage au clavier. */
@Component({
  selector: 'app-guide-options',
  standalone: true,
  imports: [RouterLink, GuideTocComponent],
  templateUrl: './guide-options.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideOptionsComponent {
  /** Langue affichée : choisit la version du texte du guide. */
  protected readonly language = inject(I18nService).language;
}
