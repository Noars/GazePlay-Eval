import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {stimuliScreenValues} from '../../shared/screenModel';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-popup-stimuli',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './popup-stimuli.component.html',
  standalone: true,
  styleUrl: './popup-stimuli.component.css'
})
export class PopupStimuliComponent {

  previewImage: any = "";
  previewSound: any = "";

  constructor(
    public dialogRef: MatDialogRef<PopupStimuliComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cell: number, screen: { [key:number]: stimuliScreenValues } }) {
    this.checkCell()
  }

  checkCell() {
    const cellData = this.data.screen[this.data.cell];

    if (cellData.imageFile) {
      this.previewImage = URL.createObjectURL(cellData.imageFile);
    }else {
      this.previewImage = '';
    }

    if (cellData.soundFile){
      this.previewSound = URL.createObjectURL(cellData.soundFile);
    }else {
      this.previewSound = '';
    }
  }

  deleteCell(){
    this.data.screen[this.data.cell] = {
      imageName: "",
      imageFile: undefined,
      soundName: "",
      soundFile: undefined,
      goodAnswer: false,
    }
    this.dialogRef.close();
  }

  getImageFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0){
      this.data.screen[this.data.cell].imageName = input.files[0].name;
      this.data.screen[this.data.cell].imageFile = input.files[0];
      this.previewImage =  URL.createObjectURL(input.files[0]);
    }
  }

  getSoundFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0){
      this.data.screen[this.data.cell].soundName = input.files[0].name;
      this.data.screen[this.data.cell].soundFile = input.files[0];
      this.previewSound =  URL.createObjectURL(input.files[0]);
    }
  }

  saveAndQuit(){
    this.dialogRef.close();
  }
}
