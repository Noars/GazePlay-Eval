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

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = nav?.type === 'reload';

    // Au rechargement, on repasse par l'accueil puis on ramène l'utilisateur à l'étape
    // où il s'était arrêté (s'il avait une évaluation en cours).
    if (isReload) {
      this.router.navigate(['/home']).then(() => {
        this.autoSaveService.tryResume(false);
      });
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
