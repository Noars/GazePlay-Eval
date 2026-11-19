import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute} from '@angular/router';
import {GuideTocComponent} from './guide-toc.component';

describe('GuideTocComponent', () => {
  let fixture: ComponentFixture<GuideTocComponent>;
  let component: GuideTocComponent;
  let target: HTMLElement;
  let fragment: string | null;

  beforeEach(async () => {
    fragment = null;
    await TestBed.configureTestingModule({
      imports: [GuideTocComponent],
      providers: [{provide: ActivatedRoute, useValue: {snapshot: {get fragment() { return fragment; }}}}],
    }).compileComponents();

    target = document.createElement('section');
    target.id = 'section-test';
    target.scrollIntoView = vi.fn().mockName('scrollIntoView');
    document.body.appendChild(target);

    fixture = TestBed.createComponent(GuideTocComponent);
    component = fixture.componentInstance;
    component.title = 'Sur cette page';
    component.page = '/guide/creation';
    component.items = [{id: 'section-test', label: 'Section de test'}, {id: 'absente', label: 'Absente'}];
  });

  afterEach(() => target.remove());

  it('affiche un lien par section, vers la page du guide et le fragment', () => {
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(2);
    expect(links[0].textContent?.trim()).toBe('Section de test');
    expect(links[0].getAttribute('href')).toBe('#/guide/creation#section-test');
  });

  it('nomme la navigation par son titre visible', () => {
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const title = fixture.nativeElement.querySelector('#' + nav.getAttribute('aria-labelledby')) as HTMLElement;
    expect(title.textContent?.trim()).toBe('Sur cette page');
  });

  it('un clic fait défiler jusqu\'à la section sans naviguer et lui donne le focus', () => {
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const event = new MouseEvent('click', {cancelable: true});
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(target);
  });

  it('défilement instantané quand les animations sont réduites', () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    try {
      component.scrollToSection('section-test');
      expect(target.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({behavior: 'auto'}));
    } finally {
      document.documentElement.removeAttribute('data-motion');
    }
  });

  it('renvoie false pour une section absente de la page', () => {
    expect(component.scrollToSection('absente')).toBe(false);
  });

  it('fait défiler jusqu\'au fragment de l\'adresse à l\'ouverture de la page', async () => {
    fragment = 'section-test';
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('ignore un fragment qui ne correspond à aucune entrée du sommaire', async () => {
    fragment = 'inconnu';
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(target.scrollIntoView).not.toHaveBeenCalled();
  });
});
