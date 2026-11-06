import {inject, Injectable, InjectionToken} from '@angular/core';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig, SAVE_SLOT_KEYS} from '../../shared/dataBaseConfig';
import {isEmptyEvaluation} from '../../shared/evaluation-content';

/** Stockage propre à l'onglet (sessionStorage) : survit au rechargement, copié par « Dupliquer l'onglet ». */
export const TAB_STORAGE = new InjectionToken<Storage | null>('TAB_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try { return sessionStorage; } catch { return null; }
  },
});

/** Stockage partagé par tous les onglets (localStorage). */
export const SHARED_STORAGE = new InjectionToken<Storage | null>('SHARED_STORAGE', {
  providedIn: 'root',
  factory: () => {
    try { return localStorage; } catch { return null; }
  },
});

/** API Web Locks : verrous libérés automatiquement à la fermeture de l'onglet. `null` si indisponible. */
export const TAB_LOCKS = new InjectionToken<LockManager | null>('TAB_LOCKS', {
  providedIn: 'root',
  factory: () => (typeof navigator !== 'undefined' && navigator.locks) ? navigator.locks : null,
});

/** Clés propres à l'onglet (sessionStorage). */
export const TAB_KEYS = {
  id: 'gazeplay-eval.tab-id',
  working: 'gazeplay-eval.tab-working',
  /** Même clé que l'ancien lien par onglet : un onglet ouvert avant la mise à jour le retrouve. */
  slot: 'gazeplay-eval.active-slot',
} as const;

/** Clés partagées (localStorage) accompagnant `saveAuto`, la dernière évaluation en cours. */
export const SHARED_KEYS = {
  working: SAVE_SLOT_KEYS.auto,
  slot: 'gazeplay-eval.active-slot',
  owner: 'gazeplay-eval.saveAuto-tab',
} as const;

/** Réservation d'un emplacement : adoptée par `setSlot`, ou libérée si l'action est annulée. */
export interface SlotReservation {
  readonly slot: FormatTypeConfig;
  release(): void;
}

/**
 * Préfixe localStorage des évaluations publiées par chaque onglet (`<préfixe><idOnglet>`), pour
 * que le nettoyage des médias d'un onglet n'efface jamais un média utilisé par un autre.
 */
export const TAB_MEDIA_PREFIX = 'gazeplay-eval.tab-media.';

/** Durée de conservation des publications d'un onglet fermé (il peut être restauré par le navigateur). */
const CLOSED_TAB_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Évaluation publiée pour l'inventaire des médias. */
export interface PublishedEvaluation {
  nomEval: string;
  listScreens: unknown;
  updatedAt: number;
}

/** Message à afficher une fois au démarrage de l'onglet. */
export type TabNotice =
  | {kind: 'duplicated'; slot: FormatTypeConfig | null}
  | {kind: 'busy'}
  | {kind: 'slotBusy'; slot: FormatTypeConfig};

const LOCK_PREFIX = 'gazeplay-eval';
const NO_RELEASE = () => undefined;

/**
 * État de travail propre à chaque onglet.
 *
 * - Propre à l'onglet (sessionStorage) : identifiant, évaluation en cours, lien vers un
 *   emplacement nommé. Deux onglets ne partagent donc jamais leur évaluation en cours.
 * - Partagé (localStorage) : les emplacements `save1`–`save3`, et `saveAuto`, copie de la
 *   dernière évaluation en cours modifiée (avec son lien et l'onglet qui l'a écrite), reprise
 *   par un nouvel onglet ou une nouvelle session si aucun onglet ouvert ne la modifie.
 * - Entre onglets vivants, des verrous Web Locks (`…tab.<id>`, `…slot.<n>`) indiquent quels
 *   onglets et quels emplacements sont en cours d'utilisation ; ils sont libérés
 *   automatiquement à la fermeture d'un onglet.
 *
 * Sans Web Locks (navigateur ancien, contexte non sécurisé), l'isolation par onglet reste
 * assurée mais les doublons d'onglets et les emplacements ouverts ailleurs ne sont pas détectés.
 */
@Injectable({providedIn: 'root'})
export class TabSessionService {
  private readonly tabStorage = inject(TAB_STORAGE);
  private readonly shared = inject(SHARED_STORAGE);
  private readonly locks = inject(TAB_LOCKS);

