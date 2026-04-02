import {Component, ElementRef, Inject, Input, ViewChild} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {stimuliScreenValues} from '../../shared/screenModel';

@Component({
  selector: 'app-config-stimuli',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './config-stimuli.component.html',
  styleUrl: './config-stimuli.component.css'
})
export class ConfigStimuliComponent {

  @Input() data!: {
    cell: number,
    screen: { [key:number]: stimuliScreenValues }
  };

  @ViewChild('fileInputImage') fileInputImage!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputSound') fileInputSound!: ElementRef<HTMLInputElement>;

  isResizing = false;
  previewImage: any = "";
  previewSound: any = "";

  ngOnChanges() {
    this.checkCell();
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

    if (this.fileInputImage && this.fileInputSound) {
      this.fileInputImage.nativeElement.value = '';
      this.fileInputSound.nativeElement.value = '';
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
    this.checkCell();
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

  startResize(event: MouseEvent){
    this.isResizing = true;

    document.addEventListener('mousemove', this.resize);
    document.addEventListener('mouseup', this.stopResize);
  }

  resize(event: MouseEvent){
    if (!this.isResizing) return;

    const newWidth = event.clientX; // pour offcanvas gauche
    const el = document.getElementById('configStimuli');

    if (el) {
      el.style.setProperty('--bs-offcanvas-width', `${newWidth}px`);
    }
  };

  stopResize(){
    this.isResizing = false;

    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  };
}
