import {effect, inject, Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';
import {I18nService, TranslationKey} from '../i18n/i18n.service';

export const APP_NAME = 'GazePlay Eval';

/**
 * Donne à chaque page un titre de document unique (« Page — GazePlay Eval »),
 * annoncé par les lecteurs d'écran à chaque navigation (WCAG 2.4.2).
 * Le titre de chaque page est déclaré dans `app.routes.ts` (propriété `title`) sous forme
 * de clé de traduction ; il est retraduit lorsque la langue de l'interface change.
 */
@Injectable({providedIn: 'root'})
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private pageTitleKey: string | undefined;

  constructor() {
    super();
    effect(() => {
      this.i18n.language();
      this.render();
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pageTitleKey = this.buildTitle(snapshot);
    this.render();
  }

  private render(): void {
    const pageTitle = this.pageTitleKey ? this.i18n.t(this.pageTitleKey as TranslationKey) : '';
    this.title.setTitle(pageTitle ? `${pageTitle} — ${APP_NAME}` : APP_NAME);
  }
}
