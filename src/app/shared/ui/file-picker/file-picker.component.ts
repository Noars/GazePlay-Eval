import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild} from '@angular/core';
import {uniqueId} from '../unique-id';
import {I18nService} from '../../../core/i18n/i18n.service';

/**
 * Bouton de sélection de fichier accessible.
 *
 * Le champ `<input type="file">` natif reste focusable (visuellement masqué) : il reçoit le
 * focus clavier, s'ouvre avec Entrée/Espace et son nom accessible indique l'action et le
 * fichier actuellement choisi. Après chaque sélection, le champ est réinitialisé pour
 * permettre de choisir à nouveau le même fichier.
 */
@Component({
  selector: 'app-file-picker',
  templateUrl: './file-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilePickerComponent {
  private readonly i18n = inject(I18nService);

  /** Libellé du bouton lorsqu'aucun fichier n'est choisi (ex. « Choisir une image »). */
  @Input({required: true}) label = '';
  /** Types acceptés (attribut `accept`). */
  @Input() accept = '';
  /** Nom du fichier actuellement associé, affiché à la place du libellé. */
  @Input() fileName = '';
  @Input() disabled = false;
  @Input() icon = 'bi-upload';
  @Input() variant: 'secondary' | 'primary' | 'ghost' = 'secondary';

  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('input', {static: true}) private input!: ElementRef<HTMLInputElement>;

  protected readonly inputId = uniqueId('file');

  protected get accessibleName(): string {
    return this.fileName ? this.i18n.t('ui.file.current', {label: this.label, file: this.fileName}) : this.label;
  }

  protected onChange(): void {
    const file = this.input.nativeElement.files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
    this.input.nativeElement.value = '';
  }
}
