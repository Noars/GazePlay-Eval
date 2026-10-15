import {RouterLink} from '@angular/router';
import {Component, inject} from '@angular/core';
import {I18nService} from '../../../core/i18n/i18n.service';
import {GuideTocComponent} from '../guide-toc/guide-toc.component';

/** Sommaire du guide : présentation, découverte de l'interface et accès aux pages du guide. */
@Component({
  selector: 'app-guide-home',
  standalone: true,
  imports: [RouterLink, GuideTocComponent],
  templateUrl: './guide-home.component.html',
  styleUrl: '../guide.component.css',

})
export class GuideHomeComponent {
  /** Langue affichée : choisit la version du texte du guide. */
  protected readonly language = inject(I18nService).language;
}
