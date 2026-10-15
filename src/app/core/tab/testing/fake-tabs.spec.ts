/** Outils de test (onglets simulés). Nommé « .spec.ts » pour être exclu de la compilation de l'application. */
import {EnvironmentInjector, Injector, Provider} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {SHARED_STORAGE, TAB_LOCKS, TAB_STORAGE, TabSessionService} from '../tab-session.service';
import {SaveService} from '../../../services/save/save.service';
import {LoadService} from '../../../services/load/load.service';
import {OverwriteGuardService} from '../../../services/overwrite-guard/overwrite-guard.service';
import {DownloadService} from '../../../services/download/download.service';
import {FlashService} from '../../../services/flash-message/flash.service';
import {ConfirmService} from '../../../shared/ui/confirm-dialog/confirm-dialog.component';
import {MediaCleanupService} from '../../media/media-cleanup.service';
import {IndexedDBService} from '../../../services/indexedDB/indexed-db.service';
import {AutoSaveService} from '../../../services/auto-save/auto-save.service';

/** Stockage en mémoire (sessionStorage d'un onglet simulé). */
export class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.has(key) ? this.data.get(key)! : null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, String(value)); }
  /** Copie, comme « Dupliquer l'onglet ». */
  copy(): MemoryStorage {
    const copy = new MemoryStorage();
    this.data.forEach((value, key) => copy.setItem(key, value));
    return copy;
  }
}

/**
 * Verrous Web Locks partagés entre onglets simulés. Chaque onglet a son `LockManager` ;
 * `closeTab` libère tous ses verrous, comme la fermeture d'un onglet réel.
 */
export class FakeLockRegistry {
  private readonly held = new Map<string, {owner: number; release: () => void}>();
  private nextTab = 1;

  forTab(): {locks: LockManager; close: () => void} {
    const owner = this.nextTab++;
    const locks = {
      request: (name: string, options: LockOptions, callback: (lock: Lock | null) => unknown) => {
        if (options?.ifAvailable && this.held.has(name)) {
          return Promise.resolve(callback(null));
        }
        return new Promise(resolve => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            if (this.held.get(name)?.owner === owner) this.held.delete(name);
            resolve(undefined);
          };
          this.held.set(name, {owner, release: finish});
          Promise.resolve(callback({name, mode: 'exclusive'} as Lock)).then(finish, finish);
        });
      },
      query: () => Promise.resolve({held: [...this.held.keys()].map(name => ({name, mode: 'exclusive'})), pending: []}),
    } as unknown as LockManager;
    const close = () => {
      for (const [name, lock] of [...this.held.entries()]) {
        if (lock.owner === owner) lock.release();
        if (this.held.get(name)?.owner === owner) this.held.delete(name);
      }
    };
    return {locks, close};
  }

  isHeld(name: string): boolean {
    return this.held.has(name);
  }
}

/** Onglet simulé : ses propres services, son sessionStorage, ses verrous ; localStorage réel partagé. */
export interface FakeTab {
  storage: MemoryStorage;
  session: TabSessionService;
  save: SaveService;
  load: LoadService;
  guard: OverwriteGuardService;
  cleanup: MediaCleanupService;
  autoSave: AutoSaveService;
  dialog: jasmine.SpyObj<MatDialog>;
  confirm: jasmine.SpyObj<ConfirmService>;
  flash: jasmine.SpyObj<FlashService>;
  close: () => void;
}

/**
 * Ouvre un onglet simulé et exécute son initialisation (comme l'initialiseur d'application).
 * La fenêtre de remplacement répond « Annuler » et la confirmation « non » par défaut.
 * Le TestBed doit fournir le routeur et les préférences (`provideRouter`, `provideInMemoryPreferences`).
 */
export async function openFakeTab(registry: FakeLockRegistry, storage = new MemoryStorage(), extra: Provider[] = []): Promise<FakeTab> {
  const {locks, close} = registry.forTab();
  const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
  dialog.open.and.returnValue({afterClosed: () => of(null)} as any);
  const confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['confirm']);
  confirm.confirm.and.resolveTo(false);
  const flash = jasmine.createSpyObj<FlashService>('FlashService', ['show']);
  const download = jasmine.createSpyObj<DownloadService>('DownloadService', ['generateSlotZip']);
  download.generateSlotZip.and.resolveTo(true);
  const idb = jasmine.createSpyObj<IndexedDBService>('IndexedDBService', ['getAllFiles', 'deleteFile']);

  const injector = Injector.create({
    parent: TestBed.inject(EnvironmentInjector),
    providers: [
      TabSessionService, SaveService, LoadService, OverwriteGuardService, MediaCleanupService, AutoSaveService,
      {provide: TAB_STORAGE, useValue: storage},
      {provide: SHARED_STORAGE, useValue: localStorage},
      {provide: TAB_LOCKS, useValue: locks},
      {provide: MatDialog, useValue: dialog},
      {provide: ConfirmService, useValue: confirm},
      {provide: FlashService, useValue: flash},
      {provide: DownloadService, useValue: download},
      {provide: IndexedDBService, useValue: idb},
      ...extra,
    ],
  });
  const session = injector.get(TabSessionService);
  await session.init();
  return {
    storage, session,
    save: injector.get(SaveService),
    load: injector.get(LoadService),
    guard: injector.get(OverwriteGuardService),
    cleanup: injector.get(MediaCleanupService),
    autoSave: injector.get(AutoSaveService),
    dialog, confirm, flash, close,
  };
}
