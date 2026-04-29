import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {CropperPosition, ImageCropperComponent} from 'ngx-image-cropper';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-crop-image',
  imports: [
    ImageCropperComponent,
    FormsModule
  ],
  templateUrl: './crop-image.component.html',
  styleUrl: './crop-image.component.css'
})
export class CropImageComponent implements OnInit{

  @ViewChild('cropper') cropper: any;

  imageToCrop: string = '';
  croppedImage: File | undefined;
  imageMaxHeight = -1;
  imageMaxWidth = -1;


  cropWidthX1 = 0;
  cropWidthX2 = 0;
  cropHeightY1 = 0;
  cropHeightY2 = 0;
  cropWidthSize = 0;
  cropHeightSize = 0;

  cropperPosition: CropperPosition = {
    x1: 0,
    y1: 0,
    x2: 200,
    y2: 200
  };

  constructor(
    public dialogRef: MatDialogRef<CropImageComponent>, @Inject(MAT_DIALOG_DATA) public data: {image: File}) {
  }

  ngOnInit() {
    const file = this.data.image;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;

      const img = new Image();
      img.onload = () => {
        const imageWidth = img.width;
        const imageHeight = img.height;

        if (imageWidth < 500 || imageHeight < 500) {
          this.imageToCrop = this.resizeImage(base64, imageWidth, imageHeight);
        } else {
          this.imageToCrop = base64;
          this.cropperPosition = {
            x1: 0,
            y1: 0,
            x2: imageWidth,
            y2: imageHeight
          }
        }
      };

      img.src = base64;
    };

    reader.readAsDataURL(file);
  }

  resizeImage(base64: string, width: number, height: number): string {
    const canvas = document.createElement('canvas');

    let newWidth: number;
    let newHeight: number;

    if (width < height) {
      newWidth = 500;
      newHeight = (height / width) * 500;
    } else {
      newHeight = 500;
      newWidth = (width / height) * 500;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = base64;

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    return canvas.toDataURL('image/png');
  }

  imageCropped(event: any) {
    this.croppedImage = event.blob;
  }

  onCropperChange(event: any) {
    this.cropperPosition = {
      x1: event.x1,
      y1: event.y1,
      x2: event.x2,
      y2: event.y2
    }

    if (this.imageMaxHeight === -1) {
      this.imageMaxHeight = event.y2;
    }
    if (this.imageMaxWidth === -1) {
      this.imageMaxWidth = event.x2;
    }

    this.cropWidthX1 = event.x1;
    this.cropWidthX2 = event.x2;
    this.cropHeightY1 = event.y1;
    this.cropHeightY2 = event.y2;
    this.cropWidthSize = event.x2 - event.x1;
    this.cropHeightSize = event.y2 - event.y1;
  }

  changeHeightCropper(event: any) {
    this.cropperPosition = {
      x1: this.cropWidthX1,
      y1: this.cropHeightY1,
      x2: this.cropWidthX2,
      y2: event + this.cropHeightY1
    }

    this.cropHeightY2 = event + this.cropHeightY1;
    this.cropHeightSize = event;
  }

  changeWidthCropper(event: any) {
    this.cropperPosition = {
      x1: this.cropWidthX1,
      y1: this.cropHeightY1,
      x2: event + this.cropWidthX1,
      y2: this.cropHeightY2
    }

    this.cropWidthX2 = event + this.cropWidthX1;
    this.cropWidthSize = event;
  }

  validateCrop(){
    console.log('Cropped image:', this.croppedImage);
    this.dialogRef.close(this.croppedImage);
  }

  cancelCrop(){
    this.dialogRef.close();
  }
}
