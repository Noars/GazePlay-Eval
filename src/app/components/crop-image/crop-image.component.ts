import {Component, Inject, OnInit} from '@angular/core';
import {ImageCropperComponent} from 'ngx-image-cropper';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-crop-image',
  imports: [
    ImageCropperComponent
  ],
  templateUrl: './crop-image.component.html',
  styleUrl: './crop-image.component.css'
})
export class CropImageComponent implements OnInit{

  imageToCrop: string = '';
  croppedImage: File | undefined;

  constructor(
    public dialogRef: MatDialogRef<CropImageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {image: File}) {
  }

  ngOnInit() {
    const file = this.data.image;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;

      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;

        if (width < 500 || height < 500) {
          this.imageToCrop = this.resizeImage(base64, width, height);
        } else {
          this.imageToCrop = base64;
        }
      };

      img.src = base64;
    };

    reader.readAsDataURL(file);
  }

  resizeImage(base64: string, width: number, height: number): string {
    const canvas = document.createElement('canvas');

    let newWidth = width;
    let newHeight = height;

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

  validateCrop(){
    console.log('Cropped image:', this.croppedImage);
    this.dialogRef.close(this.croppedImage);
  }

  cancelCrop(){
    this.dialogRef.close();
  }
}