  /** Identifiant de cet onglet. */
  tabId = '';
  /** Évaluation en cours de cet onglet (format des sauvegardes), ou `null`. */
  working: saveModel | null = null;
  /** Emplacement nommé lié à l'évaluation de cet onglet. */
  slot: FormatTypeConfig | null = null;
  /** Message de démarrage éventuel (onglet dupliqué, évaluation ouverte ailleurs…). */
  notice: TabNotice | null = null;

  private initialized = false;
  /** Emplacement réservé par cet onglet (verrou détenu) et fonction qui le libère. */
  private claimedSlot: FormatTypeConfig | null = null;
  private slotRelease: (() => void) | null = null;

  /**
   * Prépare l'état de l'onglet (initialiseur d'application, avant le premier affichage) :
   * détecte un onglet dupliqué, reprend l'emplacement lié, ou adopte la dernière évaluation
   * en cours si aucun autre onglet ouvert ne la modifie.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    this.working = this.readJson(this.tabStorage, TAB_KEYS.working);
    this.slot = toSlot(this.tabStorage?.getItem(TAB_KEYS.slot));
    const knownTab = this.tabStorage?.getItem(TAB_KEYS.id) ?? null;

    // 1. Identité de l'onglet. Un doublon hérite de l'identifiant d'un onglet encore ouvert.
    let duplicated = false;
    if (knownTab && await this.hold(this.tabLock(knownTab))) {
      this.tabId = knownTab;
    } else {
      duplicated = knownTab !== null;
      this.tabId = newTabId();
      await this.hold(this.tabLock(this.tabId));
      this.tabStorage?.setItem(TAB_KEYS.id, this.tabId);
    }

    await this.pruneClosedTabs();

    if (this.working) {
      // 2a. L'onglet a déjà sa propre évaluation (rechargement ou doublon).
      this.publishMedia(this.working);
      if (duplicated) {
        this.notice = {kind: 'duplicated', slot: this.slot};
        this.setSlot(null);
      } else if (this.slot !== null && this.shared?.getItem(slotKey(this.slot)) === null) {
        this.setSlot(null); // emplacement vidé entre-temps
      } else if (this.slot !== null && !await this.claimSlot(this.slot)) {
        this.notice = {kind: 'slotBusy', slot: this.slot};
        this.setSlot(null);
      }
      return;
    }

    // 2b. Nouvel onglet : reprise de la dernière évaluation en cours, si personne ne la modifie.
    const latest = this.readJson(this.shared, SHARED_KEYS.working);
    if (!latest) {
      this.setSlot(null);
      return;
    }
    const owner = this.shared?.getItem(SHARED_KEYS.owner) ?? null;
    if (owner && owner !== this.tabId && await this.isHeld(this.tabLock(owner))) {
      this.notice = {kind: 'busy'};
      this.setSlot(null);
      return;
    }
    this.working = latest;
    this.writeTab(TAB_KEYS.working, JSON.stringify(latest));
    this.publishMedia(latest);
    // Lien : celui de cet onglet (ancienne version), sinon celui de la dernière évaluation.
    const link = this.slot ?? toSlot(this.shared?.getItem(SHARED_KEYS.slot));
    this.slot = null;
    if (link !== null && this.shared?.getItem(slotKey(link)) !== null && await this.claimSlot(link)) {
      this.setSlot(link);
    } else {
      this.setSlot(null);
    }
    this.markOwner();
  }

  /**
   * Initialisation sans verrous (tests, ou service créé avant l'initialiseur) : relit
   * simplement l'état de l'onglet.
   */
  ensureInitialized(): void {
    if (this.initialized) return;
    this.working = this.readJson(this.tabStorage, TAB_KEYS.working);
    this.slot = toSlot(this.tabStorage?.getItem(TAB_KEYS.slot));
    this.tabId = this.tabStorage?.getItem(TAB_KEYS.id) ?? newTabId();
  }

  /**
   * Enregistre l'évaluation en cours de l'onglet, et la publie comme dernière évaluation en
   * cours (reprise par un nouvel onglet ou une nouvelle session). Une évaluation encore vide
   * n'écrase jamais la copie publiée par un autre onglet.
   */
  writeWorking(save: saveModel): void {
    const json = JSON.stringify(save);
    this.working = JSON.parse(json);
    this.tabStorage?.setItem(TAB_KEYS.working, json); // erreur de quota propagée à l'appelant
    this.publishMedia(save);
    if (this.shared && (this.isOwner() || !isEmptyEvaluation(save) || this.shared.getItem(SHARED_KEYS.working) === null)) {
      this.shared.setItem(SHARED_KEYS.working, json);
      this.markOwner();
      this.publishSlot();
    }
  }

