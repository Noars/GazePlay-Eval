import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideInMemoryPreferences} from '../preferences/testing/in-memory-preferences.store';
import {FakeLockRegistry, FakeTab, MemoryStorage, openFakeTab} from './testing/fake-tabs.spec';
import {SHARED_KEYS, TAB_KEYS, TAB_MEDIA_PREFIX} from './tab-session.service';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {collectMediaReferences, isReferenced} from '../media/media-references';

/**
 * Plusieurs onglets : chaque onglet simulé a ses propres services, son sessionStorage et ses
 * verrous ; localStorage (emplacements, dernière évaluation en cours) est le vrai, partagé.
 */
describe('TabSessionService : plusieurs onglets', () => {
  let registry: FakeLockRegistry;

  function evaluation(nomEval: string, screens: string[]): saveModel {
    return {
      nomEval, format: 'Csv&Xlsx', infoParticipant: [], globalParamsTransitionScreen: [true, 10, false, false, 0],
      globalParamsInstructionScreen: [true, 10, false, 'Image', false, 1], globalParamsStimuliScreen: [1, 1, false, 10, 1, 1, false, false],
      listScreens: screens.map(name => ({name, type: 'transition', values: [true, 2, true, true, 1]})) as any,
      step: 3, createdAt: '2026-10-15T10:00:00.000Z', version: 1,
    };
  }

  const names = (save: saveModel | null) => save?.listScreens.map(s => s.name) ?? null;
  const addScreen = (tab: FakeTab, name: string) =>
    tab.save.dataAuto.listScreens = [...tab.save.dataAuto.listScreens, {name, type: 'transition', values: [true, 2, true, true, 1]} as any];

  /** « Charger › emplacement n » tel que le fait la page (réservation, protection, chargement). */
  async function load(tab: FakeTab, index: FormatTypeConfig): Promise<'link' | 'copy' | 'cancel'> {
    const opening = await tab.guard.reserveForOpening(index);
    if (!opening) return 'cancel';
    const reservation = opening.mode === 'link' ? opening.reservation : null;
    if (!await tab.guard.check(0)) {
      reservation?.release();
      return 'cancel';
    }
    tab.save.loadIntoWorkspace(tab.load.getSlot(index)!);
    tab.save.setActiveSlot(reservation ? index : null, reservation);
    tab.save.saveToSlot(0, tab.save.dataAuto);
    return opening.mode;
  }

  beforeEach(() => {
    localStorage.clear();
    registry = new FakeLockRegistry();
    TestBed.configureTestingModule({providers: [provideRouter([]), provideInMemoryPreferences()]});
  });

  afterEach(() => localStorage.clear());

  it('deux onglets ouvrent deux évaluations différentes sans mélanger leur état', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    a.save.saveToSlot(2, evaluation('Beta', ['B1']));
    const b = await openFakeTab(registry);

    expect(await load(a, 1)).toBe('link');
    expect(await load(b, 2)).toBe('link');

    expect(a.load.getSlot(0)?.nomEval).toBe('Alpha');
    expect(b.load.getSlot(0)?.nomEval).toBe('Beta');
    expect(a.save.activeSlotIndex).toBe(1);
    expect(b.save.activeSlotIndex).toBe(2);
    expect(a.session.tabId).not.toBe(b.session.tabId);
  });

  it('sauvegardes automatiques : chaque onglet n\'écrit que dans son évaluation et son emplacement', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    a.save.saveToSlot(2, evaluation('Beta', ['B1']));
    const b = await openFakeTab(registry);
    await load(a, 1);
    await load(b, 2);

    addScreen(a, 'A2');
    a.autoSave.autoSave('create-eval');
    addScreen(b, 'B2');
    b.autoSave.autoSave('create-eval');

    expect(names(a.load.getSlot(1))).toEqual(['A1', 'A2']);
    expect(names(a.load.getSlot(2))).toEqual(['B1', 'B2']);
    expect(names(a.load.getSlot(0))).toEqual(['A1', 'A2']);
    expect(names(b.load.getSlot(0))).toEqual(['B1', 'B2']);
  });

  it('deux évaluations non enregistrées : les modifications de l\'une ne remplacent pas l\'autre, même après rechargement', async () => {
    const a = await openFakeTab(registry);
    const b = await openFakeTab(registry);
    a.save.newSaveDataAuto();
    a.save.dataAuto.nomEval = 'Alpha';
    addScreen(a, 'A1');
    a.autoSave.autoSave('create-eval');
    b.save.newSaveDataAuto();
    b.save.dataAuto.nomEval = 'Beta';
    addScreen(b, 'B1');
    b.autoSave.autoSave('create-eval');

    a.close();
    const aReloaded = await openFakeTab(registry, a.storage); // rechargement de l'onglet A
    expect(aReloaded.load.getSlot(0)?.nomEval).toBe('Alpha');
    expect(names(aReloaded.load.getSlot(0))).toEqual(['A1']);
    expect(b.load.getSlot(0)?.nomEval).toBe('Beta');
    expect(aReloaded.session.notice).toBeNull();
  });

  it('sauvegarde manuelle : « Remplacer » ou « Enregistrer ici » refusé sur un emplacement modifié dans un autre onglet', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    await load(a, 1);
    const b = await openFakeTab(registry);
    b.save.newSaveDataAuto();

    expect(await b.guard.reserveForWriting(1)).toBeNull();
    expect(b.flash.show).toHaveBeenCalledWith('warning', jasmine.stringContaining('1'));
    expect(await b.guard.reserveForWriting(2)).not.toBeNull();
    expect(await a.guard.reserveForWriting(1)).withContext('l\'onglet lié peut toujours y écrire').not.toBeNull();
  });

  it('suppression refusée tant que l\'emplacement est ouvert dans un autre onglet, puis permise après sa fermeture', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    await load(a, 1);
    const b = await openFakeTab(registry);

    expect(await b.guard.ensureNotOpenElsewhere(1)).toBeFalse();
    a.close();
    expect(await b.guard.ensureNotOpenElsewhere(1)).toBeTrue();
  });

  it('chargement d\'un emplacement déjà ouvert ailleurs : copie non liée proposée ; annuler ne change rien', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    await load(a, 1);
    const b = await openFakeTab(registry);

    expect(await load(b, 1)).toBe('cancel'); // confirmation refusée par défaut
    expect(b.confirm.confirm).toHaveBeenCalledWith(jasmine.objectContaining({confirmLabel: jasmine.any(String)}));
    expect(b.load.getSlot(0)).toBeNull();

    b.confirm.confirm.and.resolveTo(true); // « Ouvrir une copie »
    expect(await load(b, 1)).toBe('copy');
    expect(b.load.getSlot(0)?.nomEval).toBe('Alpha');
    expect(b.save.activeSlotIndex).toBeNull();
    expect(a.save.activeSlotIndex).withContext('l\'onglet d\'origine garde son lien').toBe(1);

    addScreen(b, 'copie');
    b.autoSave.autoSave('create-eval');
    expect(names(a.load.getSlot(1))).withContext('la copie n\'écrit pas dans l\'emplacement').toEqual(['A1']);
  });

  it('annuler la protection après la réservation : l\'emplacement est libéré, le lien actuel conservé', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    a.save.saveToSlot(2, evaluation('Beta', ['B1']));
    await load(a, 1);
    a.save.dataAuto.nomEval = 'Alpha';

    // Ouvrir l'emplacement 2 depuis un onglet non lié dont l'évaluation serait perdue : annulé.
    const b = await openFakeTab(registry);
    b.save.newSaveDataAuto();
    addScreen(b, 'brouillon');
    b.save.saveToSlot(0, b.save.dataAuto);
    expect(await load(b, 2)).toBe('cancel');
    expect(registry.isHeld('gazeplay-eval.slot.2')).toBeFalse();
    expect(registry.isHeld('gazeplay-eval.slot.1')).toBeTrue();
    expect(names(b.load.getSlot(0))).toEqual(['brouillon']);
  });

  it('nouvel onglet : reprend la dernière évaluation en cours si l\'onglet qui la modifiait est fermé', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    await load(a, 1);
    a.close();

    const fresh = await openFakeTab(registry);
    expect(fresh.load.getSlot(0)?.nomEval).toBe('Alpha');
    expect(fresh.save.activeSlotIndex).toBe(1);
    expect(fresh.save.hasLoadedWorkspace).toBeTrue();
    expect(fresh.session.notice).toBeNull();
  });

  it('nouvel onglet (ou lien ouvert dans un nouvel onglet) pendant que l\'évaluation est modifiée ailleurs : démarre sans évaluation', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    await load(a, 1);

    const fresh = await openFakeTab(registry);
    expect(fresh.load.getSlot(0)).toBeNull();
    expect(fresh.save.activeSlotIndex).toBeNull();
    expect(fresh.session.notice).toEqual({kind: 'busy'});

    // La sauvegarde automatique d'une page ouverte directement n'écrase rien.
    fresh.autoSave.autoSave('create-eval');
    expect(names(a.load.getSlot(1))).toEqual(['A1']);
    expect(JSON.parse(localStorage.getItem(SHARED_KEYS.working)!).nomEval).withContext('copie partagée intacte').toBe('Alpha');
  });

  it('onglet dupliqué : copie non liée avec un message, l\'onglet d\'origine garde le lien et ses données', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(1, evaluation('Alpha', ['A1']));
    await load(a, 1);

    const duplicate = await openFakeTab(registry, a.storage.copy()); // « Dupliquer l'onglet »
    expect(duplicate.session.tabId).not.toBe(a.session.tabId);
    expect(duplicate.session.notice).toEqual({kind: 'duplicated', slot: 1});
    expect(duplicate.load.getSlot(0)?.nomEval).toBe('Alpha');
    expect(duplicate.save.activeSlotIndex).toBeNull();
    expect(a.save.activeSlotIndex).toBe(1);

    addScreen(duplicate, 'dans le doublon');
    duplicate.autoSave.autoSave('create-eval');
    addScreen(a, 'A2');
    a.autoSave.autoSave('create-eval');
    expect(names(a.load.getSlot(1))).toEqual(['A1', 'A2']);
    expect(names(duplicate.load.getSlot(0))).toEqual(['A1', 'dans le doublon']);
  });

  it('rechargement d\'un onglet lié : même identifiant, lien repris, aucun message', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(2, evaluation('Beta', ['B1']));
    await load(a, 2);
    const id = a.session.tabId;

    a.close();
    const reloaded = await openFakeTab(registry, a.storage);
    expect(reloaded.session.tabId).toBe(id);
    expect(reloaded.save.activeSlotIndex).toBe(2);
    expect(reloaded.session.notice).toBeNull();
    expect(registry.isHeld('gazeplay-eval.slot.2')).toBeTrue();
  });

  it('lien d\'un onglet rechargé vers un emplacement supprimé entre-temps : abandonné sans erreur', async () => {
    const a = await openFakeTab(registry);
    a.save.saveToSlot(2, evaluation('Beta', ['B1']));
    await load(a, 2);
    a.close();
    localStorage.removeItem('save2');

    const reloaded = await openFakeTab(registry, a.storage);
    expect(reloaded.save.activeSlotIndex).toBeNull();
    expect(reloaded.load.getSlot(0)?.nomEval).toBe('Beta');
  });

  it('anciennes données (version précédente : saveAuto + lien en sessionStorage) : reprises telles quelles', async () => {
    localStorage.setItem('saveAuto', JSON.stringify(evaluation('Ancienne', ['X1', 'X2'])));
    localStorage.setItem('save3', JSON.stringify(evaluation('Ancienne', ['X1'])));
    const legacyTab = new MemoryStorage();
    legacyTab.setItem(TAB_KEYS.slot, '3');

    const tab = await openFakeTab(registry, legacyTab);
    expect(names(tab.load.getSlot(0))).toEqual(['X1', 'X2']);
    expect(tab.save.activeSlotIndex).toBe(3);
    expect(names(tab.load.getSlot(3))).toEqual(['X1']);
    expect(JSON.parse(localStorage.getItem('save3')!).nomEval).toBe('Ancienne'); // format inchangé
  });

  it('la copie partagée garde le format des sauvegardes et n\'est pas écrasée par une évaluation vide d\'un autre onglet', async () => {
    const a = await openFakeTab(registry);
    a.save.newSaveDataAuto();
    a.save.dataAuto.nomEval = 'Alpha';
    a.save.saveToSlot(0, a.save.dataAuto);
    const b = await openFakeTab(registry); // démarre vide : A est ouvert
    b.save.newSaveDataAuto();               // évaluation vide dans B

    const shared = JSON.parse(localStorage.getItem(SHARED_KEYS.working)!);
    expect(shared.nomEval).toBe('Alpha');
    expect(Object.keys(shared)).toEqual(jasmine.arrayContaining(['nomEval', 'format', 'listScreens', 'createdAt', 'version']));
  });

  it('nettoyage des médias : un média utilisé par l\'évaluation d\'un autre onglet n\'est jamais considéré comme inutilisé', async () => {
    const a = await openFakeTab(registry);
    const b = await openFakeTab(registry);
    b.save.newSaveDataAuto();
    b.save.dataAuto.nomEval = 'Beta';
    b.save.dataAuto.listScreens = [{name: 'Consigne', type: 'instruction', values: [true, 5, true, 'Image', 'chat.png', undefined, false, 1, 'Beta/chat.png']}] as any;
    b.save.saveToSlot(0, b.save.dataAuto);
    // A travaille sur autre chose et devient la dernière évaluation en cours
    a.save.newSaveDataAuto();
    a.save.dataAuto.nomEval = 'Alpha';
    addScreen(a, 'A1');
    a.save.saveToSlot(0, a.save.dataAuto);

    const refs = a.cleanup.collectAllReferences();
    expect(isReferenced('Beta/chat.png', refs)).toBeTrue();
    expect(localStorage.getItem(TAB_MEDIA_PREFIX + b.session.tabId)).not.toBeNull();

    b.save.clearSlot(0); // « Abandonner les modifications » dans B
    expect(localStorage.getItem(TAB_MEDIA_PREFIX + b.session.tabId)).toBeNull();
    expect(isReferenced('Beta/chat.png', collectMediaReferences(a.load.getSlot(0)))).toBeFalse();
  });

  it('sans API Web Locks : chaque onglet garde sa propre évaluation (isolation conservée)', async () => {
    const withoutLocks = async (storage = new MemoryStorage()) => {
      const tab = await openFakeTab(registry, storage, [{provide: (await import('./tab-session.service')).TAB_LOCKS, useValue: null}]);
      return tab;
    };
    const a = await withoutLocks();
    a.save.newSaveDataAuto();
    a.save.dataAuto.nomEval = 'Alpha';
    a.save.saveToSlot(0, a.save.dataAuto);
    const b = await withoutLocks();
    b.save.newSaveDataAuto();
    b.save.dataAuto.nomEval = 'Beta';
    b.save.saveToSlot(0, b.save.dataAuto);

    expect(a.load.getSlot(0)?.nomEval).toBe('Alpha');
    expect(b.load.getSlot(0)?.nomEval).toBe('Beta');
  });
});
