import { Injectable, signal } from '@angular/core';
import { Flash } from '../../shared/flash.model';

@Injectable({ providedIn: 'root' })
export class FlashService {
  flashs = signal<Flash[]>([]); // liste des flash-messages
  private counter = 0; // compteur pour les ids des messages

  /**
   * Affiche un flash-message en bas à droite du site, avec un contenu, un type, et une durée.
   * @param type le type du flash-message (info, warning, sucess, error).
   * @param message le contenu du flash-message.
   * @param duration la durée d'affichage du flash-message, en ms. Vaut 5s par défaut.
   */
  show(type: Flash['type'] = 'info',message: string, duration = 5000): void {

    const id = this.counter = this.counter + 1;
    this.flashs.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
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
