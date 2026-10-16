/**
 * Empêche de relancer une action asynchrone tant que la précédente n'est pas terminée.
 *
 * Sert aux actions sur les emplacements (ouvrir, enregistrer, supprimer…) : un double clic
 * lançait deux réservations concurrentes du même emplacement ; la seconde échouait sur le
 * verrou pris par la première et affichait à tort « emplacement ouvert dans un autre onglet ».
 */
export class ExclusiveAction {
  private running = false;

  /** Vrai pendant l'exécution d'une action. */
  get busy(): boolean {
    return this.running;
  }

  /** Exécute `action`, sauf si une action est déjà en cours (le second appel est ignoré). */
  async run(action: () => Promise<void>): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await action();
    } finally {
      this.running = false;
    }
  }
}
