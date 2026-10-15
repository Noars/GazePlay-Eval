import {Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {stimuliScreenValues} from '../../shared/screenModel';
import {CropImageComponent} from '../crop-image/crop-image.component';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {MediaLibraryService, MediaType} from '../../core/media/media-library.service';
import {FilePickerComponent} from '../../shared/ui/file-picker/file-picker.component';
import {ChoiceOption, ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {I18nService} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Panneau de configuration d'une case de la grille de stimuli : réponse attendue, image
 * (avec recadrage) et son.
 *
 * Les médias sont enregistrés dans IndexedDB dès leur sélection ; le remplacement ou la
 * suppression libère l'ancien média (supprimé seulement s'il n'est plus utilisé ailleurs).
 */
@Component({
  selector: 'app-config-stimuli',
  imports: [FormsModule, FilePickerComponent, ChoiceSettingComponent, TranslatePipe],
  templateUrl: './config-stimuli.component.html',
  standalone: true,
  styleUrl: './config-stimuli.component.css'
})
export class ConfigStimuliComponent implements OnChanges, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly media = inject(MediaLibraryService);
  private readonly saveAutoService = inject(AutoSaveService);
  private readonly flashService = inject(FlashService);
  private readonly i18n = inject(I18nService);

  @Input() data!: {
    cell: number,
    screen: { [key: number]: stimuliScreenValues & {hidden?: boolean} },
    rows?: number,
    cols?: number,
  };

  /** Demande de fermeture du panneau (bouton « Terminer »). */
  @Output() closed = new EventEmitter<void>();

  previewImage: string = '';
  previewSound: string = '';
  /** Opération en cours sur un média (désactive les boutons concernés). */
  busy: 'image' | 'sound' | 'crop' | null = null;
  /** Vrai si le média référencé est introuvable dans le stockage du navigateur. */
  missingImage = false;
  missingSound = false;

  readonly answerOptions: ChoiceOption<boolean>[] = [
    {value: true, labelKey: 'editor.goodAnswer'},
    {value: false, labelKey: 'editor.wrongAnswer'},
  ];

  get cell(): stimuliScreenValues & {hidden?: boolean} {
    return this.data.screen[this.data.cell];
  }

  async ngOnChanges() {
    await this.checkCell();
  }

  ngOnDestroy(): void {
    this.setImagePreview(null);
    this.setSoundPreview(null);
  }

  /** Résout les médias de la case depuis IndexedDB et prépare leurs aperçus. */
  async checkCell(): Promise<void> {
    const cellData = this.cell;
    if (!cellData) return;

    if (!(cellData.imageFile instanceof Blob) && (cellData.imageId || cellData.imageName)) {
      cellData.imageFile = undefined;
      const match = await this.media.resolve(cellData.imageId || cellData.imageName, 'image');
      if (match) {
        cellData.imageFile = match.file;
        cellData.imageId = match.id;
      }
    }
    this.missingImage = !!cellData.imageName && !(cellData.imageFile instanceof Blob);
    this.setImagePreview(cellData.imageFile instanceof Blob ? cellData.imageFile : null);

    if (!(cellData.soundFile instanceof Blob) && (cellData.soundId || cellData.soundName)) {
      cellData.soundFile = undefined;
      const match = await this.media.resolve(cellData.soundId || cellData.soundName, 'sound');
      if (match) {
        cellData.soundFile = match.file;
        cellData.soundId = match.id;
      }
    }
    this.missingSound = !!cellData.soundName && !(cellData.soundFile instanceof Blob);
    this.setSoundPreview(cellData.soundFile instanceof Blob ? cellData.soundFile : null);
  }

  setGoodAnswer(value: boolean): void {
    this.cell.goodAnswer = value;
  }

  async deleteImage(): Promise<void> {
    const cell = this.cell;
    const ref = cell.imageId || cell.imageName;
    cell.imageId = '';
    cell.imageName = '';
    cell.imageFile = undefined;
    await this.releaseSafely(ref, 'image');
    await this.checkCell();
    this.saveAutoService.autoSave('stimuli');
  }

  async deleteSound(): Promise<void> {
    const cell = this.cell;
    const ref = cell.soundId || cell.soundName;
    cell.soundId = '';
    cell.soundName = '';
    cell.soundFile = undefined;
    await this.releaseSafely(ref, 'sound');
    await this.checkCell();
    this.saveAutoService.autoSave('stimuli');
  }

  /** Retire l'image et le son de la case (la case reste en place). */
  async deleteCell(): Promise<void> {
    const cell = this.cell;
    const imageRef = cell.imageId || cell.imageName;
    const soundRef = cell.soundId || cell.soundName;

    this.data.screen[this.data.cell] = {
      imageId: '',
      imageName: '',
      imageFile: undefined,
      soundId: '',
      soundName: '',
      soundFile: undefined,
      goodAnswer: false,
    };

    await this.releaseSafely(imageRef, 'image');
    await this.releaseSafely(soundRef, 'sound');
    await this.checkCell();
    this.saveAutoService.autoSave('stimuli');
  }

  public saveProgress(): void {
    this.saveAutoService.autoSave('stimuli');
  }

  /** Termine la configuration de la case. */
  finish(): void {
    this.saveProgress();
    this.closed.emit();
  }

  async getImageFile(event: Event | File) {
    const file = this.fileFrom(event);
    if (!file) return;
    await this.replaceMedia(file, 'image');
  }

  async getSoundFile(event: Event | File) {
    const file = this.fileFrom(event);
    if (!file) return;
    await this.replaceMedia(file, 'sound');
  }

  /**
   * Ouvre l'outil de recadrage. L'image recadrée est enregistrée comme un **nouveau**
   * fichier (ex. `photo-recadree.png`), pour ne pas modifier l'original éventuellement
   * utilisé par d'autres cases ; l'ancienne référence est libérée.
   */
  async cropImage(): Promise<void> {
    const original = this.cell.imageFile;
    if (!(original instanceof Blob)) return;

    const dialogRef = this.dialog.open(CropImageComponent, {
      data: {image: original},
      panelClass: ['gp-dialog-panel', 'gp-dialog-panel--wide'],
      disableClose: true,
      ariaLabelledBy: 'crop-title',
    });
    const result: File | Blob | null | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;

    const baseName = (this.cell.imageName || 'image').replace(/\.[^.]+$/, '');
    const cropped = new File([result], `${baseName}-recadree.png`, {type: 'image/png'});

    this.busy = 'crop';
    try {
      const previousRef = this.cell.imageId || this.cell.imageName;
      const stored = await this.media.storeAsNew(cropped, 'image');
      const file = stored.fileName === cropped.name ? cropped : new File([cropped], stored.fileName, {type: 'image/png'});
      this.cell.imageName = stored.fileName;
      this.cell.imageId = stored.id;
      this.cell.imageFile = file;
      this.setImagePreview(file);
      await this.releaseSafely(previousRef, 'image');
      this.saveAutoService.autoSave('stimuli');
    } catch (error) {
      console.error('Recadrage non enregistré :', error);
      this.flashService.show('error', this.i18n.t('cell.cropError'));
    } finally {
      this.busy = null;
    }
  }

  private async replaceMedia(file: File, type: 'image' | 'sound'): Promise<void> {
    const cell = this.cell;
    const previousRef = type === 'image' ? (cell.imageId || cell.imageName) : (cell.soundId || cell.soundName);
    this.busy = type;
    try {
      // Même fichier choisi à nouveau pour cette case : on remplace son contenu sans
      // ajouter de référence (sinon le compteur augmenterait à chaque nouvelle sélection).
      const sameId = this.media.idFor(file.name);
      let id: string;
      if (previousRef === sameId) {
        await this.media.replaceContent(sameId, file, type);
        id = sameId;
      } else {
        id = await this.media.store(file, type);
      }
      if (type === 'image') {
        cell.imageName = file.name;
        cell.imageId = id;
        cell.imageFile = file;
        this.missingImage = false;
        this.setImagePreview(file);
      } else {
        cell.soundName = file.name;
        cell.soundId = id;
        cell.soundFile = file;
        this.missingSound = false;
        this.setSoundPreview(file);
      }
      if (previousRef && previousRef !== id) {
        await this.releaseSafely(previousRef, type);
      }
    } catch (error) {
      console.error('Enregistrement du média impossible :', error);
      this.flashService.show('error', this.i18n.t('editor.error.fileSave', {name: file.name}));
    } finally {
      this.busy = null;
    }
  }

  private async releaseSafely(ref: string | undefined, type: MediaType): Promise<void> {
    if (!ref) return;
    try {
      await this.media.release(ref, type);
    } catch (error) {
      console.warn('Libération de média ignorée :', error);
    }
  }

  private fileFrom(event: Event | File): File | undefined {
    if (event instanceof File) return event;
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (input) input.value = '';
    return file;
  }

  private setImagePreview(file: Blob | null): void {
    if (this.previewImage) URL.revokeObjectURL(this.previewImage);
    this.previewImage = file ? URL.createObjectURL(file) : '';
  }

  private setSoundPreview(file: Blob | null): void {
    if (this.previewSound) URL.revokeObjectURL(this.previewSound);
    this.previewSound = file ? URL.createObjectURL(file) : '';
  }
}
