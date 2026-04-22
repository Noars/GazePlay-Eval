// src/app/components/popup-delete-save/popup-delete-save.component.ts
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-popup-delete-save',
  templateUrl: './popup-delete-save.component.html',
  styleUrl: './popup-delete-save.component.css',
  standalone: true,
  imports: []
})
export class PopupDeleteSaveComponent {

  constructor(
    public dialogRef: MatDialogRef<PopupDeleteSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { slotName: string }
  ) {}

  download() {
    this.dialogRef.close('download');
  }

  cancel() {
    this.dialogRef.close(null);
  }

  delete() {
    this.dialogRef.close('delete');
  }
}
