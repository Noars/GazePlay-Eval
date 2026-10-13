import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import {provideRouter, TitleStrategy, withHashLocation, withInMemoryScrolling} from '@angular/router';

import {routes} from './app.routes';
import {UserPreferencesService} from './core/preferences/user-preferences.service';
import {AppTitleStrategy} from './core/a11y/app-title.strategy';
import {PREFERENCES_DB_BLOCKED_HANDLER} from './core/preferences/preferences.store';
import {StorageNoticeService} from './core/storage/storage-notice.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes, withHashLocation(), withInMemoryScrolling({scrollPositionRestoration: 'top'})),
    {provide: TitleStrategy, useClass: AppTitleStrategy},
    {
      // Signale à l'utilisateur qu'un ancien onglet bloque la mise à jour de la base locale.
      provide: PREFERENCES_DB_BLOCKED_HANDLER,
      useFactory: () => {
        const notices = inject(StorageNoticeService);
        return () => notices.upgradeBlocked.set(true);
      },
    },
    // Les préférences d'affichage sont chargées depuis IndexedDB avant le premier rendu.
    provideAppInitializer(() => inject(UserPreferencesService).init()),
  ]
};
