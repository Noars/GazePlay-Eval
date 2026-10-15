import {NO_ERRORS_SCHEMA} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NavigationEnd, provideRouter, Router, RouterOutlet} from '@angular/router';
import {Subject} from 'rxjs';
import {App} from './app';
import {AutoSaveService} from './services/auto-save/auto-save.service';
import {RouteFocusService} from './core/a11y/route-focus.service';
import {TranslatePipe} from './core/i18n/translate.pipe';

describe('App', () => {
  let component: App;
  let fixture: any;
  let routerEvents$: Subject<any>;
  let router: jasmine.SpyObj<Router>;
  let autoSaveSpy: jasmine.SpyObj<AutoSaveService>;
  let routeFocusSpy: jasmine.SpyObj<RouteFocusService>;

  beforeEach(async () => {
    routerEvents$ = new Subject();
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      events: routerEvents$.asObservable(),
      url: '/home'
    });
    autoSaveSpy = jasmine.createSpyObj('AutoSaveService', ['init', 'tryResume']);
    routeFocusSpy = jasmine.createSpyObj('RouteFocusService', ['start', 'focusMainHeading']);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {provide: Router, useValue: router},
        {provide: AutoSaveService, useValue: autoSaveSpy},
        {provide: RouteFocusService, useValue: routeFocusSpy},
      ]
    })
      // Les composants enfants (en-tête, menu…) ont leurs propres tests : on les neutralise ici
      // (le pipe de traduction reste nécessaire au gabarit).
      .overrideComponent(App, {set: {imports: [RouterOutlet, TranslatePipe], schemas: [NO_ERRORS_SCHEMA]}})
      .compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait avoir le titre "GazePlay-Eval"', () => {
    expect(component['title']).toBe('GazePlay-Eval');
  });

  it('ngOnInit → démarre la sauvegarde automatique et la gestion du focus', () => {
    expect(autoSaveSpy.init).toHaveBeenCalled();
    expect(routeFocusSpy.start).toHaveBeenCalled();
  });

  const steps: [string, number][] = [
    ['/info-eval', 0],
    ['/info-participant', 1],
    ['/setup-eval', 2],
    ['/create-eval', 3],
    ['/download-eval', 4],
  ];
  for (const [url, index] of steps) {
    it(`URL ${url} → currentStepIndex = ${index}`, () => {
      routerEvents$.next(new NavigationEnd(1, url, url));
      expect(component.currentStepIndex).toBe(index);
    });
  }

  it('URL hors parcours → currentStepIndex = -1', () => {
    component.currentStepIndex = 2;
    routerEvents$.next(new NavigationEnd(1, '/home', '/home'));
    expect(component.currentStepIndex).toBe(-1);
  });

  it('pseudo-route de l\'éditeur (ex. /stimuli) → pas d\'étape affichée', () => {
    routerEvents$.next(new NavigationEnd(1, '/stimuli', '/stimuli'));
    expect(component.currentStepIndex).toBe(-1);
  });

  it('n\'affiche la barre d\'étapes que dans le parcours de création', () => {
    component.currentStepIndex = -1;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-progress-bar')).toBeNull();

    component.currentStepIndex = 3;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-progress-bar')).not.toBeNull();
  });

  it('contient un lien d\'évitement et une zone de contenu principale focalisable', () => {
    const skip = fixture.nativeElement.querySelector('.gp-skip-link');
    const main = fixture.nativeElement.querySelector('main#main-content');
    expect(skip).not.toBeNull();
    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  it('lien d\'évitement → déplace le focus sans changer de route', () => {
    const event = new MouseEvent('click', {cancelable: true});
    component['skipToContent'](event);
    expect(event.defaultPrevented).toBeTrue();
    expect(routeFocusSpy.focusMainHeading).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('rechargement de la page → retour à /home puis reprise de l\'évaluation', async () => {
    spyOn(performance, 'getEntriesByType').and.returnValue([{type: 'reload'}] as any);
    router.navigate.and.returnValue(Promise.resolve(true));

    component.ngOnInit();
    await Promise.resolve();
    await Promise.resolve();

    expect(router.navigate).toHaveBeenCalledWith(['/home']);
    expect(autoSaveSpy.tryResume).toHaveBeenCalledWith(false);
  });
});
