import {inject, Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';

export const APP_NAME = 'GazePlay Eval';

/**
 * Donne à chaque page un titre de document unique (« Page — GazePlay Eval »),
 * annoncé par les lecteurs d'écran à chaque navigation (WCAG 2.4.2).
 * Le titre de chaque page est déclaré dans `app.routes.ts` (propriété `title`).
 */
@Injectable({providedIn: 'root'})
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot);
    this.title.setTitle(pageTitle ? `${pageTitle} — ${APP_NAME}` : APP_NAME);
  }
}
