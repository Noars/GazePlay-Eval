import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {provideInMemoryPreferences} from '../../core/preferences/testing/in-memory-preferences.store';
import {FakeLockRegistry, FakeTab, openFakeTab} from '../../core/tab/testing/fake-tabs.spec';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';

/**
 * Scénarios de perte silencieuse reproduits dans l'application le 15/10/2026, rejoués avec les
 * vrais services (onglet simulé : son sessionStorage, ses verrous ; vrai localStorage partagé).
 * Seules la fenêtre de remplacement (réponse « Annuler » par défaut) et la génération de
 * fichier sont simulées.
 */
describe('OverwriteGuardService : scénarios de remplacement', () => {
  let registry: FakeLockRegistry;

  function evaluation(nomEval: string, screens: string[]): Omit<saveModel, 'createdAt' | 'version'> {
    return {
      nomEval, format: 'Csv&Xlsx', infoParticipant: ['Nom'], globalParamsTransitionScreen: [true, 10, false, false, 0],
      globalParamsInstructionScreen: [true, 10, false, 'Image', false, 1], globalParamsStimuliScreen: [1, 1, false, 10, 1, 1, false, false],
      listScreens: screens.map(name => ({name, type: 'transition', values: [true, 2, true, true, 1]})) as any, step: 3,
    };
  }

  const screensOf = (tab: FakeTab, index: FormatTypeConfig) => tab.load.getSlot(index)?.listScreens.map(s => s.name) ?? null;

  /** Ouvre une sauvegarde dans l'onglet comme Charger : chargement, lien, écriture du slot 0. */
  async function openSlot(tab: FakeTab, index: FormatTypeConfig): Promise<void> {
    const opening = await tab.guard.reserveForOpening(index);
    tab.save.loadIntoWorkspace(tab.load.getSlot(index)!);
    tab.save.setActiveSlot(opening?.mode === 'link' ? index : null, opening?.mode === 'link' ? opening.reservation : null);
    tab.save.saveToSlot(0, tab.save.dataAuto);
  }

  beforeEach(() => {
    localStorage.clear();
    registry = new FakeLockRegistry();
    TestBed.configureTestingModule({providers: [provideRouter([]), provideInMemoryPreferences()]});
  });

  afterEach(() => localStorage.clear());

  it('A — nouvelle évaluation homonyme d\'une sauvegarde : la fenêtre s\'affiche et la sauvegarde est intacte', async () => {
    const tab = await openFakeTab(registry);
    tab.save.saveToSlot(1, evaluation('Test', ['A', 'B', 'C']));

    tab.save.newSaveDataAuto();          // « Nouvelle évaluation »
    tab.save.dataAuto.nomEval = 'Test';  // étape 1 : même nom qu'une sauvegarde
    tab.save.saveToSlot(0, tab.save.dataAuto);

    expect(await tab.guard.check(0)).toBeFalse(); // second « Nouvelle évaluation », annulé
    expect(tab.dialog.open).toHaveBeenCalledTimes(1);
    expect(screensOf(tab, 1)).toEqual(['A', 'B', 'C']);
  });

  it('B — import « Ouvrir » d\'un fichier homonyme : la fenêtre s\'affiche et la sauvegarde est intacte', async () => {
    const tab = await openFakeTab(registry);
    tab.save.saveToSlot(1, evaluation('évaluationImportation', ['T1', 'T2', 'T3', 'T4', 'T5']));

    const imported = evaluation('évaluationImportation', ['Ecran 1', 'Ecran 2', 'Ecran 3']);
    tab.save.saveDataAuto(imported.nomEval, imported.format, imported.infoParticipant, imported.globalParamsTransitionScreen,
      imported.globalParamsInstructionScreen, imported.globalParamsStimuliScreen, imported.listScreens, 0); // LoadZipService.loadZip
    tab.save.setActiveSlot(null);

    expect(await tab.guard.check(0)).toBeFalse();
    expect(tab.dialog.open).toHaveBeenCalledTimes(1);
    expect(screensOf(tab, 1)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5']);
  });

  it('C — rechargement de l\'onglet puis réouverture du même emplacement : la modification est conservée', async () => {
    const first = await openFakeTab(registry);
    first.save.saveToSlot(1, evaluation('Test', ['A', 'B', 'C']));
    await openSlot(first, 1);

    first.close(); // rechargement : même sessionStorage, nouvelle page
    const reloaded = await openFakeTab(registry, first.storage);
    expect(reloaded.save.activeSlotIndex).withContext('le lien survit au rechargement').toBe(1);
    reloaded.save.dataAuto.listScreens = [...reloaded.save.dataAuto.listScreens, {name: 'D', type: 'transition', values: []} as any];
    reloaded.save.saveToSlot(0, reloaded.save.dataAuto);

    expect(await reloaded.guard.check(0)).toBeTrue(); // Charger › emplacement 1
    expect(reloaded.dialog.open).not.toHaveBeenCalled();
    expect(screensOf(reloaded, 1)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('C bis — évaluation en cours non liée et plus récente que l\'emplacement homonyme : la fenêtre s\'affiche', async () => {
    const tab = await openFakeTab(registry);
    tab.save.saveToSlot(1, evaluation('Test', ['A', 'B', 'C']));
    tab.save.loadIntoWorkspace({...evaluation('Test', ['A', 'B', 'C', 'D']), createdAt: '', version: 1});
    tab.save.saveToSlot(0, tab.save.dataAuto);

    expect(await tab.guard.check(0)).toBeFalse();
    expect(tab.dialog.open).toHaveBeenCalledTimes(1);
    expect(screensOf(tab, 1)).toEqual(['A', 'B', 'C']);
  });

  it('D — nouvel onglet (onglet précédent fermé) puis « Nouvelle évaluation » : l\'emplacement n\'est jamais vidé', async () => {
    const first = await openFakeTab(registry);
    first.save.saveToSlot(1, evaluation('Travail', ['T1', 'T2', 'T3']));
    await openSlot(first, 1);
    first.close();

    const fresh = await openFakeTab(registry); // nouvel onglet : reprise de la dernière évaluation
    expect(fresh.save.hasLoadedWorkspace).toBeTrue();
    expect(await fresh.guard.check(0)).toBeTrue();
    expect(screensOf(fresh, 1)).toEqual(['T1', 'T2', 'T3']);
  });

  it('E — « Remplacer par l\'évaluation en cours » sur une autre évaluation : confirmation demandée', async () => {
    const tab = await openFakeTab(registry);
    tab.save.saveToSlot(1, evaluation('Important', ['I1', 'I2', 'I3', 'I4']));
    tab.save.loadIntoWorkspace({...evaluation('Brouillon', ['B1']), createdAt: '', version: 1});
    tab.save.saveToSlot(0, tab.save.dataAuto);

    expect(await tab.guard.check(1, {replacingWithCurrent: true})).toBeFalse();
    expect(tab.dialog.open).toHaveBeenCalledTimes(1);
    expect(screensOf(tab, 1)).toEqual(['I1', 'I2', 'I3', 'I4']);
  });

  it('cas normal — évaluation liée remplacée par « Nouvelle évaluation » : reportée sans question', async () => {
    const tab = await openFakeTab(registry);
    tab.save.saveToSlot(1, evaluation('Test', ['A']));
    await openSlot(tab, 1);
    tab.save.dataAuto.listScreens = [...tab.save.dataAuto.listScreens, {name: 'B', type: 'transition', values: []} as any];

    expect(await tab.guard.check(0)).toBeTrue();
    expect(tab.dialog.open).not.toHaveBeenCalled();
    expect(screensOf(tab, 1)).toEqual(['A', 'B']);
  });

  describe('évaluation sans nom', () => {
    async function unnamedWithScreens(): Promise<FakeTab> {
      const tab = await openFakeTab(registry);
      tab.save.newSaveDataAuto();
      tab.save.dataAuto.listScreens = [{name: 'Ecran 1', type: 'transition', values: [true, 2, true, true, 1]}] as any;
      tab.save.saveToSlot(0, tab.save.dataAuto);
      return tab;
    }

    it('réellement vide (nouvelle évaluation non modifiée) : remplacée sans fenêtre', async () => {
      const tab = await openFakeTab(registry);
      tab.save.newSaveDataAuto();

      expect(await tab.guard.check(0)).toBeTrue();
      expect(tab.dialog.open).not.toHaveBeenCalled();
    });

    it('sans nom mais avec des écrans : la fenêtre de confirmation s\'affiche', async () => {
      const tab = await unnamedWithScreens();

      await tab.guard.check(0);

      expect(tab.dialog.open).toHaveBeenCalledTimes(1);
    });

    it('sans nom, avec des écrans, « Annuler » : l\'évaluation en cours reste intacte', async () => {
      const tab = await unnamedWithScreens();

      const go = await tab.guard.check(0);

      expect(go).toBeFalse(); // l'appelant (Nouvelle évaluation, Ouvrir, Charger, Importer) s'arrête
      expect(tab.load.getSlot(0)?.listScreens.map(s => s.name)).toEqual(['Ecran 1']);
      expect(tab.save.dataAuto.listScreens.length).toBe(1);
    });

    it('sans nom, avec des écrans, « Remplacer sans télécharger » : le remplacement a lieu', async () => {
      const tab = await unnamedWithScreens();
      tab.dialog.open.and.returnValue({afterClosed: () => of('overwrite')} as any);

      expect(await tab.guard.check(0)).toBeTrue();
      tab.save.newSaveDataAuto(); // suite de « Nouvelle évaluation »
      expect(tab.load.getSlot(0)?.listScreens).toEqual([]);
    });

    it('sans nom, avec des écrans, « Télécharger puis remplacer » : téléchargement puis remplacement', async () => {
      const tab = await unnamedWithScreens();
      tab.dialog.open.and.returnValue({afterClosed: () => of('download')} as any);
      const download = (tab.guard as any).downloadService.generateSlotZip as jasmine.Spy;

      expect(await tab.guard.check(0)).toBeTrue();
      expect(download).toHaveBeenCalledWith(jasmine.objectContaining({listScreens: [jasmine.objectContaining({name: 'Ecran 1'})]}));
    });

    it('sans nom, seulement des champs participant ou des paramètres modifiés : protégée aussi', async () => {
      const tab = await openFakeTab(registry);
      tab.save.newSaveDataAuto();
      tab.save.dataAuto.infoParticipant = ['Prénom'];
      tab.save.saveToSlot(0, tab.save.dataAuto);
      expect(await tab.guard.check(0)).toBeFalse();

      tab.save.newSaveDataAuto();
      tab.save.dataAuto.globalParamsStimuliScreen = [2, 3, false, 10, 1, 1, false, false];
      tab.save.saveToSlot(0, tab.save.dataAuto);
      expect(await tab.guard.check(0)).toBeFalse();
      expect(tab.dialog.open).toHaveBeenCalledTimes(2);
    });

    it('emplacement enregistré sans nom mais avec du contenu : protégé', async () => {
      const tab = await openFakeTab(registry);
      tab.save.saveToSlot(2, evaluation('', ['X']));

      expect(await tab.guard.check(2)).toBeFalse();
      expect(screensOf(tab, 2)).toEqual(['X']);
    });
  });
});
