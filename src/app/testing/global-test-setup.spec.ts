import {TAB_KEYS} from '../core/tab/tab-session.service';

/**
 * Hooks globaux (hors de tout `describe`, donc appliqués à tous les tests) : l'évaluation en
 * cours et le lien de l'onglet sont dans le vrai sessionStorage, qui n'est pas vidé entre les
 * tests comme localStorage l'est par chaque fichier. Sans ce nettoyage, l'état d'un test
 * fuirait dans le suivant.
 */
function clearTabState(): void {
  for (const key of Object.values(TAB_KEYS)) {
    sessionStorage.removeItem(key);
  }
}

beforeEach(clearTabState);
afterEach(clearTabState);
