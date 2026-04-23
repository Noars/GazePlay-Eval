import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {DatePipe} from '@angular/common';
import {saveModel} from '../../shared/saveModel';

@Component({
  selector: 'app-popup-overwrite-save',
  templateUrl: './popup-overwrite-save.component.html',
  styleUrl: './popup-overwrite-save.component.css',
  standalone: true,
  imports: [DatePipe]
})
export class PopupOverwriteSaveComponent {

  constructor(
    public dialogRef: MatDialogRef<PopupOverwriteSaveComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { save: saveModel; slotLabel: string }
  ) {}

  download() { this.dialogRef.close('download'); }
  overwrite() { this.dialogRef.close('overwrite'); }
  cancel() { this.dialogRef.close(null); }
}