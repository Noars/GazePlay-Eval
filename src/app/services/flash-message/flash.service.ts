import {inject, Injectable, signal} from '@angular/core';
import {Flash} from '../../shared/flash.model';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';

/**
 * Notifications temporaires affichées en bas de l'écran.
 *
 * La durée par défaut provient des préférences utilisateur (`messageDuration`, en
 * secondes) ; une durée de 0 désactive les notifications non critiques. Les messages
 * d'erreur restent affichés au moins 8 secondes pour laisser le temps de les lire.
 */
@Injectable({providedIn: 'root'})
export class FlashService {
  private readonly preferences = inject(UserPreferencesService);

  /** Liste des notifications visibles. */
  flashs = signal<Flash[]>([]);
  private counter = 0;
  private readonly minimumErrorDuration = 8000;
  /** Nombre maximal de notifications affichées simultanément. */
  private readonly maxVisible = 3;

  /** Durée par défaut, en secondes. */
  getDefaultDuration(): number {
    return this.preferences.preferences().messageDuration;
  }

  /**
   * Modifie la durée par défaut des notifications (enregistrée dans les préférences).
   * @param durationMs durée en millisecondes.
   */
  setDefaultDuration(durationMs: number): void {
    void this.preferences.update({messageDuration: durationMs / 1000});
  }

  /**
   * Affiche une notification.
   * @param type le type de notification (info, warning, success, error).
   * @param message le contenu de la notification.
   * @param duration la durée d'affichage en ms ; par défaut celle des préférences.
   */
  show(type: Flash['type'] = 'info', message: string, duration?: number): void {
    let d = duration ?? this.getDefaultDuration() * 1000;
    if (type === 'error') {
      d = Math.max(d, this.minimumErrorDuration);
    }
    if (d <= 0) {
      return;
    }
    const id = this.counter++;
    this.flashs.update(f => {
      // Un message identique déjà affiché est remplacé (évite l'empilement, par exemple
      // de « modifications enregistrées » à chaque étape), et la pile est limitée.
      const others = f.filter(flash => !(flash.message === message && flash.type === type));
      return [...others, {id, message, type}].slice(-this.maxVisible);
    });
    setTimeout(() => this.remove(id), d);
  }

  /**
   * Retire une notification (fermeture manuelle ou expiration), après une courte
   * animation de disparition.
   * @param id l'identifiant unique de la notification.
   */
  remove(id: number): void {
    this.flashs.update(f =>
      f.map(flash => flash.id === id ? {...flash, fadingOut: true} : flash)
    );
    setTimeout(() => {
      this.flashs.update(f => f.filter(flash => flash.id !== id));
    }, 300);
  }
}
