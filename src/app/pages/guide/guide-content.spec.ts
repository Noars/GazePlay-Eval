import {Type} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Route} from '@angular/router';
import {routes} from '../../app.routes';
import {provideInMemoryPreferences} from '../../core/preferences/testing/in-memory-preferences.store';
import {I18nService} from '../../core/i18n/i18n.service';
import {GuideHomeComponent} from './guide-home/guide-home.component';
import {GuideCreationComponent} from './guide-creation/guide-creation.component';
import {GuideSauvegardeComponent} from './guide-sauvegarde/guide-sauvegarde.component';
import {GuideImportComponent} from './guide-import/guide-import.component';
import {GuideOptionsComponent} from './guide-options/guide-options.component';
import {GuideDepannageComponent} from './guide-depannage/guide-depannage.component';

/** Pages du guide, avec leur adresse. */
const GUIDE_PAGES: [string, Type<unknown>][] = [
  ['/guide', GuideHomeComponent],
  ['/guide/creation', GuideCreationComponent],
  ['/guide/sauvegardes', GuideSauvegardeComponent],
  ['/guide/imports', GuideImportComponent],
  ['/guide/options', GuideOptionsComponent],
  ['/guide/depannage', GuideDepannageComponent],
];

/** Toutes les adresses déclarées dans les routes de l'application (sauf « ** »). */
function routePaths(list: Route[], prefix = ''): string[] {
  return list.flatMap(route => {
    if (route.path === undefined || route.path === '**') return [];
    const path = route.path ? `${prefix}/${route.path}` : prefix;
    return [path || '/', ...routePaths(route.children ?? [], path)];
  });
}

/**
 * Cohérence du contenu du guide, en français et en anglais : liens internes, sommaires,
 * captures d'écran (fichier présent, texte alternatif, légende).
 */
describe('Guide : contenu', () => {
  const knownPaths = new Set(routePaths(routes));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideInMemoryPreferences()],
    }).compileComponents();
  });

  function render(component: Type<unknown>): HTMLElement {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  for (const language of ['fr', 'en'] as const) {
    describe(`version ${language}`, () => {
      beforeEach(() => TestBed.inject(I18nService).setLanguage(language));

      for (const [page, component] of GUIDE_PAGES) {
        it(`${page} : chaque entrée du sommaire mène à une section de la page`, () => {
          const root = render(component);
          const links = [...root.querySelectorAll<HTMLAnchorElement>('.guide-toc a')];
          expect(links.length).withContext('sommaire présent').toBeGreaterThan(0);
          for (const link of links) {
            const id = link.getAttribute('href')!.split('#').pop()!;
            expect(link.getAttribute('href')).withContext(id).toBe(`#${page}#${id}`);
            expect(root.querySelector(`#${id}`)).withContext(`section #${id}`).not.toBeNull();
          }
        });

        it(`${page} : les liens internes mènent à des pages (et sections) existantes`, () => {
          const root = render(component);
          const links = [...root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')];
          for (const link of links) {
            const [path, fragment] = link.getAttribute('href')!.split('#');
            expect(knownPaths.has(path)).withContext(`route ${path}`).toBeTrue();
            if (fragment) {
              const target = GUIDE_PAGES.find(([p]) => p === path);
              expect(target).withContext(`${path}#${fragment} : page du guide`).toBeDefined();
              const targetRoot = render(target![1]);
              expect(targetRoot.querySelector(`#${fragment}`)).withContext(`${path}#${fragment}`).not.toBeNull();
              const tocIds = [...targetRoot.querySelectorAll('.guide-toc a')].map(a => a.getAttribute('href')!.split('#').pop());
              expect(tocIds).withContext(`${path}#${fragment} : présent dans le sommaire (défilement à l'ouverture)`).toContain(fragment);
            }
          }
        });

        it(`${page} : chaque capture a un texte alternatif, une légende et un fichier dans la bonne langue`, async () => {
          const root = render(component);
          const images = [...root.querySelectorAll<HTMLImageElement>('figure.guide-figure img')];
          for (const img of images) {
            const src = img.getAttribute('src')!;
            expect(src).withContext(src).toMatch(new RegExp(`^assets/guide/images/${language}/[a-z-]+\\.png$`));
            expect((img.getAttribute('alt') ?? '').length).withContext(`alt de ${src}`).toBeGreaterThan(20);
            expect(img.closest('figure')!.querySelector('figcaption')).withContext(`légende de ${src}`).not.toBeNull();
            const response = await fetch(src);
            expect(response.ok).withContext(`${src} accessible`).toBeTrue();
          }
        });
      }
    });
  }
});
