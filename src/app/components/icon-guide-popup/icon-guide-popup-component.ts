import {Component} from '@angular/core';
import {GuidePopupComponent} from '../guide-popup/guide-popup-component';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Bouton « Aide » de l'en-tête : ouvre le guide correspondant à la page affichée.
 */
@Component({
  selector: 'app-icon-guide-popup',
  standalone: true,
  imports: [GuidePopupComponent, TranslatePipe],
  templateUrl: './icon-guide-popup-component.html',
  styleUrl: './icon-guide-popup-component.scss',
})
export class IconGuidePopupComponent {
  isGuideOpen = false;

  openGuide(): void {
    this.isGuideOpen = true;
  }

  closeGuide(): void {
    this.isGuideOpen = false;
  }
}
