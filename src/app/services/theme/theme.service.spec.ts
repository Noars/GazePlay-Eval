import { TestBed } from '@angular/core/testing';
import {ThemeService} from './theme.service';


describe('ThemeService', () => {
  let service: ThemeService;
  let setAttributeSpy: jasmine.Spy;
  let localStorageSetSpy: jasmine.Spy;
  let localStorageGetSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);

    setAttributeSpy = spyOn(document.documentElement, 'setAttribute');

    localStorageSetSpy = spyOn(localStorage, 'setItem');
    localStorageGetSpy = spyOn(localStorage, 'getItem').and.returnValue(null);
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('applySavedTheme applique le thème sauvegardé ou light par défaut', () => {
    localStorageGetSpy.and.returnValue('dark');
    service.applySavedTheme();
    expect(service.getTheme()).toBe('dark');
    expect(setAttributeSpy).toHaveBeenCalledWith('data-bs-theme', 'dark');

    localStorageGetSpy.and.returnValue(null);
    service.applySavedTheme();
    expect(service.getTheme()).toBe('light');
    expect(setAttributeSpy).toHaveBeenCalledWith('data-bs-theme', 'light');
  });

  it('setTheme met à jour le signal, le localStorage et le document', () => {
    service.setTheme('dark');
    expect(service.getTheme()).toBe('dark');
    expect(localStorageSetSpy).toHaveBeenCalledWith('theme', 'dark');
    expect(setAttributeSpy).toHaveBeenCalledWith('data-bs-theme', 'dark');

    service.setTheme('light');
    expect(service.getTheme()).toBe('light');
    expect(localStorageSetSpy).toHaveBeenCalledWith('theme', 'light');
    expect(setAttributeSpy).toHaveBeenCalledWith('data-bs-theme', 'light');
  });

  it('toggleTheme inverse correctement le thème', () => {
    service.setTheme('light');
    service.toggleTheme();
    expect(service.getTheme()).toBe('dark');
    service.toggleTheme();
    expect(service.getTheme()).toBe('light');
  });
});
