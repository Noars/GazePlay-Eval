import {Component, ElementRef, Input, OnChanges, ViewChild} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {stimuliScreenValues} from '../../shared/screenModel';
import {CropImageComponent} from '../crop-image/crop-image.component';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-config-stimuli',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './config-stimuli.component.html',
  standalone: true,
  styleUrl: './config-stimuli.component.css'
})
export class ConfigStimuliComponent implements OnChanges {

  @Input() data!: {
    cell: number;
    screen: { [key: number]: stimuliScreenValues };
    rows: number;
    cols: number;
  };

  @ViewChild('fileInputImage') fileInputImage!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputSound') fileInputSound!: ElementRef<HTMLInputElement>;

  isResizing = false;
  previewImage: any = '';
  previewSound: any = '';

  constructor(private dialog: MatDialog) {}

  ngOnChanges() {
    this.checkCell();
  }

  get totalCells(): number {
    return this.data.rows * this.data.cols;
  }

  get allCells(): number[] {
    return Array.from({ length: this.totalCells }, (_, i) => i);
  }

  checkCell() {
    const cellData = this.data.screen[this.data.cell];
    this.previewImage = cellData?.imageFile ? URL.createObjectURL(cellData.imageFile) : '';
    this.previewSound = cellData?.soundFile ? URL.createObjectURL(cellData.soundFile) : '';

    if (this.fileInputImage) this.fileInputImage.nativeElement.value = '';
    if (this.fileInputSound) this.fileInputSound.nativeElement.value = '';
  }

  navigate(direction: number) {
    const next = this.data.cell + direction;
    if (next >= 0 && next < this.totalCells) {
      this.data.cell = next;
      this.checkCell();
    }
  }

  navigateTo(index: number) {
    if (index >= 0 && index < this.totalCells) {
      this.data.cell = index;
      this.checkCell();
    }
  }

  deleteCell() {
    this.data.screen[this.data.cell] = {
      imageName: '',
      imageFile: undefined,
      soundName: '',
      soundFile: undefined,
      goodAnswer: false,
    };
    this.checkCell();
  }

  getImageFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.data.screen[this.data.cell].imageName = input.files[0].name;
      this.data.screen[this.data.cell].imageFile = input.files[0];
      this.previewImage = URL.createObjectURL(input.files[0]);
    }
  }

  getSoundFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.data.screen[this.data.cell].soundName = input.files[0].name;
      this.data.screen[this.data.cell].soundFile = input.files[0];
      this.previewSound = URL.createObjectURL(input.files[0]);
    }
  }

  cropImage() {
    const dialogRef = this.dialog.open(CropImageComponent, {
      data: { image: this.data.screen[this.data.cell].imageFile },
      panelClass: 'crop-image',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: File | null) => {
      if (result) {
        this.data.screen[this.data.cell].imageFile = result;
        this.previewImage = URL.createObjectURL(result);
      }
    });
  }

  startResize(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();
    document.addEventListener('mousemove', this.resize);
    document.addEventListener('mouseup', this.stopResize);
  }

  resize = (event: MouseEvent) => {
    if (!this.isResizing) return;
    const el = document.getElementById('configStimuli');
    if (el) {
      const newHeight = Math.max(200, Math.min(event.clientY, window.innerHeight - 60));
      el.style.setProperty('--bs-offcanvas-height', `${newHeight}px`);
    }
  };

  stopResize = () => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  };
}
