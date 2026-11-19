import {RouterLink} from '@angular/router';
import {Component, inject} from '@angular/core';
import {I18nService} from '../../../core/i18n/i18n.service';
import {GuideTocComponent} from '../guide-toc/guide-toc.component';

/** Guide « Questions fréquentes et dépannage » : que faire face aux messages d'erreur courants. */
@Component({
  selector: 'app-guide-depannage',
  standalone: true,
  imports: [RouterLink, GuideTocComponent],
  templateUrl: './guide-depannage.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideDepannageComponent {
  /** Langue affichée : choisit la version du texte du guide. */
  protected readonly language = inject(I18nService).language;
}
