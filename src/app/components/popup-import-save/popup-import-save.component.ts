// popup-import-save.component.ts
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-popup-import-save',
  templateUrl: './popup-import-save.component.html',
  styleUrl: './popup-import-save.component.css',
  standalone: true,
  imports: [FormsModule]
})
export class PopupImportSaveComponent {

  selectedSlot: number | null = null;
  zipFile: File | null = null;
  zipFileName: string = '';

  constructor(
    public dialogRef: MatDialogRef<PopupImportSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { slots: { index: number, name: string, empty: boolean }[] }
  ) {}

  onZipSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.zipFile = input.files[0];
      this.zipFileName = input.files[0].name;
    }
  }

  canConfirm(): boolean {
    return this.zipFile !== null && this.selectedSlot !== null;
  }

  cancel() {
    this.dialogRef.close(null);
  }

  confirm() {
    if (!this.canConfirm()) return;
    this.dialogRef.close({
      zipFile: this.zipFile,
      slotIndex: this.selectedSlot
    });
  }
}
