import {RouterLink} from '@angular/router';
import {Component} from '@angular/core';
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
  constructor(private importFlow: ImportFlowService) {}

  /** Ouvre la fenêtre d'import (même parcours que depuis le menu). */
  openImportPopup(): Promise<boolean> {
    return this.importFlow.start();
  }
}
