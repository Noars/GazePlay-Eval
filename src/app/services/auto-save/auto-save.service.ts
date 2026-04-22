import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
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

  constructor(
    private router: Router,
    private saveService: SaveService,
    private flashService: FlashService,
    private loadService: LoadService
  ) {}

  init(): void {
    this.subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.autoSave();
    });
  }

  private autoSave(): void {
    const pageActuelle = this.router.url.replace('/', '');
    if (this.pagesExclues.includes(pageActuelle)) return; // on ne save pas au début

    try {
      const step = ROUTE_TO_STEP[pageActuelle] ?? 0;
      this.saveService.dataAuto.step = step;
      this.saveService.saveToSlot(0, this.saveService.dataAuto);
      this.flashService.show('info', 'Vos modifications ont été enregistrées automatiquement');
    } catch (e) {
      this.flashService.show('warning', 'Vos modifications n\'ont pas pu être enregistrées');
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe(); // évite les fuites mémoire
  }

  tryResume(): void {
    const save = this.loadService.getSlot(0);
    if (!save || save.step === 0) return;

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

    this.router.navigate([route]);
  }
}
