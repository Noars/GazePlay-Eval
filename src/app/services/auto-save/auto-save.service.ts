import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SaveService } from '../save/save.service';
import { FlashService } from '../flash-message/flash.service';

@Injectable({ providedIn: 'root' })
export class AutoSaveService implements OnDestroy {

  private subscription!: Subscription;
  private pagesExclues = ['home', ''];

  constructor(
    private router: Router,
    private saveService: SaveService,
    private flashService: FlashService
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
    console.log('autoSave déclenché depuis :', pageActuelle);
    if (this.pagesExclues.includes(pageActuelle)) return;

    try {
      this.saveService.saveToSlot(0, this.saveService.dataAuto);
      console.log('sauvegarde OK');
      this.flashService.show('info', 'Vos modifications ont été enregistrées automatiquement');
    } catch (e) {
      this.flashService.show('warning', 'Vos modifications n\'ont pas pu être enregistrées');
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe(); // évite les fuites mémoire
  }
}