  /** Supprime l'évaluation en cours de l'onglet (et la copie partagée si elle vient de cet onglet). */
  clearWorking(): void {
    this.working = null;
    this.tabStorage?.removeItem(TAB_KEYS.working);
    this.unpublishMedia();
    if (this.shared && this.isOwner()) {
      this.shared.removeItem(SHARED_KEYS.working);
      this.shared.removeItem(SHARED_KEYS.owner);
      this.shared.removeItem(SHARED_KEYS.slot);
    }
    this.setSlot(null);
  }

  /**
   * Lie (ou délie) l'évaluation de l'onglet à un emplacement nommé. Avec `reservation`, le
   * verrou déjà obtenu pour cet emplacement est adopté (et celui de l'ancien lien libéré).
   */
  setSlot(slot: FormatTypeConfig | null, reservation?: SlotReservation | null): void {
    if (slot === null) {
      this.releaseSlot();
    } else if (this.claimedSlot !== slot) {
      if (reservation && reservation.slot === slot) {
        this.releaseSlot();
        this.claimedSlot = slot;
        this.slotRelease = () => reservation.release();
      } else {
        // lien posé sans réservation préalable : réservation en arrière-plan
        void this.claimSlot(slot);
      }
    }
    this.slot = slot;
    try {
      if (slot === null) this.tabStorage?.removeItem(TAB_KEYS.slot);
      else this.tabStorage?.setItem(TAB_KEYS.slot, String(slot));
    } catch {
      // stockage indisponible : le lien n'est simplement pas conservé au rechargement
    }
    if (this.isOwner()) this.publishSlot();
  }

  /**
   * Réserve un emplacement pour cet onglet. Faux s'il est déjà en cours de modification dans
   * un autre onglet ouvert. Vrai s'il est déjà réservé par cet onglet.
   */
  async claimSlot(slot: FormatTypeConfig): Promise<boolean> {
    if (this.claimedSlot === slot) return true;
    const release = await this.hold(this.slotLock(slot));
    if (!release) return false;
    this.releaseSlot();
    this.claimedSlot = slot;
    this.slotRelease = release;
    return true;
  }

  /**
   * Réserve un emplacement sans toucher au lien actuel : `null` s'il est en cours de
   * modification dans un autre onglet. Si l'action est annulée, appeler `release()`.
   */
  async reserveSlot(slot: FormatTypeConfig): Promise<SlotReservation | null> {
    if (this.claimedSlot === slot) return {slot, release: NO_RELEASE}; // déjà réservé par cet onglet
    const release = await this.hold(this.slotLock(slot));
    if (!release) return null;
    let released = false;
    return {
      slot,
      release: () => {
        if (released) return;
        released = true;
        release();
      },
    };
  }

  /** Vrai si un AUTRE onglet ouvert modifie actuellement cet emplacement. */
  async isSlotOpenElsewhere(slot: FormatTypeConfig): Promise<boolean> {
    if (this.claimedSlot === slot) return false;
    return this.isHeld(this.slotLock(slot));
  }

  private releaseSlot(): void {
    this.slotRelease?.();
    this.slotRelease = null;
    this.claimedSlot = null;
  }

