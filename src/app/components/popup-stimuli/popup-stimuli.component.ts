import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {stimuliScreenValues} from '../../shared/screenModel';

@Component({
  selector: 'app-popup-stimuli',
  imports: [],
  templateUrl: './popup-stimuli.component.html',
  styleUrl: './popup-stimuli.component.css'
})
export class PopupStimuliComponent {

  previewImage: any = "";

  constructor(
    public dialogRef: MatDialogRef<PopupStimuliComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cell: number, screen: { [key:number]: stimuliScreenValues } }) {
    this.checkCell()
  }

  checkCell() {
    const cellData = this.data.screen[this.data.cell];

    if (cellData && cellData.imageFile) {
      this.previewImage = URL.createObjectURL(cellData.imageFile);
    } else {
      this.previewImage = '';
    }
  }

  deleteCell(){
    delete this.data.screen[this.data.cell];
    this.dialogRef.close();
  }

  getFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0){
      this.data.screen[this.data.cell] = {
        imageName: input.files[0].name,
        imageFile: input.files[0]
      }
      this.previewImage =  URL.createObjectURL(input.files[0]);
    }
  }

  saveAndQuit(){
    this.dialogRef.close();
  }
}
