import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

/**
 * Popup d'import d'une évaluation depuis un fichier ZIP.
 * L'utilisateur choisit un fichier ZIP, un mode d'import, et si le mode
 * est 'save', un slot de destination pour la sauvegarde.
 *
 * Valeurs de fermeture possibles :
 *   { zipFile, slotIndex, mode } — l'utilisateur confirme l'import
 *   null                         — l'utilisateur annule
 *
 * Modes disponibles :
 *   'consult' — charge le ZIP en mémoire de travail (slot 0) sans sauvegarder dans un slot nommé
 *   'save'    — charge le ZIP et le sauvegarde dans le slot nommé choisi (1, 2 ou 3)
 */
@Component({
  selector: 'app-popup-import-save',
  templateUrl: './popup-import-save.component.html',
  styleUrl: './popup-import-save.component.css',
  standalone: true,
  imports: [FormsModule]
})
export class PopupImportSaveComponent {

  mode: 'consult' | 'save' | null = null;
  selectedSlot: number | null = null;
  zipFile: File | null = null;
  zipFileName: string = '';
  isDragging: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<PopupImportSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      slots: { index: number; name: string; empty: boolean }[] // état actuel des slots 1, 2, 3
    }
  ) {}

  onZipSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.setFile(input.files[0]);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File) {
    this.zipFile = file;
    this.zipFileName = file.name;
  }

  /**
   * Indique si l'utilisateur peut confirmer l'import.
   * Les conditions minimales sont : un fichier ZIP sélectionné et un mode choisi.
   * En mode 'save', un slot de destination doit également être sélectionné.
   *
   * @returns true si le bouton de confirmation peut être activé
   */
  canConfirm(): boolean {
    if (this.mode === null || this.zipFile === null) return false;
    if (this.mode === 'save') return this.selectedSlot !== null;
    return true;
  }

  /** L'utilisateur annule la popup sans importer. */
  cancel() {
    this.dialogRef.close(null);
  }

  /**
   * Ferme la popup en transmettant les informations d'import au composant appelant.
   * N'agit pas si les conditions de canConfirm() ne sont pas remplies.
   */
  confirm() {
    if (!this.canConfirm()) return;
    this.dialogRef.close({
      zipFile: this.zipFile,
      slotIndex: this.selectedSlot,
      mode: this.mode
    });
  }
}
