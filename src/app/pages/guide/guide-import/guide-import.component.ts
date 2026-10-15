import {RouterLink} from '@angular/router';
import {Component, inject} from '@angular/core';
import {I18nService} from '../../../core/i18n/i18n.service';
import {ImportFlowService} from '../../../services/import-flow/import-flow.service';

/**
 * Guide « Importation », avec un accès direct à la fenêtre d'import.
 */
@Component({
  selector: 'app-guide-import',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './guide-import.component.html',
  styleUrl: '../guide.component.css'
})
export class GuideImportComponent {
  /** Langue affichée : choisit la version du texte du guide. */
  protected readonly language = inject(I18nService).language;
  constructor(private importFlow: ImportFlowService) {}

  /** Ouvre la fenêtre d'import (même parcours que depuis le menu). */
  openImportPopup(): Promise<boolean> {
    return this.importFlow.start();
  }
}
