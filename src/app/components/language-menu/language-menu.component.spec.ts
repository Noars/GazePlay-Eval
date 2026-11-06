import {ComponentFixture, TestBed} from '@angular/core/testing';
import {LanguageMenuComponent} from './language-menu.component';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {I18nService} from '../../core/i18n/i18n.service';
import {LANGUAGES} from '../../core/preferences/user-preferences.model';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('LanguageMenuComponent', () => {
  let fixture: ComponentFixture<LanguageMenuComponent>;
  let component: LanguageMenuComponent;
  let host: HTMLElement;
  let preferencesSpy: Mocked<UserPreferencesService>;
  let i18n: I18nService;

  const trigger = () => host.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
  const list = () => host.querySelector<HTMLElement>('[role="menu"]')!;
  const items = () => Array.from(host.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
  const key = (target: HTMLElement, name: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true}));
  const settle = async () => {
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    preferencesSpy = createSpyObj('UserPreferencesService', ['setLanguage']);
    // Comme le vrai service : la langue enregistrée est appliquée à l'interface.
    preferencesSpy.setLanguage.mockImplementation(async language => {
      i18n.setLanguage(language);
      return true;
    });

    await TestBed.configureTestingModule({
      imports: [LanguageMenuComponent],
      providers: [{provide: UserPreferencesService, useValue: preferencesSpy}],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    fixture = TestBed.createComponent(LanguageMenuComponent);
    component = fixture.componentInstance;
    host = fixture.nativeElement;
    document.body.appendChild(host);
    fixture.detectChanges();
  });

  afterEach(() => host.remove());

  it('le bouton affiche la langue en cours (et non la suivante), avec un nom accessible complet', () => {
    expect(trigger().textContent).toContain('FR');
    expect(trigger().querySelector('[lang="fr"]')).not.toBeNull();
    expect(trigger().textContent).toContain('langue de l\'interface : Français');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(list().hidden).toBe(true);
  });

  it('la liste propose toutes les langues disponibles, chacune dans sa langue, la langue en cours cochée', async () => {
    trigger().click();
    await settle();

    expect(list().hidden).toBe(false);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(items().map(item => item.getAttribute('lang'))).toStrictEqual([...LANGUAGES]);
    expect(items().map(item => item.querySelector('.language-menu__item-name')?.textContent?.trim())).toStrictEqual(['Français', 'English']);
    expect(items().map(item => item.querySelector('.language-menu__item-code')?.textContent?.trim())).toStrictEqual(['FR', 'EN']);
    expect(items().map(item => item.getAttribute('aria-checked'))).toStrictEqual(['true', 'false']);
    expect(document.activeElement).toBe(items()[0]);
  });

  it('choisir une langue → enregistrée, liste fermée, focus rendu au bouton qui affiche la nouvelle langue', async () => {
    trigger().click();
    await settle();
    items()[1].click();
    await settle();

    expect(preferencesSpy.setLanguage).toHaveBeenCalledExactlyOnceWith('en');
    expect(list().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(trigger().textContent).toContain('EN');
    expect(trigger().textContent).toContain('interface language: English');

    trigger().click();
    await settle();
    expect(items().map(item => item.getAttribute('aria-checked'))).toStrictEqual(['false', 'true']);
    i18n.setLanguage('fr');
  });

  it('choisir la langue déjà active → rien n\'est enregistré', async () => {
    trigger().click();
    await settle();
    items()[0].click();
    expect(preferencesSpy.setLanguage).not.toHaveBeenCalled();
  });

  it('clavier : flèche bas ouvre, flèches/Début/Fin déplacent, Échap ferme et rend le focus', async () => {
    key(trigger(), 'ArrowDown');
    await settle();
    expect(list().hidden).toBe(false);
    expect(document.activeElement).toBe(items()[0]);

    key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    key(items()[1], 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    key(items()[0], 'End');
    expect(document.activeElement).toBe(items()[1]);
    key(items()[1], 'Home');
    expect(document.activeElement).toBe(items()[0]);

    key(items()[0], 'Escape');
    fixture.detectChanges();
    expect(list().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it('clic en dehors → la liste se ferme', async () => {
    trigger().click();
    await settle();
    document.body.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });
});
