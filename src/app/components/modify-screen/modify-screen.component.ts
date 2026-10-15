import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
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
  transitionScreenModel
} from '../../shared/screenModel';
import {FormsModule} from '@angular/forms';
import {DecimalPipe} from '@angular/common';
import {UpdateScreensService} from '../../services/updateScreens/update-screens.service';
import {SaveService} from '../../services/save/save.service';
import {ConfigStimuliComponent} from '../config-stimuli/config-stimuli.component';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {MediaLibraryService, MediaType} from '../../core/media/media-library.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {GlobalTransitionScreenComponent} from '../global-transition-screen/global-transition-screen.component';
import {ChoiceOption, ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {NumberSettingComponent} from '../../shared/ui/number-setting/number-setting.component';
import {HelpTipComponent} from '../../shared/ui/help-tip/help-tip.component';
import {FilePickerComponent} from '../../shared/ui/file-picker/file-picker.component';
import {INSTRUCTION_MEDIA_OPTIONS} from '../global-instruction-screen/global-instruction-screen.component';
import {I18nService, TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Opération sur un média, enregistrée pour pouvoir être annulée.
 *  - `acquire` : une référence a été ajoutée immédiatement (duplication) ;
 *  - `release` : une référence doit être libérée, mais seulement à la sortie de l'éditeur,
 *    pour qu'une annulation retrouve toujours le fichier.
 */
interface MediaJournalEntry {
  kind: 'acquire' | 'release';
  ref: string;
  type: MediaType;
}

interface GridSnapshot {
  rows: number;
  cols: number;
  cells: { [key: number]: any };
  /** Longueur du journal des médias au moment de l'instantané. */
  journalLength: number;
}

type ScreenKind = typeof transitionScreenConstModel | typeof instructionScreenConstModel | typeof stimuliScreenConstModel;

/**
 * Éditeur d'un écran (transition, instruction ou stimuli).
 *
 * Le contenu est modifié directement dans `screenToModify.values` (tableau positionnel,
 * voir `shared/screenModel.ts` et `CLAUDE.md`) : les index ne doivent pas être décalés.
 *
 * Pour les stimuli, l'éditeur gère une grille de cases (`values[12]`) avec des modes
 * d'édition exclusifs (dupliquer, échanger, sélection multiple, supprimer), un historique
 * d'annulation de 20 étapes et un mode visualisation. La case active est configurée dans
 * le panneau `app-config-stimuli`.
 */
@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule,
    ConfigStimuliComponent,
    GlobalTransitionScreenComponent,
    ChoiceSettingComponent,
    NumberSettingComponent,
    HelpTipComponent,
    FilePickerComponent,
    DecimalPipe,
    TranslatePipe,
  ],
  templateUrl: './modify-screen.component.html',
  standalone: true,
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent implements OnInit, OnDestroy {
  private readonly updateScreenService = inject(UpdateScreensService);
  private readonly saveService = inject(SaveService);
  private readonly autoSaveService = inject(AutoSaveService);
  private readonly media = inject(MediaLibraryService);
  private readonly flashService = inject(FlashService);
  private readonly confirmService = inject(ConfirmService);
  private readonly i18n = inject(I18nService);

  readonly screenKinds: {type: ScreenKind, label: TranslationKey, icon: string}[] = [
    {type: instructionScreenConstModel, label: 'screenType.instruction', icon: 'bi-chat-square-text'},
    {type: stimuliScreenConstModel, label: 'screenType.stimuli', icon: 'bi-grid-3x3-gap'},
    {type: transitionScreenConstModel, label: 'screenType.transition', icon: 'bi-hourglass-split'},
  ];
  readonly mediaTypeOptions = INSTRUCTION_MEDIA_OPTIONS;
  /** Valeurs `Tout` / `BonneReponse` exportées telles quelles ; seuls les libellés sont traduits. */
  readonly selectionChoiceOptions: ChoiceOption<string>[] = [
    {value: 'Tout', labelKey: 'editor.selectionChoice.all'},
    {value: 'BonneReponse', labelKey: 'editor.selectionChoice.good'},
  ];

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<{ screen: screenTypeModel, flag: boolean }>();

  actualTypeScreen: string = "";
  typeFile: string = "";
  nameFile: string = "";
  haveInstructionFile: boolean = false;
  haveStimuliSoundFile: boolean = false;
  instructionFile: any = "";
  stimuliFile: any = "";
  textToRead: string = '';
  fileDuration: number = 0;
  showWarningMessage: boolean = false;
  private instructionObjectUrl: string | null = null;
  private stimuliObjectUrl: string | null = null;

  dataStimuli!: {
    cell: number;
    screen: any;
    rows: number;
    cols: number;
  }
  /** Vrai lorsqu'une case est ouverte dans le panneau de configuration. */
  stimuliOffcanvasReady: boolean = false;
  configStimuliOpen: boolean = false;
  activeCellIndex: number | null = null;
  /** Case qui reçoit le focus clavier dans la grille (navigation aux flèches). */
  focusedCellIndex = 0;
  duplicateMode: boolean = false;
  deleteMode: boolean = false;
  duplicateSourceIndex: number | null = null;
  pendingDuplicateTarget: number | null = null;
  swapMode: boolean = false;
  swapSourceIndex: number | null = null;
  cellSize: number = 88;
  private readonly minCellSize = 48;
  private readonly maxCellSize = 168;
  gridMaxHeight: number = 0;
  multiSelectMode: boolean = false;
  visualizationMode: boolean = false;
  cellImageUrls: { [key: number]: string } = {};
  /** Index de la case dont le son est en cours de lecture en mode visualisation, ou null. */
  playingSoundCell: number | null = null;
  private currentCellAudio: HTMLAudioElement | null = null;
  private currentCellAudioUrl: string | null = null;
  selectedCells: Set<number> = new Set<number>();
  pendingDeleteCells: number[] | null = null;
  private undoHistory: GridSnapshot[] = [];
  private readonly maxUndoHistory = 20;
  /** Opérations sur les médias depuis l'ouverture de l'éditeur (voir MediaJournalEntry). */
  private mediaJournal: MediaJournalEntry[] = [];
  /** Message lu par les lecteurs d'écran après une action sur la grille. */
  announcement = '';

  ngOnInit(): void {
    this.actualTypeScreen = this.screenToModify.type;
    if (window.innerWidth < 576) {
      this.cellSize = 64;
    }
    void this.initializeMediaState();
    this.updateGridViewport();
  }

  ngOnDestroy(): void {
    this.clearCellImageUrls();
    this.stopCellSound();
    this.setInstructionPreview('');
    this.setStimuliPreview('');
    void this.commitMediaJournal();
  }

  @HostListener('window:resize')
  updateGridViewport(): void {
    // Hauteur max de la zone grille basée sur l'écran : ~65 % de la hauteur visible.
    this.gridMaxHeight = Math.max(Math.round(window.innerHeight * 0.65), 240);
  }

  private async initializeMediaState(): Promise<void> {
    this.haveInstructionFile = await this.checkInstructionFileExist();
    this.haveStimuliSoundFile = await this.checkStimuliSoundFileExist();
  }

  // ---------------------------------------------------------------------------
  // Type d'écran
  // ---------------------------------------------------------------------------

  /** Vrai si l'écran contient du contenu qui serait perdu en changeant de type. */
  hasContent(): boolean {
    const v = this.screenToModify.values ?? [];
    if (this.screenToModify.type === instructionScreenConstModel) {
      return !!v[4];
    }
    if (this.screenToModify.type === stimuliScreenConstModel) {
      return !!v[10] || (Object.values(v[12] ?? {}) as any[]).some(cell => cell && (cell.imageName || cell.soundName));
    }
    return false;
  }

  /** Demande un changement de type, avec confirmation si du contenu serait perdu. */
  async requestTypeChange(type: ScreenKind): Promise<void> {
    if (type === this.screenToModify.type) return;
    if (this.hasContent()) {
      const confirmed = await this.confirmService.confirm({
        title: this.i18n.t('editor.changeType.title'),
        message: this.i18n.t('editor.changeType.message'),
        confirmLabel: this.i18n.t('editor.changeType.confirm'),
        tone: 'warning',
      });
      if (!confirmed) return;
    }
    this.queueScreenMediaRelease(this.screenToModify);
    this.changeTypeScreen(type);
  }

  /** Remplace l'écran par un écran vierge du type demandé (paramètres globaux appliqués). */
  changeTypeScreen(type: string) {
    this.actualTypeScreen = type;
    this.resetGridModes();
    this.undoHistory = [];
    this.activeCellIndex = null;
    this.stimuliOffcanvasReady = false;
    this.clearCellImageUrls();
    switch (type){
      case transitionScreenConstModel : {
        let newTransitionScreen: transitionScreenModel = structuredClone(defaultTransitionScreenModel);
        newTransitionScreen = this.updateScreenService.updateTransitionScreen(newTransitionScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsTransitionScreen);
        this.screenToModify = newTransitionScreen;
        break;
      }
      case instructionScreenConstModel : {
        let newInstructionScreen: instructionScreenModel = structuredClone(defaultInstructionScreenModel);
        newInstructionScreen = this.updateScreenService.updateInstructionScreen(newInstructionScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsInstructionScreen);
        this.screenToModify = newInstructionScreen;
        void this.refreshInstructionMediaState();
        break;
      }
      case stimuliScreenConstModel : {
        let newStimuliScreen: stimuliScreenModel = structuredClone(defaultStimuliScreenModel);
        newStimuliScreen = this.updateScreenService.updateStimuliScreen(newStimuliScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsStimuliScreen);
        this.screenToModify = newStimuliScreen;
        void this.refreshStimuliSoundState();
        this.checkStimuliCells();
        break;
      }
      default :
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Écran d'instruction : média ou texte
  // ---------------------------------------------------------------------------

  /** Change le type de média de l'instruction ; l'ancien média est libéré. */
  changeTypeFile(type: string){
    if (this.screenToModify.type === instructionScreenConstModel){
      const previousRef = this.screenToModify.values[8] || this.screenToModify.values[4];
      const previousType = this.getInstructionMediaType();
      const previousWasFile = this.typeFile !== 'Texte' && !!previousRef;

      this.screenToModify.values[3] = type;
      this.screenToModify.values[4] = "";
      this.screenToModify.values[5] = undefined;
      this.screenToModify.values[8] = '';
      this.typeFile = type;
      this.textToRead = '';
      this.haveInstructionFile = false;
      this.setInstructionPreview('');

      if (previousWasFile) {
        this.mediaJournal.push({kind: 'release', ref: previousRef, type: previousType});
      }
    }
  }

  /** Enregistre le média choisi pour l'instruction (remplace et libère le précédent). */
  async getInstructionFile(event: Event | File){
    const file = event instanceof File ? event : (event.target as HTMLInputElement)?.files?.[0];
    if (file && this.screenToModify.type === instructionScreenConstModel) {
      const previousRef = this.screenToModify.values[8] || this.screenToModify.values[4];
      const mediaType = this.getInstructionMediaType();
      let id: string;
      try {
        id = await this.storeOrReplace(file, mediaType, previousRef);
      } catch (error) {
        console.error('Enregistrement du média impossible :', error);
        this.flashService.show('error', this.i18n.t('editor.error.fileSave', {name: file.name}));
        return;
      }

      if (previousRef && previousRef !== id) {
        this.mediaJournal.push({kind: 'release', ref: previousRef, type: mediaType});
      }

      this.screenToModify.values[4] = file.name;
      this.screenToModify.values[5] = file;
      this.screenToModify.values[8] = id;
      this.haveInstructionFile = true;
      this.nameFile = file.name;
      this.setInstructionPreview(URL.createObjectURL(file));
      this.getFileDuration(file);

      if (!(event instanceof File) && event.target instanceof HTMLInputElement) {
        event.target.value = '';
      }
    } else {
      this.haveInstructionFile = false;
    }
  }

  /** Enregistre le son global de l'écran de stimuli (remplace et libère le précédent). */
  async getStimuliSoundFile(event: Event | File){
    const file = event instanceof File ? event : (event.target as HTMLInputElement)?.files?.[0];
    if (file && this.screenToModify.type === stimuliScreenConstModel) {
      const previousRef = this.screenToModify.values[13] || this.screenToModify.values[10];
      let id: string;
      try {
        id = await this.storeOrReplace(file, 'sound', previousRef);
      } catch (error) {
        console.error('Enregistrement du son impossible :', error);
        this.flashService.show('error', this.i18n.t('editor.error.soundSave', {name: file.name}));
        return;
      }

      if (previousRef && previousRef !== id) {
        this.mediaJournal.push({kind: 'release', ref: previousRef, type: 'sound'});
      }

      this.screenToModify.values[10] = file.name;
      this.screenToModify.values[11] = file;
      this.screenToModify.values[13] = id;
      this.haveStimuliSoundFile = true;
      this.nameFile = file.name;
      this.setStimuliPreview(URL.createObjectURL(file));
      this.typeFile = "Son";

      if (!(event instanceof File) && event.target instanceof HTMLInputElement) {
        event.target.value = '';
      }
    } else {
      this.haveStimuliSoundFile = false;
    }
  }

  /**
   * Enregistre un fichier choisi par l'utilisateur. S'il porte le même identifiant que le
   * média actuel, son contenu est remplacé sans ajouter de référence.
   */
  private async storeOrReplace(file: File, type: MediaType, previousRef: string | undefined): Promise<string> {
    const sameId = this.media.idFor(file.name);
    if (previousRef === sameId) {
      await this.media.replaceContent(sameId, file, type);
      return sameId;
    }
    return this.media.store(file, type);
  }

  async checkInstructionFileExist(): Promise<boolean> {
    if (this.screenToModify.type === instructionScreenConstModel){
      this.typeFile = this.screenToModify.values[3];
      if (this.typeFile === 'Texte'){
        this.textToRead = this.screenToModify.values[4];
        this.setInstructionPreview('');
        return false;
      }else {
        if (this.screenToModify.values[4] !== ''){
          this.nameFile = this.screenToModify.values[4];
          const mediaFile = await this.media.resolve(this.screenToModify.values[8] || this.screenToModify.values[4], this.getInstructionMediaType());
          if (mediaFile) {
            this.screenToModify.values[5] = mediaFile.file;
            this.screenToModify.values[8] = mediaFile.id;
            this.setInstructionPreview(URL.createObjectURL(mediaFile.file));
            this.getFileDuration(mediaFile.file);
            return true;
          }
        }else {
          this.setInstructionPreview('');
        }
      }
    }
    return false;
  }

  async checkStimuliSoundFileExist(): Promise<boolean> {
    if (this.screenToModify.type === stimuliScreenConstModel){
      this.typeFile = "Son";
      if (this.screenToModify.values[10] !== ''){
        this.nameFile = this.screenToModify.values[10];
        const mediaFile = await this.media.resolve(this.screenToModify.values[13] || this.screenToModify.values[10], 'sound');
        if (mediaFile) {
          this.screenToModify.values[11] = mediaFile.file;
          this.screenToModify.values[13] = mediaFile.id;
          this.setStimuliPreview(URL.createObjectURL(mediaFile.file));
          return true;
        }
      }else {
        this.setStimuliPreview('');
        return false;
      }
    }
    return false;
  }

  private async refreshInstructionMediaState(): Promise<void> {
    this.haveInstructionFile = await this.checkInstructionFileExist();
  }

  private async refreshStimuliSoundState(): Promise<void> {
    this.haveStimuliSoundFile = await this.checkStimuliSoundFileExist();
  }

  /** Retire le média (image ou vidéo) de l'instruction. */
  async deleteImageInstruction(): Promise<void> {
    await this.removeInstructionMedia(this.getInstructionMediaType());
  }

  /** Retire le son de l'instruction. */
  async deleteSoundInstruction(): Promise<void> {
    await this.removeInstructionMedia('sound');
  }

  private async removeInstructionMedia(type: MediaType): Promise<void> {
    const ref = this.screenToModify.values[8] || this.screenToModify.values[4];

    this.screenToModify.values[4] = '';
    this.screenToModify.values[5] = undefined;
    this.screenToModify.values[8] = '';

    this.haveInstructionFile = false;
    this.setInstructionPreview('');

    if (ref) {
      this.mediaJournal.push({kind: 'release', ref, type});
    }
    this.autoSaveService.autoSave('instruction');
  }

  /** Retire le son global de l'écran de stimuli. */
  async deleteSoundStimuli(): Promise<void> {
    const ref = this.screenToModify.values[13] || this.screenToModify.values[10];

    this.screenToModify.values[10] = '';
    this.screenToModify.values[11] = undefined;
    this.screenToModify.values[13] = '';

    this.haveStimuliSoundFile = false;
    this.setStimuliPreview('');

    if (ref) {
      this.mediaJournal.push({kind: 'release', ref, type: 'sound'});
    }
    this.autoSaveService.autoSave('stimuli');
  }

  private getInstructionMediaType(): MediaType {
    switch (this.typeFile) {
      case 'Video':
        return 'video';
      case 'Son':
        return 'sound';
      default:
        return 'image';
    }
  }

  private setInstructionPreview(url: string): void {
    if (this.instructionObjectUrl) {
      URL.revokeObjectURL(this.instructionObjectUrl);
      this.instructionObjectUrl = null;
    }
    this.instructionFile = url;
    if (url) {
      this.instructionObjectUrl = url;
    }
  }

  private setStimuliPreview(url: string): void {
    if (this.stimuliObjectUrl) {
      URL.revokeObjectURL(this.stimuliObjectUrl);
      this.stimuliObjectUrl = null;
    }
    this.stimuliFile = url;
    if (url) {
      this.stimuliObjectUrl = url;
    }
  }

  /** Mesure la durée d'une vidéo ou d'un son (comparée au délai de l'écran en sortie). */
  getFileDuration(fileUser: File){
    if (this.typeFile === 'Video' || this.typeFile === 'Son'){
      const file = fileUser;
      const media = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
      media.src = URL.createObjectURL(file);
      media.preload = 'metadata';
      media.onloadedmetadata = () => {
        this.fileDuration = media.duration;
        URL.revokeObjectURL(media.src);
      };
    }
  }

  getText(event: string){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.textToRead = event;
      this.screenToModify.values[4] = event;
    }
  }

  /** Lit le texte de la consigne avec la synthèse vocale du navigateur. */
  playText() {
    if (!this.textToRead?.trim()) return;
    if (typeof window.speechSynthesis === 'undefined') {
      this.flashService.show('warning', this.i18n.t('editor.text.noSpeech'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(this.textToRead);
    // Le texte est saisi par l'utilisateur : on suppose qu'il est dans la langue de l'interface.
    utterance.lang = this.i18n.language() === 'en' ? 'en-GB' : 'fr-FR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  // ---------------------------------------------------------------------------
  // Grille de stimuli
  // ---------------------------------------------------------------------------

  get totalCells(): number[] {
    return Array.from({ length: this.screenToModify.values[0] * this.screenToModify.values[1] }, (_, i) => i + 1);
  }

  get rows(): number {
    return Number(this.screenToModify.values[0]) || 1;
  }

  get cols(): number {
    return Number(this.screenToModify.values[1]) || 1;
  }

  /** Ajuste le dictionnaire des cases (`values[12]`) au nombre de cases de la grille. */
  checkStimuliCells(){
    let numberCells = this.screenToModify.values[0] * this.screenToModify.values[1];
    const listScreen = this.screenToModify.values[12];
    const numberKey = Object.keys(listScreen).length;
    if (numberKey < numberCells){
      for (let i = numberKey; i < numberCells; i++){
        listScreen[i] = {
          imageName: "",
          imageFile: undefined,
          soundName: "",
          soundFile: undefined,
          goodAnswer: false,
          hidden: false,
        }
      }
    }else {
      for (const keyNumber in listScreen){
        if (Number(keyNumber) >= numberCells){
          delete listScreen[keyNumber];
        }
      }
    }
    if (this.focusedCellIndex >= numberCells) {
      this.focusedCellIndex = 0;
    }
  }

  /**
   * Action principale sur une case : selon le mode actif, la sélectionne, l'échange, la
   * duplique, la supprime, ou l'ouvre dans le panneau de configuration.
   */
  openStimuliData(cellNumber: number) {
    if (this.visualizationMode) return;
    this.focusedCellIndex = cellNumber;
    const listScreenAll = this.screenToModify.values[12];
    if (this.multiSelectMode) {
      if (listScreenAll[cellNumber]?.hidden) return;
      if (this.selectedCells.has(cellNumber)) {
        this.selectedCells.delete(cellNumber);
      } else {
        this.selectedCells.add(cellNumber);
      }
      this.announce(this.i18n.t('editor.announce.selectedCount', {count: this.selectedCells.size}));
      return;
    }
    if (this.swapMode) {
      if (this.swapSourceIndex === null) {
        if (listScreenAll[cellNumber]?.hidden) return;
        this.swapSourceIndex = cellNumber;
        this.announce(this.i18n.t('editor.announce.swapSource', {n: cellNumber + 1}));
        return;
      }
      if (this.swapSourceIndex === cellNumber) {
        this.swapSourceIndex = null;
        return;
      }
      this.saveSnapshot();
      this.swapCells(this.swapSourceIndex, cellNumber);
      this.announce(this.i18n.t('editor.announce.swapped', {a: this.swapSourceIndex + 1, b: cellNumber + 1}));
      this.swapSourceIndex = null;
      this.swapMode = false;
      return;
    }
    if (this.duplicateMode) {
      if (this.pendingDuplicateTarget !== null) return;
      if (this.duplicateSourceIndex === null) {
        if (listScreenAll[cellNumber]?.hidden) return;
        this.duplicateSourceIndex = cellNumber;
        // S'il n'y a qu'une seule case, on ajoute une colonne pour avoir une destination
        if (Number(this.screenToModify.values[0]) * Number(this.screenToModify.values[1]) === 1) {
          this.screenToModify.values[1] = Number(this.screenToModify.values[1]) + 1;
          this.checkStimuliCells();
        }
        this.announce(this.i18n.t('editor.announce.copySource', {n: cellNumber + 1}));
        return;
      }
      const target = listScreenAll[cellNumber];
      if (!target) return;
      if (this.duplicateSourceIndex === cellNumber) return;
      if (!target.hidden && (target.imageName || target.soundName)) {
        this.pendingDuplicateTarget = cellNumber;
        return;
      }
      this.saveSnapshot();
      this.duplicateCell(this.duplicateSourceIndex, cellNumber);
      this.announce(this.i18n.t('editor.announce.duplicated', {from: this.duplicateSourceIndex + 1, to: cellNumber + 1}));
      this.duplicateSourceIndex = null;
      this.duplicateMode = false;
      return;
    }
    if (this.deleteMode) {
      if (listScreenAll[cellNumber]?.hidden) return;
      this.requestDelete([cellNumber]);
      return;
    }
    // Clic sur un emplacement vide (masqué) en mode normal : on le matérialise en case.
    if (listScreenAll[cellNumber]?.hidden) {
      this.saveSnapshot();
      listScreenAll[cellNumber] = this.emptyCell();
    }
    const listScreen = this.screenToModify.values[12];
    this.activeCellIndex = cellNumber;
    this.dataStimuli = {
      cell: cellNumber,
      screen: listScreen,
      rows: this.screenToModify.values[0],
      cols: this.screenToModify.values[1]
    };
    this.stimuliOffcanvasReady = true;
    this.openOffcanvasStimuli();
  }

  /** Navigation au clavier dans la grille (flèches, Début, Fin). */
  onGridKeydown(event: KeyboardEvent, index: number): void {
    const cols = this.cols;
    const total = this.rows * cols;
    let target = index;
    switch (event.key) {
      case 'ArrowRight': target = Math.min(total - 1, index + 1); break;
      case 'ArrowLeft': target = Math.max(0, index - 1); break;
      case 'ArrowDown': target = index + cols < total ? index + cols : index; break;
      case 'ArrowUp': target = index - cols >= 0 ? index - cols : index; break;
      case 'Home': target = Math.floor(index / cols) * cols; break;
      case 'End': target = Math.floor(index / cols) * cols + cols - 1; break;
      case 'Escape':
        if (this.anyModeActive()) {
          event.preventDefault();
          this.resetGridModes();
          this.announce(this.i18n.t('editor.announce.modeOff'));
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    this.focusCell(target);
  }

  /** Place le focus clavier sur une case de la grille. */
  focusCell(index: number): void {
    this.focusedCellIndex = index;
    setTimeout(() => document.getElementById(`stimuli-cell-${index}`)?.focus());
  }

  /** Nom accessible d'une case : position, contenu, réponse attendue et état. */
  cellLabel(index: number): string {
    const cell = this.screenToModify.values[12]?.[index];
    const row = Math.floor(index / this.cols) + 1;
    const col = (index % this.cols) + 1;
    const t = (key: TranslationKey, params?: Record<string, string | number>) => this.i18n.t(key, params);
    const position = t('editor.cell.position', {n: index + 1, row, col});
    if (!cell || cell.hidden) {
      return t(this.deleteMode || this.multiSelectMode ? 'editor.cell.empty' : 'editor.cell.emptyCreate', {position});
    }
    const parts: string[] = [];
    parts.push(cell.imageName ? t('editor.cell.image', {name: cell.imageName}) : t('editor.cell.noImage'));
    if (cell.soundName) parts.push(t('editor.cell.sound', {name: cell.soundName}));
    parts.push(t(cell.goodAnswer === true ? 'editor.cell.good' : 'editor.cell.wrong'));
    const states: string[] = [];
    if (this.duplicateSourceIndex === index) states.push(t('editor.cell.toDuplicate'));
    if (this.swapSourceIndex === index) states.push(t('editor.cell.toSwap'));
    if (this.activeCellIndex === index) states.push(t('editor.cell.editing'));
    return states.length
      ? t('editor.cell.fullStates', {position, parts: parts.join(', '), states: states.join(', ')})
      : t('editor.cell.full', {position, parts: parts.join(', ')});
  }

  toggleDuplicateMode() {
    this.duplicateMode = !this.duplicateMode;
    this.duplicateSourceIndex = null;
    this.pendingDuplicateTarget = null;
    if (this.duplicateMode) {
      this.deleteMode = false;
      this.swapMode = false;
      this.swapSourceIndex = null;
      this.multiSelectMode = false;
      this.selectedCells.clear();
      this.announce(this.i18n.t('editor.announce.duplicateMode'));
    }
  }

  toggleMultiSelectMode() {
    this.multiSelectMode = !this.multiSelectMode;
    this.selectedCells.clear();
    this.pendingDeleteCells = null;
    if (this.multiSelectMode) {
      this.duplicateMode = false;
      this.duplicateSourceIndex = null;
      this.pendingDuplicateTarget = null;
      this.swapMode = false;
      this.swapSourceIndex = null;
      this.deleteMode = false;
      this.announce(this.i18n.t('editor.announce.multiMode'));
    }
  }

  /**
   * Bascule entre le mode gestion (édition de la grille) et le mode visualisation réel
   * qui affiche les images des stimuli telles qu'elles apparaîtront, sans les outils d'édition.
   */
  async toggleVisualizationMode(): Promise<void> {
    this.visualizationMode = !this.visualizationMode;
    if (this.visualizationMode) {
      this.resetGridModes();
      await this.loadCellImages();
      this.announce(this.i18n.t('editor.announce.previewMode'));
    } else {
      this.clearCellImageUrls();
      this.stopCellSound();
      this.announce(this.i18n.t('editor.announce.editMode'));
    }
  }

  /** Résout et crée les URLs d'aperçu des images de chaque case visible de la grille. */
  private async loadCellImages(): Promise<void> {
    this.clearCellImageUrls();
    if (this.screenToModify.type !== stimuliScreenConstModel) return;
    const listScreen = this.screenToModify.values[12];
    const total = Number(this.screenToModify.values[0]) * Number(this.screenToModify.values[1]);
    for (let i = 0; i < total; i++) {
      const cell = listScreen[i];
      if (!cell || cell.hidden) continue;

      let file: Blob | undefined = cell.imageFile instanceof Blob ? cell.imageFile : undefined;
      if (!file && (cell.imageId || cell.imageName)) {
        const match = await this.media.resolve(cell.imageId || cell.imageName, 'image');
        if (match) {
          cell.imageFile = match.file;
          cell.imageId = match.id;
          file = match.file;
        }
      }

      if (file instanceof Blob) {
        this.cellImageUrls[i] = URL.createObjectURL(file);
      }
    }
  }

  /** Révoque toutes les URLs d'aperçu des images de cases et vide la table. */
  private clearCellImageUrls(): void {
    for (const key of Object.keys(this.cellImageUrls)) {
      URL.revokeObjectURL(this.cellImageUrls[Number(key)]);
    }
    this.cellImageUrls = {};
  }

  /**
   * Lance (ou arrête si déjà en cours) la lecture du son d'une case en mode visualisation.
   * Un seul son joue à la fois : relancer une autre case coupe le précédent.
   */
  async toggleCellSound(cellIndex: number, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.playingSoundCell === cellIndex) {
      this.stopCellSound();
      return;
    }
    this.stopCellSound();

    if (this.screenToModify.type !== stimuliScreenConstModel) return;
    const cell = this.screenToModify.values[12][cellIndex];
    if (!cell || !cell.soundName) return;

    let file: Blob | undefined = cell.soundFile instanceof Blob ? cell.soundFile : undefined;
    if (!file && (cell.soundId || cell.soundName)) {
      const match = await this.media.resolve(cell.soundId || cell.soundName, 'sound');
      if (match) {
        cell.soundFile = match.file;
        cell.soundId = match.id;
        file = match.file;
      }
    }
    if (!(file instanceof Blob)) return;

    // L'utilisateur a pu quitter le mode visualisation pendant la résolution asynchrone.
    if (!this.visualizationMode) return;

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onended = () => this.stopCellSound();
    audio.onerror = () => this.stopCellSound();
    this.currentCellAudio = audio;
    this.currentCellAudioUrl = url;
    this.playingSoundCell = cellIndex;
    try {
      await audio.play();
    } catch {
      this.stopCellSound();
    }
  }

  /** Arrête la lecture en cours et libère l'URL objet associée. */
  private stopCellSound(): void {
    if (this.currentCellAudio) {
      this.currentCellAudio.pause();
      this.currentCellAudio.onended = null;
      this.currentCellAudio.onerror = null;
      this.currentCellAudio = null;
    }
    if (this.currentCellAudioUrl) {
      URL.revokeObjectURL(this.currentCellAudioUrl);
      this.currentCellAudioUrl = null;
    }
    this.playingSoundCell = null;
  }

  /** Bouton « Supprimer » : en multi-sélection on supprime la sélection, sinon on (dé)active le mode suppression simple. */
  onDeleteClick() {
    if (this.multiSelectMode) {
      if (this.selectedCells.size > 0) {
        this.requestDelete([...this.selectedCells]);
      }
      return;
    }
    this.toggleDeleteMode();
  }

  confirmOverwrite() {
    if (this.duplicateSourceIndex !== null && this.pendingDuplicateTarget !== null) {
      this.saveSnapshot();
      this.duplicateCell(this.duplicateSourceIndex, this.pendingDuplicateTarget);
      this.announce(this.i18n.t('editor.announce.replaced', {n: this.pendingDuplicateTarget + 1}));
    }
    this.pendingDuplicateTarget = null;
    this.duplicateSourceIndex = null;
    this.duplicateMode = false;
  }

  cancelOverwrite() {
    this.pendingDuplicateTarget = null;
  }

  private emptyCell() {
    return {
      imageName: "",
      imageFile: undefined,
      soundName: "",
      soundFile: undefined,
      goodAnswer: false,
      hidden: false,
    };
  }

  private hiddenCell() {
    return {
      imageName: "",
      imageFile: undefined,
      soundName: "",
      soundFile: undefined,
      goodAnswer: false,
      hidden: true,
    };
  }

  /**
   * Indique si l'on peut ajouter une case dans une direction : hors de la grille (la grille
   * s'agrandit) ou sur un emplacement vide.
   */
  canAddAdjacent(cellIndex: number, direction: 'top' | 'bottom' | 'left' | 'right'): boolean {
    const rows = Number(this.screenToModify.values[0]);
    const cols = Number(this.screenToModify.values[1]);
    const r = Math.floor(cellIndex / cols);
    const c = cellIndex % cols;
    let targetR = r;
    let targetC = c;
    if (direction === 'top') targetR = r - 1;
    if (direction === 'bottom') targetR = r + 1;
    if (direction === 'left') targetC = c - 1;
    if (direction === 'right') targetC = c + 1;
    if (targetR < 0 || targetR >= rows || targetC < 0 || targetC >= cols) return true;
    const targetIdx = targetR * cols + targetC;
    return !!this.screenToModify.values[12][targetIdx]?.hidden;
  }

  /** Ajoute une case à côté d'une autre, en agrandissant la grille si nécessaire. */
  addAdjacent(event: Event, cellIndex: number, direction: 'top' | 'bottom' | 'left' | 'right') {
    event.stopPropagation();
    const rows = Number(this.screenToModify.values[0]);
    const cols = Number(this.screenToModify.values[1]);
    const listScreen = this.screenToModify.values[12];
    const r = Math.floor(cellIndex / cols);
    const c = cellIndex % cols;

    let targetR = r;
    let targetC = c;
    if (direction === 'top') targetR = r - 1;
    if (direction === 'bottom') targetR = r + 1;
    if (direction === 'left') targetC = c - 1;
    if (direction === 'right') targetC = c + 1;

    this.announce(this.i18n.t(`editor.announce.added.${direction}` as const, {n: cellIndex + 1}));

    if (targetR >= 0 && targetR < rows && targetC >= 0 && targetC < cols) {
      const targetIdx = targetR * cols + targetC;
      if (listScreen[targetIdx]?.hidden) {
        this.saveSnapshot();
        listScreen[targetIdx] = this.emptyCell();
      }
      return;
    }

    this.saveSnapshot();

    if (direction === 'bottom') {
      this.screenToModify.values[0] = rows + 1;
      this.checkStimuliCells();
      const newRowStart = rows * cols;
      for (let cc = 0; cc < cols; cc++) {
        listScreen[newRowStart + cc] = cc === c ? this.emptyCell() : this.hiddenCell();
      }
      return;
    }

    if (direction === 'top') {
      const snapshot: { [key: number]: any } = {};
      for (let i = 0; i < rows * cols; i++) snapshot[i] = listScreen[i];
      this.screenToModify.values[0] = rows + 1;
      for (let cc = 0; cc < cols; cc++) {
        listScreen[cc] = cc === c ? this.emptyCell() : this.hiddenCell();
      }
      for (let rr = 0; rr < rows; rr++) {
        for (let cc = 0; cc < cols; cc++) {
          listScreen[(rr + 1) * cols + cc] = snapshot[rr * cols + cc];
        }
      }
      return;
    }

    const newCols = cols + 1;
    const snapshot: { [key: number]: any } = {};
    for (let i = 0; i < rows * cols; i++) snapshot[i] = listScreen[i];
    this.screenToModify.values[1] = newCols;
    this.checkStimuliCells();

    for (let rr = 0; rr < rows; rr++) {
      const newCell = rr === r ? this.emptyCell() : this.hiddenCell();
      if (direction === 'right') {
        for (let cc = 0; cc < cols; cc++) {
          listScreen[rr * newCols + cc] = snapshot[rr * cols + cc];
        }
        listScreen[rr * newCols + cols] = newCell;
      } else {
        listScreen[rr * newCols] = newCell;
        for (let cc = 0; cc < cols; cc++) {
          listScreen[rr * newCols + cc + 1] = snapshot[rr * cols + cc];
        }
      }
    }
  }

  readonly adjacentDirections: {value: 'top' | 'bottom' | 'left' | 'right', label: TranslationKey, icon: string}[] = [
    {value: 'top', label: 'editor.direction.top', icon: 'bi-arrow-up'},
    {value: 'bottom', label: 'editor.direction.bottom', icon: 'bi-arrow-down'},
    {value: 'left', label: 'editor.direction.left', icon: 'bi-arrow-left'},
    {value: 'right', label: 'editor.direction.right', icon: 'bi-arrow-right'},
  ];

  /** Nom accessible (clé) d'un bouton « + » : « Ajouter une case au-dessus de la case {n} ». */
  addCellLabel(direction: string): TranslationKey {
    return `editor.addCell.${direction as 'top' | 'bottom' | 'left' | 'right'}.of` as const;
  }

  /** Infobulle (clé) d'un bouton « + » : « Ajouter une case au-dessus ». */
  addCellTitle(direction: string): TranslationKey {
    return `editor.addCell.${direction as 'top' | 'bottom' | 'left' | 'right'}` as const;
  }

  /**
   * Ajoute une case à côté de la case active (alternative clavier aux boutons « + » de la
   * grille) puis rouvre le panneau sur la case active, dont l'index a pu changer.
   */
  addAdjacentToActive(event: Event, direction: 'top' | 'bottom' | 'left' | 'right'): void {
    const index = this.activeCellIndex;
    if (index === null) return;
    const colsBefore = this.cols;
    const rowsBefore = this.rows;
    this.addAdjacent(event, index, direction);
    // Si la grille s'est agrandie en haut ou à gauche, la case active s'est décalée.
    const r = Math.floor(index / colsBefore);
    const c = index % colsBefore;
    const newRow = this.rows > rowsBefore && direction === 'top' ? r + 1 : r;
    const newCol = this.cols > colsBefore && direction === 'left' ? c + 1 : c;
    const newIndex = newRow * this.cols + newCol;
    if (newIndex !== index) {
      this.openStimuliData(newIndex);
    } else {
      this.dataStimuli = {...this.dataStimuli, rows: this.rows, cols: this.cols};
    }
  }

  toggleDeleteMode() {
    this.deleteMode = !this.deleteMode;
    if (this.deleteMode) {
      this.duplicateMode = false;
      this.duplicateSourceIndex = null;
      this.pendingDuplicateTarget = null;
      this.swapMode = false;
      this.swapSourceIndex = null;
      this.multiSelectMode = false;
      this.selectedCells.clear();
      this.announce(this.i18n.t('editor.announce.deleteMode'));
    }
  }

  /**
   * Demande la suppression des cases données. Si au moins une contient des données,
   * on ouvre une confirmation ; sinon on supprime directement.
   */
  private requestDelete(indices: number[]) {
    const listScreen = this.screenToModify.values[12];
    const toDelete = indices.filter(i => listScreen[i] && !listScreen[i].hidden);
    if (toDelete.length === 0) {
      this.deleteMode = false;
      return;
    }
    // On garde toujours au moins une case visible dans la grille.
    if (toDelete.length >= this.countVisibleCells()) {
      this.flashService.show('warning', this.i18n.t('editor.keepOneCell'));
      this.deleteMode = false;
      this.selectedCells.clear();
      return;
    }
    const hasData = toDelete.some(i => listScreen[i].imageName || listScreen[i].soundName);
    if (hasData) {
      this.pendingDeleteCells = toDelete;
    } else {
      this.performDelete(toDelete);
    }
  }

  /** Nombre de cases visibles (non masquées) dans l'écran courant. */
  private countVisibleCells(): number {
    const listScreen = this.screenToModify.values[12];
    let count = 0;
    for (const key of Object.keys(listScreen)) {
      if (!listScreen[Number(key)]?.hidden) count++;
    }
    return count;
  }

  confirmDelete() {
    if (this.pendingDeleteCells) {
      this.performDelete(this.pendingDeleteCells);
    }
  }

  cancelDelete() {
    this.pendingDeleteCells = null;
  }

  private performDelete(indices: number[]) {
    this.saveSnapshot();
    for (const i of indices) {
      this.clearCellWithIDB(i);
    }
    this.autoShrinkGrid();
    this.announce(this.i18n.t('editor.announce.deleted', {count: indices.length}));
    this.selectedCells.clear();
    this.pendingDeleteCells = null;
    this.deleteMode = false;
    this.multiSelectMode = false;
  }

  /**
   * Masque/vide une case. Ses médias seront libérés à la sortie de l'éditeur (et pas
   * avant, pour que « Annuler » puisse les restaurer).
   */
  private clearCellWithIDB(cellNumber: number) {
    const listScreen = this.screenToModify.values[12];
    const cell = listScreen[cellNumber];
    if (!cell || cell.hidden) return;

    const imageRef = cell.imageId || cell.imageName;
    const soundRef = cell.soundId || cell.soundName;

    listScreen[cellNumber] = this.hiddenCell();

    if (imageRef) this.mediaJournal.push({kind: 'release', ref: imageRef, type: 'image'});
    if (soundRef) this.mediaJournal.push({kind: 'release', ref: soundRef, type: 'sound'});

    if (this.activeCellIndex === cellNumber) {
      this.activeCellIndex = null;
      this.stimuliOffcanvasReady = false;
    }
  }

  /** Retire les dernières lignes/colonnes entièrement masquées, en boucle. */
  private autoShrinkGrid() {
    while (this.shrinkOnce()) { /* continue tant qu'on peut rétrécir */ }
  }

  private shrinkOnce(): boolean {
    const rows = Number(this.screenToModify.values[0]);
    const cols = Number(this.screenToModify.values[1]);
    const listScreen = this.screenToModify.values[12];

    let lastColAllHidden = cols > 1;
    for (let r = 0; r < rows && lastColAllHidden; r++) {
      if (!listScreen[r * cols + (cols - 1)]?.hidden) {
        lastColAllHidden = false;
      }
    }

    if (lastColAllHidden) {
      const newCols = cols - 1;
      const snapshot: { [key: number]: any } = {};
      for (let i = 0; i < rows * cols; i++) snapshot[i] = listScreen[i];

      this.screenToModify.values[1] = newCols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < newCols; c++) {
          listScreen[r * newCols + c] = snapshot[r * cols + c];
        }
      }
      for (let i = rows * newCols; i < rows * cols; i++) {
        delete listScreen[i];
      }
      return true;
    }

    if (rows > 1) {
      let lastRowAllHidden = true;
      for (let c = 0; c < cols && lastRowAllHidden; c++) {
        if (!listScreen[(rows - 1) * cols + c]?.hidden) {
          lastRowAllHidden = false;
        }
      }
      if (lastRowAllHidden) {
        this.screenToModify.values[0] = rows - 1;
        for (let i = (rows - 1) * cols; i < rows * cols; i++) {
          delete listScreen[i];
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Copie le contenu d'une case vers une autre. Les médias copiés gagnent une référence
   * (rendue si l'opération est annulée) ; ceux de la case remplacée seront libérés.
   */
  duplicateCell(sourceIndex: number, targetIndex: number) {
    const listScreen = this.screenToModify.values[12];
    const source = listScreen[sourceIndex];
    if (!source || sourceIndex === targetIndex) return;

    const previous = listScreen[targetIndex];
    if (previous && !previous.hidden) {
      const imageRef = previous.imageId || previous.imageName;
      const soundRef = previous.soundId || previous.soundName;
      if (imageRef) this.mediaJournal.push({kind: 'release', ref: imageRef, type: 'image'});
      if (soundRef) this.mediaJournal.push({kind: 'release', ref: soundRef, type: 'sound'});
    }

    listScreen[targetIndex] = structuredClone({
      imageName: source.imageName ?? '',
      imageId: source.imageId ?? '',
      imageFile: source.imageFile,
      soundName: source.soundName ?? '',
      soundId: source.soundId ?? '',
      soundFile: source.soundFile,
      goodAnswer: source.goodAnswer ?? false,
      hidden: false,
    });

    if (source.imageId) this.acquire(source.imageId, 'image');
    if (source.soundId) this.acquire(source.soundId, 'sound');
  }

  private acquire(id: string, type: MediaType): void {
    this.mediaJournal.push({kind: 'acquire', ref: id, type});
    this.media.addReference(id).catch(error => console.warn('Référence de média non ajoutée :', error));
  }

  private saveSnapshot() {
    const cells = this.screenToModify.values[12];
    const cellsClone: { [key: number]: any } = {};
    for (const key of Object.keys(cells)) {
      cellsClone[Number(key)] = { ...cells[Number(key)] };
    }
    this.undoHistory.push({
      rows: Number(this.screenToModify.values[0]),
      cols: Number(this.screenToModify.values[1]),
      cells: cellsClone,
      journalLength: this.mediaJournal.length,
    });
    if (this.undoHistory.length > this.maxUndoHistory) {
      this.undoHistory.shift();
    }
  }

  get canUndo(): boolean {
    return this.undoHistory.length > 0;
  }

  /**
   * Annule la dernière modification de la grille, médias compris : les libérations
   * différées sont abandonnées et les références ajoutées par une duplication sont rendues.
   */
  undo() {
    const snapshot = this.undoHistory.pop();
    if (!snapshot) return;
    this.screenToModify.values[0] = snapshot.rows;
    this.screenToModify.values[1] = snapshot.cols;
    this.screenToModify.values[12] = snapshot.cells;

    const undone = this.mediaJournal.splice(snapshot.journalLength);
    for (const entry of undone) {
      if (entry.kind === 'acquire') {
        this.media.release(entry.ref, entry.type).catch(error => console.warn('Référence de média non rendue :', error));
      }
    }

    this.activeCellIndex = null;
    this.stimuliOffcanvasReady = false;
    this.resetGridModes();
    this.announce(this.i18n.t('editor.announce.undone'));
    if (this.visualizationMode) {
      void this.loadCellImages();
    }
  }

  /**
   * Applique les libérations de médias différées (sortie de l'éditeur). À partir de là,
   * l'historique d'annulation n'est plus disponible.
   */
  async commitMediaJournal(): Promise<void> {
    const pending = this.mediaJournal.filter(entry => entry.kind === 'release');
    this.mediaJournal = [];
    this.undoHistory = [];
    for (const entry of pending) {
      try {
        await this.media.release(entry.ref, entry.type);
      } catch (error) {
        console.warn('Libération de média ignorée :', error);
      }
    }
  }

  /** Programme la libération de tous les médias d'un écran (changement de type). */
  private queueScreenMediaRelease(screen: screenTypeModel): void {
    const v = screen.values ?? [];
    if (screen.type === instructionScreenConstModel && v[3] !== 'Texte' && (v[8] || v[4])) {
      this.mediaJournal.push({kind: 'release', ref: v[8] || v[4], type: v[3] === 'Video' ? 'video' : v[3] === 'Son' ? 'sound' : 'image'});
    }
    if (screen.type === stimuliScreenConstModel) {
      if (v[13] || v[10]) this.mediaJournal.push({kind: 'release', ref: v[13] || v[10], type: 'sound'});
      for (const cell of Object.values(v[12] ?? {}) as any[]) {
        if (!cell || cell.hidden) continue;
        if (cell.imageId || cell.imageName) this.mediaJournal.push({kind: 'release', ref: cell.imageId || cell.imageName, type: 'image'});
        if (cell.soundId || cell.soundName) this.mediaJournal.push({kind: 'release', ref: cell.soundId || cell.soundName, type: 'sound'});
      }
    }
  }

  /** Ouvre la case active dans le panneau de configuration et y place le focus. */
  openOffcanvasStimuli() {
    this.configStimuliOpen = true;
    setTimeout(() => document.getElementById('configStimuliLabel')?.focus());
  }

  /** Fermeture du panneau de configuration : le focus revient sur la case. */
  closeConfigStimuli(): void {
    const index = this.activeCellIndex;
    this.configStimuliOpen = false;
    this.activeCellIndex = null;
    this.stimuliOffcanvasReady = false;
    if (index !== null) {
      this.focusCell(index);
    }
  }

  /**
   * Vérifie, pour une instruction vidéo/son, que le média n'est pas plus long que le délai
   * avant l'écran suivant. Au premier appel un avertissement s'affiche ; un second appel
   * confirme la sortie.
   */
  checkFileDurationAndTimeScreen(){
    if (this.screenToModify.values[0] && this.fileDuration > this.screenToModify.values[1]){
      if (this.showWarningMessage){
        this.showWarningMessage = false;
        this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
      }else {
        this.showWarningMessage = true;
        setTimeout(() => document.getElementById('duration-warning')?.focus());
      }
    }else {
      this.showWarningMessage = false;
      this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
    }
  }

  /** Termine l'édition et revient à la liste des écrans. */
  backToScreenList(){
    if (this.screenToModify.type === instructionScreenConstModel && (this.typeFile === 'Video' || this.typeFile === 'Son')){
      this.checkFileDurationAndTimeScreen();
    }else {
      this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
    }
    this.autoSaveService.autoSave('backToScreenList');
  }

  toggleSwapMode() {
    this.swapMode = !this.swapMode;
    this.swapSourceIndex = null;
    if (this.swapMode) {
      this.duplicateMode = false;
      this.duplicateSourceIndex = null;
      this.pendingDuplicateTarget = null;
      this.deleteMode = false;
      this.multiSelectMode = false;
      this.selectedCells.clear();
      this.announce(this.i18n.t('editor.announce.swapMode'));
    }
  }

  swapCells(a: number, b: number) {
    const list = this.screenToModify.values[12];
    const tmp = list[a];
    list[a] = list[b];
    list[b] = tmp;
  }

  zoomIn() {
    this.cellSize = Math.min(this.cellSize + 20, this.maxCellSize);
  }

  zoomOut() {
    this.cellSize = Math.max(this.cellSize - 20, this.minCellSize);
  }

  get canZoomIn(): boolean {
    return this.cellSize < this.maxCellSize;
  }

  get canZoomOut(): boolean {
    return this.cellSize > this.minCellSize;
  }

  /** Vrai si un mode d'édition de la grille est actif. */
  anyModeActive(): boolean {
    return this.duplicateMode || this.swapMode || this.multiSelectMode || this.deleteMode;
  }

  /** Consigne affichée (et annoncée) selon le mode actif de la grille. */
  get modeHint(): string {
    if (this.duplicateMode) {
      if (this.duplicateSourceIndex === null) return this.i18n.t('editor.hint.duplicateSource');
      if (this.pendingDuplicateTarget === null) return this.i18n.t('editor.hint.duplicateTarget');
      return '';
    }
    if (this.deleteMode) return this.i18n.t('editor.hint.delete');
    if (this.swapMode) return this.i18n.t(this.swapSourceIndex === null ? 'editor.hint.swapFirst' : 'editor.hint.swapSecond');
    if (this.multiSelectMode) return this.i18n.t('editor.hint.multi', {count: this.selectedCells.size});
    return '';
  }

  /** Désactive tous les modes d'édition de la grille. */
  resetGridModes(): void {
    this.duplicateMode = false;
    this.duplicateSourceIndex = null;
    this.pendingDuplicateTarget = null;
    this.swapMode = false;
    this.swapSourceIndex = null;
    this.deleteMode = false;
    this.multiSelectMode = false;
    this.selectedCells.clear();
    this.pendingDeleteCells = null;
  }

  private announce(message: string): void {
    this.announcement = message;
  }

  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;
  protected readonly Number = Number;
}
