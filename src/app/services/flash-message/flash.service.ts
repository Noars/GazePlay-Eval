import { Injectable, signal } from '@angular/core';
import { Flash } from '../../shared/flash.model';
import { OptionService } from '../options/option-service';
import {optionsModel} from '../../shared/optionsModel';

@Injectable({ providedIn: 'root' })
export class FlashService {
  flashs = signal<Flash[]>([]); // liste des flash-messages
  private counter = 0; // compteur pour les ids des messages
  private defaultDuration: number = 5000

  constructor(
    private optionService: OptionService,
  )
  {
    try {
      let options = this.optionService.getOptions();
      if (options?.flashDuration) {
        this.setDefaultDuration(options.flashDuration * 1000);
      }
    } catch { }
  }

  getDefaultDuration(): number {
    return this.defaultDuration / 1000; // en secondes
  }

  setDefaultDuration(durationMs: number): void {
    this.defaultDuration = durationMs;
  }

  /**
   * Affiche un flash-message en bas à droite du site, avec un contenu, un type, et une durée.
   * @param type le type du flash-message (info, warning, sucess, error).
   * @param message le contenu du flash-message.
   * @param duration la durée d'affichage du flash-message, en ms.
   */
  show(type: Flash['type'] = 'info', message: string, duration?: number): void {
    const id = this.counter++;
    const d = duration ?? this.defaultDuration; // on utilise la durée par défaut si pas spécifiée
    if (d <= 0) {
      return ;
    }
    this.flashs.update(f => [...f, { id, message, type }]);
    setTimeout(() => this.remove(id), d);
  }

  /**
   * Récupère la durée des flash messages enregistré dans les options.
   *
   * @returns la durée en millisecondes, ou 5000 ms si la valeur n'a pas été trouvée.
   */
  private getTimeout(): number {

    let options: optionsModel | null = this.optionService.getOptions();
    if (options !== null) {
      return options?.flashDuration as number;
    } else {
      return 5000;
    }

  }

  /**
   * Supprime le flash message à partir de l'id.
   *
   * *Note : Cette méthode ne devrait pas être normalement appelé dans d'autres parties du code,
   * car la méthode show() gère déjà la suppression automatique une fois que la durée est écoulée.*
   * @param id l'identifiant unique du flash-message.
   */
  remove(id: number): void {
    this.flashs.update(f =>
      f.map(flash => flash.id === id ? { ...flash, fadingOut: true } : flash)
    );
    setTimeout(() => {
      this.flashs.update(f => f.filter(flash => flash.id !== id));
    }, 300);
  }
}
