import {ComponentFixture, TestBed} from '@angular/core/testing';
import {computed, signal} from '@angular/core';
import {provideRouter, Router} from '@angular/router';
import {NavbarComponent} from './navbar.component';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {SaveService} from '../../services/save/save.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;
  const theme = signal<'light' | 'dark'>('light');
  let preferencesSpy: jasmine.SpyObj<UserPreferencesService>;

  beforeEach(async () => {
    theme.set('light');
    preferencesSpy = jasmine.createSpyObj('UserPreferencesService', ['toggleTheme'], {
      resolvedTheme: computed(() => theme()),
    });
    preferencesSpy.toggleTheme.and.callFake(async () => {
      theme.set(theme() === 'light' ? 'dark' : 'light');
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

  it('getTheme → \'sun\' en thème sombre, \'moon\' sinon', () => {
    expect(component.getTheme()).toEqual('moon');
    component.changeTheme();
    expect(component.getTheme()).toEqual('sun');
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
    const emitted = spyOn(component.menuRequested, 'emit');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.gp-header__menu-button');
    button.click();
    expect(emitted).toHaveBeenCalled();
  });

  it('tous les boutons et liens ont un nom accessible', () => {
    const controls = fixture.nativeElement.querySelectorAll('button, a') as NodeListOf<HTMLElement>;
    controls.forEach(control => {
      const name = control.getAttribute('aria-label') || control.textContent?.trim();
      expect(name).withContext(control.outerHTML).toBeTruthy();
    });
  });

  it('bouton d\'aide masqué dans les pages du guide', () => {
    spyOnProperty(router, 'url', 'get').and.returnValue('/guide/creation');
    expect(component.showGuideButton()).toBeFalse();
  });
});
