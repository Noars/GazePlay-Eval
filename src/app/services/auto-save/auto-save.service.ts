import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart, Event } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SaveService } from '../save/save.service';
import { FlashService } from '../flash-message/flash.service';
import { LoadService} from '../load/load.service';
import { ROUTE_TO_STEP, STEP_TO_ROUTE} from '../../shared/stepRoute.model';

@Injectable({ providedIn: 'root' })
export class AutoSaveService implements OnDestroy {

  private subscription!: Subscription;
  private pagesExclues = ['home', ''];
  private isResuming = false;

  constructor(
    private router: Router,
    private saveService: SaveService,
    private flashService: FlashService,
    private loadService: LoadService
  ) {}

  init(): void {
    this.subscription = this.router.events.pipe(
      filter((event: Event): event is NavigationStart => event instanceof NavigationStart)
    ).subscribe((event: NavigationStart) => {
      if (!this.isResuming) {
        this.autoSave(event.url);
      }

    });
  }

  private autoSave(targetUrl: string): void {
    // Nettoyer l'URL cible (enlever le premier '/' et les éventuels paramètres de requête)
    const pageActuelle = targetUrl.split('?')[0].replace(/^\//, '');

    if (this.pagesExclues.includes(pageActuelle)) return; // on ne save pas au début

    try {
      const step = ROUTE_TO_STEP[pageActuelle] ?? -1;
      this.saveService.dataAuto.step = step;
      this.saveService.saveToSlot(0, this.saveService.dataAuto);
      this.flashService.show('info', 'Vos modifications ont été enregistrées automatiquement', 2000);
    } catch (e) {
      this.flashService.show('warning', 'Vos modifications n\'ont pas pu être enregistrées');
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe(); // évite les fuites mémoire
  }

  tryResume(): void {
    const save = this.loadService.getSlot(0);
    if (!save || save.step === -1) return;

    const route = STEP_TO_ROUTE[save.step];
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
