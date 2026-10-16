import {ComponentFixture, TestBed} from '@angular/core/testing';
import {computed, signal} from '@angular/core';
import {provideRouter, Router} from '@angular/router';
import {NavbarComponent} from './navbar.component';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {SaveService} from '../../services/save/save.service';
import {I18nService} from '../../core/i18n/i18n.service';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;
  const theme = signal<'light' | 'dark'>('light');
  let preferencesSpy: Mocked<UserPreferencesService>;

  beforeEach(async () => {
    theme.set('light');
    preferencesSpy = createSpyObj('UserPreferencesService', ['toggleTheme', 'setLanguage'], {
      resolvedTheme: computed(() => theme()),
    });
    preferencesSpy.toggleTheme.mockImplementation(async () => {
      theme.set(theme() === 'light' ? 'dark' : 'light');
      return true;
    });
    // Comme le vrai service : la langue enregistrée est appliquée à l'interface.
    preferencesSpy.setLanguage.mockImplementation(async language => {
      TestBed.inject(I18nService).setLanguage(language);
      return true;
    });

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        {provide: UserPreferencesService, useValue: preferencesSpy},
        {provide: SaveService, useValue: {getEvalName: () => 'Éval'}},
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getTheme → icône du thème actuel : \'sun\' en thème clair, \'moon\' en thème sombre', () => {
    expect(component.getTheme()).toStrictEqual('sun');
    component.changeTheme();
    expect(component.getTheme()).toStrictEqual('moon');
  });

  it('le bouton affiche l\'icône du thème actuel et garde un nom accessible décrivant l\'action', async () => {
    fixture.detectChanges();
    const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[aria-pressed]');
    const icon = () => button().querySelector('i')!;

    expect(icon().classList).toContain('bi-sun');
    expect(icon().classList).not.toContain('bi-moon-stars');
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(button().title).toBe('Passer au thème sombre');

    component.changeTheme();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(icon().classList).toContain('bi-moon-stars');
    expect(icon().classList).not.toContain('bi-sun');
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().title).toBe('Passer au thème clair');
  });

  it('changeTheme → délègue aux préférences', () => {
    component.changeTheme();
    expect(preferencesSpy.toggleTheme).toHaveBeenCalled();
  });

  it('bouton de thème → état annoncé par aria-pressed', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-pressed]');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('bouton de menu → émet menuRequested', () => {
    const emitted = vi.spyOn(component.menuRequested, 'emit').mockImplementation(() => undefined);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.gp-header__menu-button');
    button.click();
    expect(emitted).toHaveBeenCalled();
  });

  it('tous les boutons et liens ont un nom accessible', () => {
    const controls = fixture.nativeElement.querySelectorAll('button, a') as NodeListOf<HTMLElement>;
    controls.forEach(control => {
      const name = control.getAttribute('aria-label') || control.textContent?.trim();
      expect(name, control.outerHTML).toBeTruthy();
    });
  });

  it('plus de lien vers les options dans l\'en-tête (elles restent dans le menu)', () => {
    expect(fixture.nativeElement.querySelector('a[href*="option"]')).toBeNull();
  });

  it('sélecteur de langue → affiche la langue en cours ; choisir l\'anglais traduit l\'en-tête', async () => {
    const host: HTMLElement = fixture.nativeElement;
    const trigger = host.querySelector<HTMLButtonElement>('app-language-menu button[aria-haspopup="menu"]')!;
    expect(trigger.textContent).toContain('FR');

    trigger.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('[role="menuitemradio"][lang="en"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(preferencesSpy.setLanguage).toHaveBeenCalledWith('en');
    expect(trigger.textContent).toContain('EN');
    expect(host.querySelector('.gp-header__menu-button')!.getAttribute('aria-label')).toBe('Open the navigation menu');
    TestBed.inject(I18nService).setLanguage('fr');
  });

  it('bouton d\'aide masqué dans les pages du guide', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/guide/creation');
    expect(component.showGuideButton()).toBe(false);
  });
});
