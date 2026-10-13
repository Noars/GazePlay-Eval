import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CropImageComponent } from './crop-image.component';
import { FlashService } from '../../services/flash-message/flash.service';
import { ImageCropperComponent } from 'ngx-image-cropper';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({ selector: 'image-cropper', template: '', standalone: true })
class ImageCropperStub {
  @Input() imageBase64: any;
  @Input() cropper: any;
  @Input() maintainAspectRatio: any;
  @Input() aspectRatio: any;
  @Input() imageQuality: any;
  @Input() format: any;
  @Output() cropperChange = new EventEmitter<any>();
  @Output() imageCropped  = new EventEmitter<any>();
}

describe('CropImageComponent', () => {
  let component: CropImageComponent;
  let fixture: ComponentFixture<CropImageComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<CropImageComponent>>;
  let flashSpy: jasmine.SpyObj<FlashService>;
  let capturedReader: any;
  let mockImage: any;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    flashSpy     = jasmine.createSpyObj('FlashService',  ['show']);

    await TestBed.configureTestingModule({
      imports: [CropImageComponent],
      providers: [
        { provide: MatDialogRef,  useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { image: new File(['img'], 'test.png', { type: 'image/png' }) } },
        { provide: FlashService,  useValue: flashSpy }
      ]
    })
    .overrideComponent(CropImageComponent, {
      remove: { imports: [ImageCropperComponent] },
      add:    { imports: [ImageCropperStub] }
    })
    .compileComponents();

    // Capture l'instance FileReader créée dans ngOnInit
    capturedReader = null;
    spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function(this: any) {
      capturedReader = this;
    });

    // Mock de Image (utilisé dans ngOnInit et resizeImage)
    mockImage = { onload: null as any, src: '', width: 600, height: 800 };
    spyOn(window as any, 'Image').and.returnValue(mockImage);

    fixture   = TestBed.createComponent(CropImageComponent);
    component = fixture.componentInstance;
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function triggerNgOnInit(base64: string, imgWidth: number, imgHeight: number): void {
    fixture.detectChanges();                       // appelle ngOnInit → readAsDataURL spy
    Object.defineProperty(capturedReader, 'result', { value: base64, configurable: true });
    capturedReader.onload();                       // déclenche le callback FileReader
    mockImage.width  = imgWidth;
    mockImage.height = imgHeight;
    mockImage.onload();                            // déclenche le callback Image
  }

  // ─── Création ─────────────────────────────────────────────────────────────

  it('devrait être créé', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('état initial — valeurs par défaut', () => {
    expect(component.imageToCrop).toBe('');
    expect(component.croppedImage).toBeUndefined();
    expect(component.imageMaxHeight).toBe(-1);
    expect(component.imageMaxWidth).toBe(-1);
    expect(component.cropperPosition).toEqual({ x1: 0, y1: 0, x2: 200, y2: 200 });
  });

  // ─── ngOnInit ─────────────────────────────────────────────────────────────

  it('ngOnInit — image >= 500×500 → imageToCrop = base64 et cropperPosition ajustée', () => {
    triggerNgOnInit('data:image/png;base64,abc', 600, 800);

    expect(component.imageToCrop).toBe('data:image/png;base64,abc');
    expect(component.cropperPosition).toEqual({ x1: 0, y1: 0, x2: 600, y2: 800 });
  });

  it('ngOnInit — image < 500 px → resizeImage appelé et imageToCrop mis à jour', () => {
    spyOn(component, 'resizeImage').and.returnValue('data:image/png;base64,resized');
    triggerNgOnInit('data:image/png;base64,small', 200, 300);

    // L'image déjà chargée est transmise pour éviter de dessiner une image non décodée.
    expect(component.resizeImage).toHaveBeenCalledWith('data:image/png;base64,small', 200, 300, jasmine.any(Object));
    expect(component.imageToCrop).toBe('data:image/png;base64,resized');
  });

  it('ngOnInit — readAsDataURL appelé avec le fichier injecté', () => {
    fixture.detectChanges();
    expect(FileReader.prototype.readAsDataURL).toHaveBeenCalled();
  });

  // ─── resizeImage ──────────────────────────────────────────────────────────

  it('resizeImage — width < height → newWidth = 500, newHeight proportionnel', () => {
    const mockCtx  = { drawImage: jasmine.createSpy('drawImage') };
    const mockCanvas: any = {
      width: 0, height: 0,
      getContext: jasmine.createSpy('getContext').and.returnValue(mockCtx),
      toDataURL:  jasmine.createSpy('toDataURL').and.returnValue('data:resized')
    };
    spyOn(document, 'createElement').and.callFake((tag: string) =>
      tag === 'canvas' ? mockCanvas : document.createElement(tag)
    );

    const result = component.resizeImage('data:image/png;base64,abc', 100, 200);

    expect(mockCanvas.width).toBe(500);
    expect(mockCanvas.height).toBe(1000);
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(result).toBe('data:resized');
  });

  it('resizeImage — width >= height → newHeight = 500, newWidth proportionnel', () => {
    const mockCtx  = { drawImage: jasmine.createSpy('drawImage') };
    const mockCanvas: any = {
      width: 0, height: 0,
      getContext: jasmine.createSpy('getContext').and.returnValue(mockCtx),
      toDataURL:  jasmine.createSpy('toDataURL').and.returnValue('data:resized')
    };
    spyOn(document, 'createElement').and.callFake((tag: string) =>
      tag === 'canvas' ? mockCanvas : document.createElement(tag)
    );

    const result = component.resizeImage('data:image/png;base64,abc', 400, 200);

    expect(mockCanvas.height).toBe(500);
    expect(mockCanvas.width).toBe(1000);
    expect(result).toBe('data:resized');
  });

  it('resizeImage — width === height → newHeight = newWidth = 500', () => {
    const mockCtx  = { drawImage: jasmine.createSpy('drawImage') };
    const mockCanvas: any = {
      width: 0, height: 0,
      getContext: jasmine.createSpy('getContext').and.returnValue(mockCtx),
      toDataURL:  jasmine.createSpy('toDataURL').and.returnValue('data:resized')
    };
    spyOn(document, 'createElement').and.callFake((tag: string) =>
      tag === 'canvas' ? mockCanvas : document.createElement(tag)
    );

    component.resizeImage('data:image/png;base64,abc', 300, 300);

    expect(mockCanvas.width).toBe(500);
    expect(mockCanvas.height).toBe(500);
  });

  // ─── imageCropped ─────────────────────────────────────────────────────────

  it('imageCropped → croppedImage défini depuis event.blob', () => {
    const blob = new File(['cropped'], 'cropped.png');
    component.imageCropped({ blob });
    expect(component.croppedImage).toBe(blob as any);
  });

  it('imageCropped → croppedImage undefined si event.blob absent', () => {
    component.imageCropped({ blob: undefined });
    expect(component.croppedImage).toBeUndefined();
  });

  // ─── onCropperChange ──────────────────────────────────────────────────────

  it('onCropperChange → met à jour cropperPosition et toutes les dimensions', () => {
    component.onCropperChange({ x1: 10, y1: 20, x2: 110, y2: 120 });

    expect(component.cropperPosition).toEqual({ x1: 10, y1: 20, x2: 110, y2: 120 });
    expect(component.cropWidthX1).toBe(10);
    expect(component.cropWidthX2).toBe(110);
    expect(component.cropHeightY1).toBe(20);
    expect(component.cropHeightY2).toBe(120);
    expect(component.cropWidthSize).toBe(100);
    expect(component.cropHeightSize).toBe(100);
  });

  it('onCropperChange — imageMaxHeight = -1 → initialisé à event.y2', () => {
    component.imageMaxHeight = -1;
    component.onCropperChange({ x1: 0, y1: 0, x2: 300, y2: 250 });
    expect(component.imageMaxHeight).toBe(250);
  });

  it('onCropperChange — imageMaxWidth = -1 → initialisé à event.x2', () => {
    component.imageMaxWidth = -1;
    component.onCropperChange({ x1: 0, y1: 0, x2: 300, y2: 250 });
    expect(component.imageMaxWidth).toBe(300);
  });

  it('onCropperChange — imageMaxHeight déjà défini → non écrasé', () => {
    component.imageMaxHeight = 400;
    component.onCropperChange({ x1: 0, y1: 0, x2: 300, y2: 250 });
    expect(component.imageMaxHeight).toBe(400);
  });

  it('onCropperChange — imageMaxWidth déjà défini → non écrasé', () => {
    component.imageMaxWidth = 500;
    component.onCropperChange({ x1: 0, y1: 0, x2: 300, y2: 250 });
    expect(component.imageMaxWidth).toBe(500);
  });

  // ─── changeHeightCropper ──────────────────────────────────────────────────

  it('changeHeightCropper → recalcule y2 et met à jour cropHeightSize', () => {
    component.cropWidthX1  = 10;
    component.cropHeightY1 = 20;
    component.cropWidthX2  = 110;
    component.cropHeightY2 = 120;

    component.changeHeightCropper(80);

    expect(component.cropperPosition).toEqual({ x1: 10, y1: 20, x2: 110, y2: 100 });
    expect(component.cropHeightY2).toBe(100);
    expect(component.cropHeightSize).toBe(80);
  });

  it('changeHeightCropper — hauteur 0 → y2 = y1', () => {
    component.cropWidthX1  = 0;
    component.cropHeightY1 = 50;
    component.cropWidthX2  = 100;
    component.cropHeightY2 = 100;

    component.changeHeightCropper(0);

    expect(component.cropperPosition.y2).toBe(50);
    expect(component.cropHeightSize).toBe(0);
  });

  // ─── changeWidthCropper ───────────────────────────────────────────────────

  it('changeWidthCropper → recalcule x2 et met à jour cropWidthSize', () => {
    component.cropWidthX1  = 10;
    component.cropHeightY1 = 20;
    component.cropWidthX2  = 110;
    component.cropHeightY2 = 120;

    component.changeWidthCropper(60);

    expect(component.cropperPosition).toEqual({ x1: 10, y1: 20, x2: 70, y2: 120 });
    expect(component.cropWidthX2).toBe(70);
    expect(component.cropWidthSize).toBe(60);
  });

  it('changeWidthCropper — largeur 0 → x2 = x1', () => {
    component.cropWidthX1  = 30;
    component.cropHeightY1 = 0;
    component.cropWidthX2  = 130;
    component.cropHeightY2 = 100;

    component.changeWidthCropper(0);

    expect(component.cropperPosition.x2).toBe(30);
    expect(component.cropWidthSize).toBe(0);
  });

  // ─── validateCrop ─────────────────────────────────────────────────────────

  it('validateCrop → dialogRef.close(croppedImage) et flash success', () => {
    const croppedFile = new File(['cropped'], 'cropped.png');
    component.croppedImage = croppedFile;

    component.validateCrop();

    expect(dialogRefSpy.close).toHaveBeenCalledOnceWith(croppedFile);
    expect(flashSpy.show).toHaveBeenCalledOnceWith('success', 'Votre image a bien été recadrée.');
  });

  it("validateCrop — aucun recadrage effectué → fermeture sans résultat et message « non modifiée »", () => {
    component.croppedImage = undefined;
    component.validateCrop();
    expect(dialogRefSpy.close).toHaveBeenCalledOnceWith();
    expect(flashSpy.show).toHaveBeenCalledOnceWith('info', "L'image n'a pas été modifiée.");
  });

  // ─── cancelCrop ───────────────────────────────────────────────────────────

  it('cancelCrop → dialogRef.close() et flash info', () => {
    component.cancelCrop();
    expect(dialogRefSpy.close).toHaveBeenCalledOnceWith();
    expect(flashSpy.show).toHaveBeenCalledOnceWith('info', 'Les proportions de votre image ont été conservées.');
  });
});
