import {DOCUMENT} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NavigationEnd, Router} from '@angular/router';
import {Subject} from 'rxjs';
import {RouteFocusService} from './route-focus.service';

describe('RouteFocusService', () => {
  let service: RouteFocusService;
  let events$: Subject<any>;
  let main: HTMLElement;
  let heading: HTMLHeadingElement;

  beforeEach(() => {
    events$ = new Subject();
    TestBed.configureTestingModule({
      providers: [{provide: Router, useValue: {events: events$.asObservable()}}]
    });
    service = TestBed.inject(RouteFocusService);

    main = document.createElement('main');
    main.id = 'main-content';
    heading = document.createElement('h1');
    heading.textContent = 'Titre';
    main.appendChild(heading);
    TestBed.inject(DOCUMENT).body.appendChild(main);
  });

  afterEach(() => main.remove());

  /** Simule la fin d'une navigation puis laisse passer le délai de rendu. */
  async function navigate(url = '/page'): Promise<void> {
    events$.next(new NavigationEnd(1, url, url));
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  it('navigations avant toute interaction (chargement, reprise au rechargement) → focus inchangé', async () => {
    service.start();

    await navigate('/home');
    await navigate('/info-eval');

    expect(document.activeElement).not.toBe(heading);
    expect(heading.hasAttribute('tabindex')).toBe(false);
  });

  for (const type of ['pointerdown', 'keydown', 'click']) {
    it(`navigation après une interaction (${type}) → focus sur le titre de la page`, async () => {
      service.start();
      await navigate('/home');

      document.body.dispatchEvent(new Event(type, {bubbles: true}));
      await navigate('/option');

      expect(document.activeElement).toBe(heading);
      expect(heading.getAttribute('tabindex')).toBe('-1');
    });
  }

  it('page sans h1 → focus sur la zone de contenu principale', async () => {
    heading.remove();
    service.start();

    document.body.dispatchEvent(new Event('click', {bubbles: true}));
    await navigate('/option');

    expect(document.activeElement).toBe(main);
  });

  it('start appelé deux fois → un seul abonnement', async () => {
    service.start();
    service.start();
    const focus = vi.spyOn(service, 'focusMainHeading');

    document.body.dispatchEvent(new Event('click', {bubbles: true}));
    await navigate('/option');

    expect(focus).toHaveBeenCalledTimes(1);
  });
});
