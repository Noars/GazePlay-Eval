import {Injectable, OnDestroy} from '@angular/core';
import {Event, NavigationStart, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {SaveService} from '../save/save.service';
import {FlashService} from '../flash-message/flash.service';
import {LoadService} from '../load/load.service';
import {ROUTE_TO_STEP, STEP_TO_ROUTE} from '../../shared/stepRoute.model';

@Injectable({ providedIn: 'root' })
export class AutoSaveService implements OnDestroy {

  private subscription!: Subscription; // abonnement aux événements du routeur (changement de page)
  private pagesExclues = ['','home', 'sauvegarde', 'load-save']; // pages non concernés par la sauvegarde auto
  private isResuming = false; // si on est en train de restaurer une session

  constructor(
    private router: Router,
    private saveService: SaveService,
    private flashService: FlashService,
    private loadService: LoadService
  ) {}

  init(): void {
    this.subscription = this.router.events.pipe(
      // Filtre pour ne garder que l'événement où l'utilisateur quitte une page
      filter((event: Event): event is NavigationStart => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      //
      if (!this.isResuming) { // Si on est déjà dans une session active
        this.autoSave(event.url);
      }
    });
  }

  /**
   * Sauvegarde automatiquement les changements de l'évaluation courante dans le LocalStorage.
   *
   * Enregistre également l'avancée de l'utilisateur dans l'évaluation pour pouvoir le rediriger
   * au rechargement de la page.
   *
   * @param targetUrl l'url de la page actuelle.
   */
  private autoSave(targetUrl: string): void {
    // Nettoyage de l'URL (on enlève le 1er '/')
    // Si jamais on a aussi des attributs dans l'URL, on ne garde que ce qu'il y a avant le '?'
    const pageActuelle = targetUrl.split('?')[0].replace(/^\//, '');

    if (this.pagesExclues.includes(pageActuelle)) return; // on ne save pas les pages exclues

    // Sauvegarde auto de l'évaluation, avec message de succès ou d'avertissement
    try {
      this.saveService.dataAuto.step = ROUTE_TO_STEP[pageActuelle] ?? -1;
      this.saveService.saveToSlot(0, this.saveService.dataAuto);
      this.flashService.show('info', 'Vos modifications ont été enregistrées automatiquement.', 2000);
    } catch (e) {
      this.flashService.show('warning', 'Vos modifications n\'ont pas pu être enregistrées');
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /**
   * Essaye de rediriger l'utilisateur vers la dernière page de modification de l'évaluation qu'il a consulté.
   *
   * Si le step n'est pas valide, la méthode ne fait rien.
   */
  tryResume(): void {
    // récupération du slot dynamique
    const save = this.loadService.getSlot(0);
    if (!save || save.step === -1) return;

    const route = STEP_TO_ROUTE[save.step]; // Si la route est invalide
    if (!route) return;


    this.saveService.dataAuto = {
      nomEval: save.nomEval,
      format: save.format,
      infoParticipant: save.infoParticipant,
      globalParamsTransitionScreen: save.globalParamsTransitionScreen,
      globalParamsInstructionScreen: save.globalParamsInstructionScreen,
      globalParamsStimuliScreen: save.globalParamsStimuliScreen,
      listScreens: save.listScreens,
      step: save.step
    };

    this.isResuming = true;
    this.router.navigate([route]).then(() => {
      this.isResuming = false;
    });
  }
}
