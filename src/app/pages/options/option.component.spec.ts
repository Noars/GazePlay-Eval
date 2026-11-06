import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {OptionComponent} from './option.component';
import {FlashService} from '../../services/flash-message/flash.service';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {InMemoryPreferencesStore, provideInMemoryPreferences} from '../../core/preferences/testing/in-memory-preferences.store';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {DEFAULT_PREFERENCES} from '../../core/preferences/user-preferences.model';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

describe('OptionComponent', () => {
  let component: OptionComponent;
  let fixture: ComponentFixture<OptionComponent>;
  let flashServiceSpy: Mocked<FlashService>;
  let routerSpy: Mocked<Router>;
  let idbServiceSpy: Mocked<IndexedDBService>;
  let cleanupSpy: Mocked<MediaCleanupService>;
  let confirmSpy: Mocked<ConfirmService>;
  let store: InMemoryPreferencesStore;
  let preferences: UserPreferencesService;

  beforeEach(async () => {
    flashServiceSpy = createSpyObj('FlashService', ['show']);
    routerSpy = createSpyObj('Router', ['navigate']);
    idbServiceSpy = createSpyObj('IndexedDBService', ['deleteAll']);
    idbServiceSpy.deleteAll.mockReturnValue(Promise.resolve());
    cleanupSpy = createSpyObj('MediaCleanupService', ['cleanupAll']);
    cleanupSpy.cleanupAll.mockReturnValue(Promise.resolve(2));
    confirmSpy = createSpyObj('ConfirmService', ['confirm']);
    confirmSpy.confirm.mockReturnValue(Promise.resolve(true));
    store = new InMemoryPreferencesStore();

    await TestBed.configureTestingModule({
      imports: [OptionComponent],
      providers: [
        provideInMemoryPreferences(store),
        {provide: FlashService, useValue: flashServiceSpy},
        {provide: Router, useValue: routerSpy},
        {provide: IndexedDBService, useValue: idbServiceSpy},
        {provide: MediaCleanupService, useValue: cleanupSpy},
        {provide: ConfirmService, useValue: confirmSpy},
      ]
    }).compileComponents();

    preferences = TestBed.inject(UserPreferencesService);
    await preferences.init();
    fixture = TestBed.createComponent(OptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(async () => {
    // Remet le document dans son état par défaut pour les autres tests.
    await preferences.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('chaque réglage a un nom accessible (libellé associé ou groupe nommé)', () => {
    const root: HTMLElement = fixture.nativeElement;
    root.querySelectorAll('input, select').forEach(control => {
      const id = control.getAttribute('id');
      const hasLabel = !!id && !!root.querySelector(`label[for="${id}"]`);
      const groupLabel = control.closest('[role="radiogroup"]')?.getAttribute('aria-labelledby');
      expect(hasLabel || !!groupLabel || control.hasAttribute('aria-label'), control.outerHTML)
        .toBe(true);
    });
  });

  it('set → applique immédiatement la préférence et l\'enregistre', async () => {
    await component.set('contrast', 'high');

    expect(component.prefs().contrast).toBe('high');
    expect(document.documentElement.getAttribute('data-contrast')).toBe('high');
    expect(store.record?.data.contrast).toBe('high');
  });

  it('mode daltonisme — réglage proposé, activable et désactivable', async () => {
    // ngModel écrit sa valeur de façon asynchrone : on attend avant de lire l'état des radios.
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const label = Array.from(root.querySelectorAll('.gp-setting__label'))
      .find(el => el.textContent?.trim() === 'Mode daltonisme');
    expect(label, 'libellé du réglage').toBeTruthy();

    const group = root.querySelector(`[role="radiogroup"][aria-labelledby="${label!.id}"]`)!;
    const [yes, no] = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    expect(no.checked).toBe(true);

    yes.click();
    await fixture.whenStable();
    expect(component.prefs().colorBlindMode).toBe(true);
    expect(document.documentElement.getAttribute('data-color-blind')).toBe('true');
    expect(store.record?.data.colorBlindMode).toBe(true);

    no.click();
    await fixture.whenStable();
    expect(component.prefs().colorBlindMode).toBe(false);
    expect(document.documentElement.getAttribute('data-color-blind')).toBe('false');
  });

  it('souligner tous les liens — Oui/Non appliqué immédiatement au lien de l\'aperçu', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const label = Array.from(root.querySelectorAll('.gp-setting__label'))
      .find(el => el.textContent?.trim() === 'Souligner tous les liens');
    const group = root.querySelector(`[role="radiogroup"][aria-labelledby="${label!.id}"]`)!;
    const [yes, no] = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const previewLink = root.querySelector('.preview a')!;
    expect(no.checked).toBe(true);
    expect(getComputedStyle(previewLink).textDecorationLine).toBe('none');

    yes.click();
    await fixture.whenStable();
    expect(component.prefs().underlineLinks).toBe(true);
    expect(store.record?.data.underlineLinks).toBe(true);
    expect(getComputedStyle(previewLink).textDecorationLine).toBe('underline');

    no.click();
    await fixture.whenStable();
    expect(component.prefs().underlineLinks).toBe(false);
    expect(getComputedStyle(previewLink).textDecorationLine).toBe('none');
  });

  it('langue — choix Français / English, l\'anglais traduit la page immédiatement et est enregistré', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const label = Array.from(root.querySelectorAll('.gp-setting__label'))
      .find(el => el.textContent?.trim() === 'Langue de l\'interface');
    expect(label, 'libellé du réglage').toBeTruthy();

    const group = root.querySelector(`[role="radiogroup"][aria-labelledby="${label!.id}"]`)!;
    const [fr, en] = Array.from(group.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const optionLabel = (input: HTMLInputElement) => root.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)!;
    expect(optionLabel(fr).textContent?.trim()).toBe('Français');
    expect(optionLabel(en).textContent?.trim()).toBe('English');
    expect(optionLabel(en).getAttribute('lang')).toBe('en');
    expect(fr.checked).toBe(true);

    en.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.prefs().language).toBe('en');
    expect(store.record?.data.language).toBe('en');
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Options and accessibility');

    await component.set('language', 'fr');
    fixture.detectChanges();
    expect(root.querySelector('h1')?.textContent?.trim()).toBe('Options et accessibilité');
  });

  it('setFont → change la police', async () => {
    component.setFont('verdana');
    await fixture.whenStable();
    expect(component.prefs().font).toBe('verdana');
    expect(component.selectedFont().label).toBe('Verdana');
  });

  it('setMessageDuration → borne la valeur entre 0 et 30 secondes', async () => {
    component.setMessageDuration(45);
    await fixture.whenStable();
    expect(component.prefs().messageDuration).toBe(30);

    component.setMessageDuration('abc');
    await fixture.whenStable();
    expect(component.prefs().messageDuration).toBe(30);
  });

  it('erreur d\'enregistrement → message affiché sur la page', async () => {
    store.saveError = new Error('quota');
    await component.set('theme', 'dark');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('pas pu être enregistrées');
  });

  it('resetPreferences — confirmé → valeurs par défaut rétablies', async () => {
    await component.set('textScale', 150);
    await component.resetPreferences();
    expect(component.prefs().textScale).toBe(DEFAULT_PREFERENCES.textScale);
  });

  it('resetPreferences — annulé → rien ne change', async () => {
    await component.set('textScale', 150);
    confirmSpy.confirm.mockReturnValue(Promise.resolve(false));
    await component.resetPreferences();
    expect(component.prefs().textScale).toBe(150);
  });

  it('testMessage → affiche une notification d\'essai', () => {
    component.testMessage();
    expect(flashServiceSpy.show).toHaveBeenCalledWith('info', expect.any(String));
  });

  it('cleanupUnusedMedia → nettoie les médias inutilisés et indique le nombre', async () => {
    await component.cleanupUnusedMedia();
    expect(cleanupSpy.cleanupAll).toHaveBeenCalled();
    expect(flashServiceSpy.show).toHaveBeenCalledWith('success', expect.stringMatching('2 fichier'), 4000);
    expect(component.storageBusy).toBe(false);
  });

  it('emptyDB — confirmation demandée puis suppression', async () => {
    await component.emptyDB();
    expect(confirmSpy.confirm).toHaveBeenCalledWith(expect.objectContaining({tone: 'danger'}));
    expect(idbServiceSpy.deleteAll).toHaveBeenCalled();
    expect(flashServiceSpy.show).toHaveBeenCalledWith('success', 'Les fichiers ont été supprimés avec succès.', 4000);
  });

  it('emptyDB — confirmation refusée → aucune suppression', async () => {
    confirmSpy.confirm.mockReturnValue(Promise.resolve(false));
    await component.emptyDB();
    expect(idbServiceSpy.deleteAll).not.toHaveBeenCalled();
  });

  it('emptyDB — erreur → message d\'erreur', async () => {
    idbServiceSpy.deleteAll.mockReturnValue(Promise.reject(new Error('fail')));
    await component.emptyDB();
    expect(flashServiceSpy.show).toHaveBeenCalledWith('error', 'Une erreur est survenue lors de la suppression des fichiers.');
  });

  it('goBack → navigue vers /home', () => {
    component.goBack();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });
});