  /**
   * Évaluations connues des autres onglets (publications par onglet et dernière évaluation en
   * cours partagée), à prendre en compte avant de supprimer un média.
   */
  otherTabsEvaluations(): PublishedEvaluation[] {
    const result: PublishedEvaluation[] = [];
    const storage = this.shared;
    if (!storage) return result;
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(TAB_MEDIA_PREFIX) || key === TAB_MEDIA_PREFIX + this.tabId) continue;
        const entry = this.parse<PublishedEvaluation>(storage.getItem(key));
        if (entry) result.push(entry);
      }
      const latest = this.readJson(storage, SHARED_KEYS.working);
      if (latest) result.push({nomEval: latest.nomEval, listScreens: latest.listScreens, updatedAt: Date.now()});
    } catch {
      // stockage illisible : inventaire limité à cet onglet et aux emplacements
    }
    return result;
  }

  private publishMedia(save: saveModel): void {
    try {
      const entry: PublishedEvaluation = {nomEval: save.nomEval, listScreens: save.listScreens, updatedAt: Date.now()};
      this.shared?.setItem(TAB_MEDIA_PREFIX + this.tabId, JSON.stringify(entry));
    } catch (error) {
      console.warn('Publication des médias de l\u2019onglet impossible :', error);
    }
  }

  private unpublishMedia(): void {
    try {
      this.shared?.removeItem(TAB_MEDIA_PREFIX + this.tabId);
    } catch {
      // sans conséquence : la publication sera remplacée ou expirera
    }
  }

  /** Supprime les publications des onglets fermés depuis plus de `CLOSED_TAB_RETENTION_MS`. */
  private async pruneClosedTabs(): Promise<void> {
    const storage = this.shared;
    if (!storage || !this.locks) return; // sans Web Locks, impossible de savoir si un onglet est fermé
    try {
      const now = Date.now();
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(TAB_MEDIA_PREFIX) && key !== TAB_MEDIA_PREFIX + this.tabId) keys.push(key);
      }
      for (const key of keys) {
        const entry = this.parse<PublishedEvaluation>(storage.getItem(key));
        const old = !entry || now - (entry.updatedAt ?? 0) > CLOSED_TAB_RETENTION_MS;
        if (old && !await this.isHeld(this.tabLock(key.slice(TAB_MEDIA_PREFIX.length)))) {
          storage.removeItem(key);
        }
      }
    } catch {
      // nettoyage facultatif
    }
  }

  private isOwner(): boolean {
    return (this.shared?.getItem(SHARED_KEYS.owner) ?? null) === this.tabId;
  }

  private markOwner(): void {
    this.shared?.setItem(SHARED_KEYS.owner, this.tabId);
  }

  private publishSlot(): void {
    if (!this.shared) return;
    if (this.slot === null) this.shared.removeItem(SHARED_KEYS.slot);
    else this.shared.setItem(SHARED_KEYS.slot, String(this.slot));
  }

  private tabLock(id: string): string {
    return `${LOCK_PREFIX}.tab.${id}`;
  }

  private slotLock(slot: FormatTypeConfig): string {
    return `${LOCK_PREFIX}.slot.${slot}`;
  }

  /**
   * Prend un verrou exclusif et le garde jusqu'à la fermeture de l'onglet (ou l'appel de la
   * fonction renvoyée). `null` si un autre onglet le détient. Sans Web Locks : toujours accordé.
   */
  private hold(name: string): Promise<(() => void) | null> {
    const locks = this.locks;
    if (!locks) return Promise.resolve(NO_RELEASE);
    return new Promise(resolve => {
      locks.request(name, {ifAvailable: true}, lock => {
        if (!lock) {
          resolve(null);
          return undefined;
        }
        return new Promise<void>(release => resolve(() => release()));
      }).catch(() => resolve(NO_RELEASE));
    });
  }

  /** Vrai si le verrou est détenu (par n'importe quel onglet). Sans Web Locks : jamais. */
  private async isHeld(name: string): Promise<boolean> {
    if (!this.locks) return false;
    try {
      const state = await this.locks.query();
      return (state.held ?? []).some(lock => lock.name === name);
    } catch {
      return false;
    }
  }

  private readJson(storage: Storage | null, key: string): saveModel | null {
    try {
      return this.parse<saveModel>(storage?.getItem(key));
    } catch {
      return null;
    }
  }

  private parse<T>(raw: string | null | undefined): T | null {
    try {
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  private writeTab(key: string, value: string): void {
    try {
      this.tabStorage?.setItem(key, value);
    } catch {
      // stockage de l'onglet plein : l'évaluation reste en mémoire pour cette page
    }
  }
}

function toSlot(raw: string | null | undefined): FormatTypeConfig | null {
  const value = Number(raw);
  return value === 1 || value === 2 || value === 3 ? value : null;
}

function slotKey(slot: FormatTypeConfig): string {
  return [SAVE_SLOT_KEYS.slot1, SAVE_SLOT_KEYS.slot2, SAVE_SLOT_KEYS.slot3][slot - 1];
}

function newTabId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
