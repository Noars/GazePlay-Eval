import {Component, ElementRef, inject, OnDestroy, OnInit, QueryList, ViewChildren} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {SaveService} from '../../services/save/save.service';
import {
  defaultInstructionScreenModel,
  defaultStimuliScreenModel,
  defaultTransitionScreenModel,
  instructionScreenConstModel,
  instructionScreenModel,
  screenTypeModel,
  stimuliScreenConstModel,
  stimuliScreenModel,
  transitionScreenConstModel,
  transitionScreenModel,
} from '../../shared/screenModel';
import {ModifyScreenComponent} from '../../components/modify-screen/modify-screen.component';
import {UpdateScreensService} from '../../services/updateScreens/update-screens.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {MediaLibraryService} from '../../core/media/media-library.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {FlashService} from '../../services/flash-message/flash.service';
import {I18nService, TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';
import {INSTRUCTION_MEDIA_OPTIONS} from '../../components/global-instruction-screen/global-instruction-screen.component';

type ScreenType = typeof transitionScreenConstModel | typeof instructionScreenConstModel | typeof stimuliScreenConstModel;

/** Libellés (clés de traduction) et icônes des types d'écrans. */
export const SCREEN_TYPES: {type: ScreenType, label: TranslationKey, icon: string, description: TranslationKey}[] = [
  {type: instructionScreenConstModel, label: 'screenType.instruction', icon: 'bi-chat-square-text', description: 'screenType.instruction.desc'},
  {type: stimuliScreenConstModel, label: 'screenType.stimuli', icon: 'bi-grid-3x3-gap', description: 'screenType.stimuli.desc'},
  {type: transitionScreenConstModel, label: 'screenType.transition', icon: 'bi-hourglass-split', description: 'screenType.transition.desc'},
];

/**
 * Étape 4 : liste des écrans de l'évaluation et aperçu de l'écran sélectionné.
 * L'édition détaillée d'un écran est déléguée à `ModifyScreenComponent`.
 */
@Component({
  selector: 'app-create-eval',
  imports: [FormsModule, CdkDropList, CdkDrag, CdkDragHandle, ModifyScreenComponent, TranslatePipe],
  templateUrl: './create-eval.component.html',
  standalone: true,
  styleUrl: './create-eval.component.css'
})
export class CreateEvalComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly saveService = inject(SaveService);
  private readonly updateScreenService = inject(UpdateScreensService);
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly media = inject(MediaLibraryService);
  private readonly confirmService = inject(ConfirmService);
  private readonly flashService = inject(FlashService);
  private readonly i18n = inject(I18nService);

  @ViewChildren('listScreenInputText') inputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly screenTypes = SCREEN_TYPES;

  isModifyScreen: boolean = false;
  listScreens: screenTypeModel[] = [];
  selectedScreen: screenTypeModel | null = null;
  indexSelectedScreen: number = -1;
  idScreen: number = 1;
  /** Index de l'écran en cours de renommage, ou -1. */
  renamingIndex = -1;
  /** Conservé pour compatibilité : vrai quand aucun renommage n'est en cours. */
  editNameScreenDisable: boolean = true;
  cellSize: number = 64;
  /** Message lu par les lecteurs d'écran après une action sur la liste. */
  announcement = '';

  /** Miniatures (data URLs réduites) des images de stimuli de l'écran prévisualisé. */
  cellImageUrls: { [key: number]: string } = {};
  /** Taille max (px) des miniatures générées pour la prévisualisation, pour limiter l'impact perf. */
  private readonly thumbnailMaxSize = 96;

  /** Index de la case dont le son est en cours de lecture, ou null si aucun. */
  playingSoundCell: number | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;

  /** Aperçu de l'écran d'instruction sélectionné (type de média, texte et URL du fichier). */
  instructionPreviewType: string = '';
  instructionPreviewText: string = '';
  instructionPreviewUrl: string = '';
  instructionSoundPlaying: boolean = false;
  private instructionPreviewObjectUrl: string | null = null;

  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;

  ngOnInit(): void {
    this.loadData();
    this.idScreen = this.listScreens.length + 1;
    if (this.listScreens.length > 0) {
      this.selectScreen(this.listScreens[0], 0);
    }
  }

  ngOnDestroy(): void {
    this.cellImageUrls = {};
    this.stopSound();
    this.clearInstructionPreview();
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.saveService.dataAuto.infoParticipant,
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.listScreens,
      this.saveService.dataAuto.step);
  }

  loadData(){
    this.listScreens = this.saveService.dataAuto.listScreens;
  }

  /**
   * Ajoute un écran du type demandé, pré-rempli avec les paramètres globaux, et le sélectionne.
   * @param type type d'écran (transition par défaut, comme auparavant).
   */
  addScreen(type: ScreenType = transitionScreenConstModel) {
    const name = this.defaultScreenName(this.nextScreenNumber());
    const newScreen = this.createScreen(type, name);
    this.listScreens.push(newScreen);
    this.selectScreen(newScreen, this.listScreens.length - 1);
    this.announcement = this.i18n.t('createEval.announce.added', {name, position: this.listScreens.length});

    this.autoSaveService.autoSave('create-eval');

    // Fait défiler la liste jusqu'au nouvel écran.
    setTimeout(() => {
      const item = document.getElementById(`screen-item-${this.listScreens.length - 1}`);
      item?.scrollIntoView({block: 'nearest'});
    }, 50);
  }

  selectScreen(screen: screenTypeModel, index: number) {
    this.selectedScreen = screen;
    this.indexSelectedScreen = index;
    void this.loadScreenPreview(screen);
  }

  /** Ouvre l'édition détaillée de l'écran donné. */
  editScreen(screen: screenTypeModel, index: number): void {
    this.selectScreen(screen, index);
    this.isModifyScreen = true;
  }

  /** Active (ou désactive) le renommage d'un écran et place le focus dans le champ. */
  editNameScreen(screen: screenTypeModel, value: boolean, index: number) {
    this.selectedScreen = screen;
    this.indexSelectedScreen = index;
    this.editNameScreenDisable = value;
    this.renamingIndex = value ? -1 : index;
    if (!value) {
      setTimeout(() => {
        const input = this.inputs.find(ref => ref.nativeElement.dataset['index'] === String(index));
        input?.nativeElement.focus();
        input?.nativeElement.select();
      }, 0);
    }
  }

  /** Termine le renommage (Entrée, Échap ou perte du focus). */
  exitInputScreen() {
    const index = this.renamingIndex;
    this.editNameScreenDisable = true;
    this.renamingIndex = -1;
    if (index >= 0) {
      const screen = this.listScreens[index];
      if (screen && !screen.name.trim()) {
        screen.name = this.defaultScreenName(index + 1);
      }
      this.saveData();
      setTimeout(() => document.getElementById(`screen-rename-${index}`)?.focus());
    }
  }

  /**
   * Supprime un écran après confirmation. Les médias qu'il utilisait sont libérés
   * (et supprimés seulement si plus aucune évaluation ne les référence).
   */
  async removeScreen(screen: screenTypeModel, askConfirmation = true) {
    if (askConfirmation) {
      const confirmed = await this.confirmService.confirm({
        title: this.i18n.t('createEval.confirmDelete.title', {name: screen.name}),
        message: this.i18n.t('createEval.confirmDelete.message'),
        confirmLabel: this.i18n.t('createEval.confirmDelete.confirm'),
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    const removedIndex = this.listScreens.indexOf(screen);
    if (this.selectedScreen === screen) {
      this.selectedScreen = null;
      this.indexSelectedScreen = -1;
      this.cellImageUrls = {};
      this.stopSound();
      this.clearInstructionPreview();
    }
    this.listScreens = this.listScreens.filter(s => s !== screen);

    this.saveData();
    this.autoSaveService.autoSave('create-eval');
    this.announcement = this.i18n.t('createEval.announce.removed', {name: screen.name});

    void this.releaseScreenMedia(screen);

    // Le focus passe à l'écran voisin, ou au bouton d'ajout s'il n'y en a plus.
    if (this.listScreens.length > 0 && removedIndex >= 0) {
      const next = Math.min(removedIndex, this.listScreens.length - 1);
      this.selectScreen(this.listScreens[next], next);
      setTimeout(() => document.getElementById(`screen-select-${next}`)?.focus());
    } else {
      setTimeout(() => document.getElementById('add-screen-heading')?.focus());
    }
  }

  /**
   * Duplique un écran juste après l'original. Chaque média de la copie compte comme une
   * référence supplémentaire dans IndexedDB.
   */
  async duplicateScreen(screen: screenTypeModel, index: number): Promise<void> {
    let copy: screenTypeModel;
    try {
      copy = structuredClone(screen);
    } catch {
      // Un fichier en mémoire non clonable : on repart de la version sérialisée.
      copy = JSON.parse(JSON.stringify(screen));
    }
    copy.name = this.i18n.t('createEval.copyName', {name: screen.name});

    for (const id of this.mediaIdsOf(copy)) {
      try {
        await this.media.addReference(id);
      } catch {
        // média introuvable : la copie le résoudra comme l'original (par nom de fichier)
      }
    }

    this.listScreens.splice(index + 1, 0, copy);
    this.selectScreen(copy, index + 1);
    this.saveData();
    this.autoSaveService.autoSave('create-eval');
    this.announcement = this.i18n.t('createEval.announce.duplicated', {name: copy.name, position: index + 2});
    setTimeout(() => document.getElementById(`screen-select-${index + 1}`)?.focus());
  }

  /** Déplace un écran d'une position vers le haut (-1) ou le bas (+1) — alternative au glisser-déposer. */
  moveScreen(index: number, delta: -1 | 1): void {
    const target = index + delta;
    if (target < 0 || target >= this.listScreens.length) return;
    moveItemInArray(this.listScreens, index, target);
    if (this.indexSelectedScreen === index) {
      this.indexSelectedScreen = target;
    } else if (this.indexSelectedScreen === target) {
      this.indexSelectedScreen = index;
    }
    this.saveData();
    const name = this.listScreens[target].name;
    this.announcement = this.i18n.t('createEval.announce.moved', {name, position: target + 1, total: this.listScreens.length});
    setTimeout(() => {
      const button = document.getElementById(`screen-move-${delta < 0 ? 'up' : 'down'}-${target}`) as HTMLButtonElement | null;
      (button && !button.disabled ? button : document.getElementById(`screen-select-${target}`))?.focus();
    });
  }

  getNameCurrentScreen() {
    return this.selectedScreen?.name ?? '';
  }

  getTypeCurrentScreen() {
    return this.typeLabel(this.selectedScreen?.type);
  }

  /** Libellé lisible d'un type d'écran, dans la langue courante. */
  typeLabel(type: string | undefined): string {
    switch (type) {
      case transitionScreenConstModel:
        return this.i18n.t('screenType.transition.long');
      case instructionScreenConstModel:
        return this.i18n.t('screenType.instruction.long');
      case stimuliScreenConstModel:
        return this.i18n.t('screenType.stimuli.long');
      default:
        return '';
    }
  }

  typeIcon(type: string | undefined): string {
    return this.screenTypes.find(t => t.type === type)?.icon ?? 'bi-square';
  }

  /** Résumé court d'un écran pour la liste (ex. « Grille 2 × 3 »). */
  screenSummary(screen: screenTypeModel): string {
    const v = screen.values ?? [];
    switch (screen.type) {
      case stimuliScreenConstModel:
        return this.i18n.t('createEval.summary.grid', {rows: v[0] ?? 1, cols: v[1] ?? 1});
      case instructionScreenConstModel: {
        if (!v[2]) return this.i18n.t('createEval.summary.noMedia');
        const type = this.mediaTypeLabel(v[3]);
        if (v[3] === 'Texte') return type;
        return v[4]
          ? this.i18n.t('createEval.summary.media', {type, name: v[4]})
          : this.i18n.t('createEval.summary.mediaToChoose', {type});
      }
      case transitionScreenConstModel:
        return v[0] ? this.i18n.t('createEval.summary.pause', {seconds: v[1]}) : this.i18n.t('createEval.summary.pauseNoDelay');
      default:
        return '';
    }
  }

  getStimuliCells(): null[] {
    if (this.selectedScreen?.type !== stimuliScreenConstModel) {
      return [];
    }
    const rows = Number(this.selectedScreen.values[0]) || 0;
    const cols = Number(this.selectedScreen.values[1]) || 0;
    return Array.from({length: rows * cols}, () => null);
  }

  /** Vrai si au moins une case visible de l'écran sélectionné a un son. */
  hasSounds(): boolean {
    if (this.selectedScreen?.type !== stimuliScreenConstModel) return false;
    return (Object.values(this.selectedScreen.values[12] ?? {}) as any[]).some(cell => cell && !cell.hidden && cell.soundName);
  }

  onModifyScreenChange(event: { screen: screenTypeModel, flag: boolean }){
    this.listScreens[this.indexSelectedScreen] = event.screen;
    this.saveData();
    this.selectedScreen = event.screen;
    this.isModifyScreen = event.flag;
    void this.loadScreenPreview(event.screen);
    const index = this.indexSelectedScreen;
    setTimeout(() => document.getElementById(`screen-edit-button`)?.focus() ?? document.getElementById(`screen-select-${index}`)?.focus());
  }

  /** Prépare l'aperçu de l'écran sélectionné selon son type (stimuli ou instruction). */
  private async loadScreenPreview(screen: screenTypeModel): Promise<void> {
    await this.loadStimuliImages(screen);
    await this.loadInstructionPreview(screen);
  }

  /**
   * Charge le média (image, vidéo, son) ou le texte de l'écran d'instruction sélectionné
   * pour l'afficher dans le panneau de prévisualisation.
   */
  private async loadInstructionPreview(screen: screenTypeModel): Promise<void> {
    this.clearInstructionPreview();
    if (screen.type !== instructionScreenConstModel) return;
    // values[2] = "Ajouter un media" : si désactivé, l'écran n'a aucun contenu à prévisualiser.
    if (!screen.values[2]) return;

    const type = screen.values[3];
    this.instructionPreviewType = type;

    if (type === 'Texte') {
      this.instructionPreviewText = screen.values[4] || '';
      return;
    }

    const name = screen.values[4];
    if (!name) return;

    const expectedType = type === 'Video' ? 'video' : type === 'Son' ? 'sound' : 'image';
    let file: Blob | undefined = screen.values[5] instanceof Blob ? screen.values[5] : undefined;
    if (!file) {
      file = (await this.media.resolve(screen.values[8] || name, expectedType))?.file;
    }
    if (!(file instanceof Blob)) return;

    // L'écran a pu changer pendant la résolution asynchrone : on ignore les résultats périmés.
    if (this.selectedScreen !== screen) return;

    const url = URL.createObjectURL(file);
    this.instructionPreviewObjectUrl = url;
    this.instructionPreviewUrl = url;
  }

  /** Réinitialise l'aperçu d'instruction, stoppe le son et libère l'URL objet associée. */
  private clearInstructionPreview(): void {
    this.stopSound();
    if (this.instructionPreviewObjectUrl) {
      URL.revokeObjectURL(this.instructionPreviewObjectUrl);
      this.instructionPreviewObjectUrl = null;
    }
    this.instructionPreviewType = '';
    this.instructionPreviewText = '';
    this.instructionPreviewUrl = '';
  }

  /**
   * Charge les images des cases de l'écran stimuli sélectionné sous forme de miniatures
   * réduites (data URLs) pour la prévisualisation, afin de limiter l'impact sur les perfs.
   */
  private async loadStimuliImages(screen: screenTypeModel): Promise<void> {
    this.cellImageUrls = {};
    this.stopSound();
    if (screen.type !== stimuliScreenConstModel) return;

    const listScreen = screen.values[12] ?? {};
    const total = Number(screen.values[0]) * Number(screen.values[1]);
    for (let i = 0; i < total; i++) {
      const cell = listScreen[i];
      if (!cell || cell.hidden) continue;

      let file: Blob | undefined = cell.imageFile instanceof Blob ? cell.imageFile : undefined;
      if (!file && (cell.imageId || cell.imageName)) {
        file = (await this.media.resolve(cell.imageId || cell.imageName, 'image'))?.file;
      }

      if (file instanceof Blob) {
        try {
          // L'écran a pu changer pendant la résolution asynchrone : on ignore les résultats périmés.
          if (this.selectedScreen !== screen) return;
          this.cellImageUrls[i] = await this.generateThumbnail(file, this.thumbnailMaxSize);
        } catch {
          // miniature non générée : on garde le repli texte/icône
        }
      }
    }
  }

  /** Génère une miniature réduite (data URL PNG) d'une image, bornée à maxSize px. */
  private generateThumbnail(file: Blob, maxSize: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Chargement image impossible'));
      };
      img.src = url;
    });
  }

  /**
   * Lance (ou arrête si déjà en cours) la lecture du son de la case prévisualisée.
   * Un seul son joue à la fois : relancer une autre case coupe le précédent.
   */
  async toggleCellSound(cellIndex: number): Promise<void> {
    if (this.playingSoundCell === cellIndex) {
      this.stopSound();
      return;
    }
    this.stopSound();

    const screen = this.selectedScreen;
    if (!screen || screen.type !== stimuliScreenConstModel) return;
    const cell = screen.values[12][cellIndex];
    if (!cell || !cell.soundName) return;

    let file: Blob | undefined = cell.soundFile instanceof Blob ? cell.soundFile : undefined;
    if (!file && (cell.soundId || cell.soundName)) {
      file = (await this.media.resolve(cell.soundId || cell.soundName, 'sound'))?.file;
      if (file) cell.soundFile = file;
    }
    if (!(file instanceof Blob)) {
      this.flashService.show('warning', this.i18n.t('createEval.soundNotFound', {name: cell.soundName}));
      return;
    }

    // L'écran a pu changer pendant la résolution asynchrone : on ignore les résultats périmés.
    if (this.selectedScreen !== screen) return;

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onended = () => this.stopSound();
    audio.onerror = () => this.stopSound();
    this.currentAudio = audio;
    this.currentAudioUrl = url;
    this.playingSoundCell = cellIndex;
    try {
      await audio.play();
    } catch {
      this.stopSound();
    }
  }

  /**
   * Lance (ou arrête si déjà en cours) la lecture du son de l'écran d'instruction prévisualisé.
   * On réutilise l'URL d'aperçu déjà créée ; elle est libérée par clearInstructionPreview().
   */
  async toggleInstructionSound(): Promise<void> {
    if (this.instructionSoundPlaying) {
      this.stopSound();
      return;
    }
    this.stopSound();
    if (!this.instructionPreviewUrl) return;

    const audio = new Audio(this.instructionPreviewUrl);
    audio.onended = () => this.stopSound();
    audio.onerror = () => this.stopSound();
    // On ne renseigne pas currentAudioUrl : l'URL appartient à l'aperçu, pas à la lecture.
    this.currentAudio = audio;
    this.instructionSoundPlaying = true;
    try {
      await audio.play();
    } catch {
      this.stopSound();
    }
  }

  /** Arrête la lecture en cours et libère l'URL objet associée (si gérée par la lecture). */
  private stopSound(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = null;
    }
    this.playingSoundCell = null;
    this.instructionSoundPlaying = false;
  }

  drop(event: CdkDragDrop<screenTypeModel[]> | {previousIndex: number, currentIndex: number}) {
    const selected = this.selectedScreen;
    moveItemInArray(this.listScreens, event.previousIndex, event.currentIndex);
    this.indexSelectedScreen = selected ? this.listScreens.indexOf(selected) : event.currentIndex;
    this.saveData();
  }

  backToSetupEval() {
    this.saveData();
    void this.router.navigate(['/setup-eval']);
  }

  goToDownloadEval() {
    this.saveData()
    void this.router.navigate(['/download-eval']);
  }

  /** Crée un écran du type demandé à partir du modèle par défaut et des paramètres globaux. */
  private createScreen(type: ScreenType, name: string): screenTypeModel {
    const data = this.saveService.dataAuto;
    switch (type) {
      case instructionScreenConstModel:
        return this.updateScreenService.updateInstructionScreen(
          structuredClone(defaultInstructionScreenModel) as instructionScreenModel, name, data.globalParamsInstructionScreen);
      case stimuliScreenConstModel:
        return this.updateScreenService.updateStimuliScreen(
          structuredClone(defaultStimuliScreenModel) as stimuliScreenModel, name, data.globalParamsStimuliScreen);
      default:
        return this.updateScreenService.updateTransitionScreen(
          structuredClone(defaultTransitionScreenModel) as transitionScreenModel, name, data.globalParamsTransitionScreen);
    }
  }

  /**
   * Nom par défaut d'un écran (« Ecran N » en français, « Screen N » en anglais). Le nom est
   * une donnée de l'évaluation : il n'est plus retraduit si la langue change ensuite.
   */
  private defaultScreenName(number: number): string {
    return this.i18n.t('createEval.defaultName', {n: number});
  }

  /** Libellé traduit d'un type de média enregistré (`Image`, `Video`, `Texte`, `Son`). */
  private mediaTypeLabel(value: string): string {
    const key = INSTRUCTION_MEDIA_OPTIONS.find(option => option.value === value)?.labelKey;
    return key ? this.i18n.t(key) : String(value ?? '');
  }

  /** Prochain numéro libre pour le nom par défaut « Ecran N ». */
  private nextScreenNumber(): number {
    const used = new Set(this.listScreens.map(s => s.name));
    let number = Math.max(this.idScreen, this.listScreens.length + 1);
    while (used.has(this.defaultScreenName(number))) number++;
    this.idScreen = number + 1;
    return number;
  }

  /** Identifiants IndexedDB des médias utilisés par un écran. */
  private mediaIdsOf(screen: screenTypeModel): string[] {
    return this.mediaRefsOf(screen).map(ref => ref.id).filter(Boolean);
  }

  private mediaRefsOf(screen: screenTypeModel): {id: string, name: string, type: 'image' | 'sound' | 'video'}[] {
    const v = screen.values ?? [];
    const refs: {id: string, name: string, type: 'image' | 'sound' | 'video'}[] = [];
    if (screen.type === instructionScreenConstModel && v[3] !== 'Texte' && (v[8] || v[4])) {
      refs.push({id: v[8] || '', name: v[4] || '', type: v[3] === 'Video' ? 'video' : v[3] === 'Son' ? 'sound' : 'image'});
    }
    if (screen.type === stimuliScreenConstModel) {
      if (v[13] || v[10]) refs.push({id: v[13] || '', name: v[10] || '', type: 'sound'});
      for (const cell of Object.values(v[12] ?? {}) as any[]) {
        if (!cell || cell.hidden) continue;
        if (cell.imageId || cell.imageName) refs.push({id: cell.imageId || '', name: cell.imageName || '', type: 'image'});
        if (cell.soundId || cell.soundName) refs.push({id: cell.soundId || '', name: cell.soundName || '', type: 'sound'});
      }
    }
    return refs;
  }

  /** Libère les médias d'un écran supprimé (sans jamais effacer un média encore utilisé). */
  private async releaseScreenMedia(screen: screenTypeModel): Promise<void> {
    for (const ref of this.mediaRefsOf(screen)) {
      try {
        await this.media.release(ref.id || ref.name, ref.type);
      } catch (error) {
        console.warn('Libération de média ignorée :', error);
      }
    }
  }
}
