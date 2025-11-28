import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogClose} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-popup-stimuli',
  imports: [
    MatButton,
    MatDialogClose
  ],
  templateUrl: './popup-stimuli.component.html',
  styleUrl: './popup-stimuli.component.css'
})
export class PopupStimuliComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { cell: number }) {}
}
