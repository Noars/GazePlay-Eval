import {Component} from '@angular/core';
import { FlashService } from '../../services/flash-message/flash.service';

@Component({
  selector: 'app-flash',
  templateUrl: './flash.component.html',
  styleUrl: './flash.component.css'
})
export class FlashComponent {
  constructor(public flashService: FlashService) {
  }

  /**
   * Renvoie le nom normalisé du type du flash-message. Cette méthode n'est actuellement pas très
   * pertinente car les types sont déjà normalisés, mais elle peut servir en cas d'ajout d'autres types,
   * pour plus de lisibilité.
   * @param type le type du flash-message
   * @return le nom normalisé du type
   */
  mapType(type: string): string {
    const map: Record<string, string> = {
      success: 'success',
      error:   'danger',
      info:    'info',
      warning: 'warning'
    };
    return map[type] ?? 'info';
  }

  /**
   * Renvoie la description Bootstrap de l'icône en fonction du type de message
   * @param type le type du flash-message
   * @return un icône utilisable par Boostrap
   */
  mapIcon(type: string): string {
    const map: Record<string, string> = {
      success: 'bi-check-circle',
      error:   'bi-x-circle',
      info:    'bi-info-circle',
      warning: 'bi-exclamation-triangle'
    };
    return map[type] ?? 'bi-info-circle';
  }
}
