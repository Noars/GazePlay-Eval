import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {FlashService} from './flash.service';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {provideInMemoryPreferences} from '../../core/preferences/testing/in-memory-preferences.store';

describe('FlashService', () => {
  let service: FlashService;
  let preferences: UserPreferencesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FlashService, provideInMemoryPreferences()]
    });
    service = TestBed.inject(FlashService);
    preferences = TestBed.inject(UserPreferencesService);
  });

  afterEach(async () => {
    await preferences.reset();
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('show → flash ajouté au signal, id incrémenté', () => {
    service.show('info', 'Message 1');
    service.show('success', 'Message 2');

    expect(service.flashs().length).toBe(2);
    expect(service.flashs()[0].message).toBe('Message 1');
    expect(service.flashs()[0].id).toBe(0);
    expect(service.flashs()[1].message).toBe('Message 2');
    expect(service.flashs()[1].id).toBe(1);
  });

  it('un message d\'information de durée ≤ 0 n\'est pas affiché', () => {
    service.show('info', 'Message jamais affiché', 0);
    service.show('info', 'Autre message jamais affiché', -5);

    expect(service.flashs().length).toBe(0);
  });

  it('un message d\'erreur reste affiché au moins 8 secondes, même si les messages sont désactivés', fakeAsync(() => {
    service.show('error', 'Erreur importante', 0);
    expect(service.flashs().length).toBe(1);

    tick(7999);
    expect(service.flashs().length).toBe(1);
    tick(1 + 300);
    expect(service.flashs().length).toBe(0);
  }));

  it('sans durée précisée → durée par défaut des préférences', fakeAsync(() => {
    void preferences.update({messageDuration: 0.1});
    service.show('info', 'Message sans durée');
    expect(service.flashs().length).toBe(1);

    tick(100 + 300);
    expect(service.flashs().length).toBe(0);
  }));

  it('préférence à 0 → les messages d\'information sont désactivés', () => {
    void preferences.update({messageDuration: 0});
    service.show('info', 'Masqué');
    expect(service.flashs().length).toBe(0);
  });

  it('remove → passe fadingOut à true puis supprime après 300ms', fakeAsync(() => {
    service.show('info', 'Test');
    const id = service.flashs()[0].id;

    service.remove(id);
    expect(service.flashs()[0].fadingOut).toBeTrue();

    tick(300);
    expect(service.flashs().length).toBe(0);
    tick(10000);
  }));

  it('remove — plusieurs flashs → seul le flash ciblé disparaît', fakeAsync(() => {
    service.show('info', 'Flash A');
    service.show('info', 'Flash B');
    const idA = service.flashs()[0].id;
    const idB = service.flashs()[1].id;

    service.remove(idA);

    expect(service.flashs().find(f => f.id === idA)?.fadingOut).toBeTrue();
    expect(service.flashs().find(f => f.id === idB)?.fadingOut).toBeFalsy();

    tick(300);
    expect(service.flashs().some(f => f.id === idB)).toBeTrue();
    expect(service.flashs().some(f => f.id === idA)).toBeFalse();
    tick(10000);
  }));

  it('getDefaultDuration → durée des préférences, en secondes', async () => {
    await preferences.update({messageDuration: 8});
    expect(service.getDefaultDuration()).toBe(8);
  });

  it("message identique → remplace le précédent au lieu de s'empiler ; 3 notifications au plus", () => {
    service.show('info', 'Enregistré');
    service.show('info', 'Enregistré');
    expect(service.flashs().length).toBe(1);

    service.show('info', 'A');
    service.show('info', 'B');
    service.show('info', 'C');
    expect(service.flashs().map(f => f.message)).toEqual(['A', 'B', 'C']);
  });
});
