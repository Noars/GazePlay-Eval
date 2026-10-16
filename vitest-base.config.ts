import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';

/**
 * Configuration complémentaire de Vitest pour `ng test` (lue et fusionnée par Angular).
 *
 * Les tests s'exécutent dans un vrai navigateur (IndexedDB, Web Locks, mise en page réelles),
 * piloté par Playwright : le Google Chrome installé sur la machine, ou le navigateur Chromium
 * indiqué par `CHROME_BIN` (Edge par exemple). Aucun navigateur n'est téléchargé.
 */
export default defineConfig({
  test: {
    // Comme avec Jasmine, chaque espion `vi.spyOn` est retiré à la fin de son test : tous les
    // fichiers de test partagent la même page, un espion sur `console`, `document` ou `URL`
    // déborderait sinon sur les tests suivants.
    restoreMocks: true,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: process.env['CHROME_BIN']
          ? {executablePath: process.env['CHROME_BIN']}
          : {channel: 'chrome'},
        // Suit le thème du système (`prefers-color-scheme`), comme le fait Angular par défaut.
        contextOptions: {colorScheme: null},
      }),
      instances: [{browser: 'chromium'}],
      // Même taille que la fenêtre de Chrome sans interface utilisée auparavant avec Karma.
      viewport: {width: 800, height: 600},
      // Pas de capture d'écran des échecs dans les dossiers sources (__screenshots__).
      screenshotFailures: false,
    },
  },
});
