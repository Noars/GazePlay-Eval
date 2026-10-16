import {Component, computed, inject, OnInit, ViewChild} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs';
import {NavbarComponent} from './components/navbar/navbar.component';
import {ProgressBarComponent} from './components/progress-bar/progress-bar.component';
import {FlashComponent} from './components/flash-message/flash.component';
import {MenuComponent} from './components/menu/menu.component';
import {AutoSaveService} from './services/auto-save/auto-save.service';
import {RouteFocusService} from './core/a11y/route-focus.service';
import {StorageNoticeService} from './core/storage/storage-notice.service';
import {STEP_LABEL_KEYS, STEP_TO_ROUTE} from './shared/stepRoute.model';
import {I18nService} from './core/i18n/i18n.service';
import {TranslatePipe} from './core/i18n/translate.pipe';
import {TabSessionService} from './core/tab/tab-session.service';
import {FlashService} from './services/flash-message/flash.service';

/**
 * Composant racine : structure de l'application (en-tête, navigation, contenu, pied de page).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ProgressBarComponent, FlashComponent, MenuComponent, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly router = inject(Router);
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly routeFocus = inject(RouteFocusService);
  protected readonly storageNotices = inject(StorageNoticeService);
  private readonly i18n = inject(I18nService);
  private readonly tabSession = inject(TabSessionService);
  private readonly flash = inject(FlashService);

  @ViewChild('drawerMenu') private drawerMenu?: MenuComponent;

  protected title = 'GazePlay-Eval';

  /** Libellés des étapes, dans la langue courante. */
  readonly steps = computed(() => STEP_LABEL_KEYS.map(key => this.i18n.t(key)));

  /** Étape du parcours affichée (0 à 4), ou -1 hors du parcours de création. */
  currentStepIndex = -1;

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      const path = event.urlAfterRedirects.split('?')[0];
      const step = Object.entries(STEP_TO_ROUTE).find(([, route]) => route === path);
      this.currentStepIndex = step ? Number(step[0]) : -1;
    });
  }

  ngOnInit(): void {
    this.autoSaveService.init(); // sauvegarde automatique à chaque étape
    this.routeFocus.start();     // focus sur le titre de la page après chaque navigation
    this.showTabNotice();

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === 'reload';

    // Au rechargement d'une étape du parcours, on repasse par l'accueil puis on ramène
    // l'utilisateur à l'étape où il s'était arrêté. Sur toute autre page (accueil, options,
    // guide, sauvegardes…), il y reste : l'évaluation de l'onglet est déjà rechargée par
    // SaveService, indépendamment de la page affichée.
    if (isReload && isStepPath(this.reloadedPath())) {
      this.router.navigate(['/home']).then(() => {
        this.autoSaveService.tryResume(false);
      });
    }
  }

  /** Chemin de la page rechargée, lu dans l'adresse (routage par hash : `#/option?…`). */
  protected reloadedPath(): string {
    return globalThis.location?.hash.replace(/^#/, '').split('?')[0] ?? '';
  }

  /**
   * Message de démarrage de l'onglet (voir TabSessionService) : onglet dupliqué, évaluation
   * déjà ouverte dans un autre onglet, ou emplacement lié repris par un autre onglet.
   */
  private showTabNotice(): void {
    const notice = this.tabSession.notice;
    if (!notice) return;
    this.tabSession.notice = null;
    if (notice.kind === 'duplicated') {
      this.flash.show('warning', notice.slot !== null
        ? this.i18n.t('tabs.notice.duplicated', {n: notice.slot})
        : this.i18n.t('tabs.notice.duplicatedNoSlot'));
    } else if (notice.kind === 'slotBusy') {
      this.flash.show('warning', this.i18n.t('tabs.notice.slotBusy', {n: notice.slot}));
    } else {
      this.flash.show('info', this.i18n.t('tabs.notice.busy'));
    }
  }

  /** Ouvre la navigation en tiroir (petits écrans). */
  protected openMenu(): void {
    this.drawerMenu?.open();
  }

  /**
   * Lien d'évitement : avec le routage par hash, un simple `href="#main-content"` serait
   * interprété comme une route ; on déplace donc le focus manuellement.
   */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.routeFocus.focusMainHeading();
  }
}

/** Vrai pour la route d'une étape du parcours de création (`/info-eval` … `/download-eval`). */
function isStepPath(path: string): boolean {
  return Object.values(STEP_TO_ROUTE).includes(path);
}
