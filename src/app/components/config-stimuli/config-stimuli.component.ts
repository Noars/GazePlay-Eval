import {Component, ElementRef, Input, OnChanges, ViewChild} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {stimuliScreenValues} from '../../shared/screenModel';
import {CropImageComponent} from '../crop-image/crop-image.component';
import {MatDialog} from '@angular/material/dialog';
import { IndexedDBService } from '../../services/indexedDB/indexed-db.service';
import {SaveService} from '../../services/save/save.service';

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
export class ConfigStimuliComponent implements OnChanges{

  @Input() data!: {
    cell: number,
    screen: { [key:number]: stimuliScreenValues }
  };

  @ViewChild('fileInputImage') fileInputImage!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInputSound') fileInputSound!: ElementRef<HTMLInputElement>;

  pageElement: HTMLElement | null = document.getElementById('configStimuli');
  isResizing = false;
  previewImage: any = "";
  previewSound: any = "";

  constructor(
    private dialog: MatDialog,
    private idbService: IndexedDBService,
    private saveService: SaveService){
  }

  async ngOnChanges() {
    await this.checkCell();
  }

  async checkCell(): Promise<void> {
    const cellData = this.data.screen[this.data.cell];
    const hasUsableImageFile = cellData.imageFile instanceof Blob;
    const hasUsableSoundFile = cellData.soundFile instanceof Blob;

    // si l'image n'est pas dans la mémoire
    if (!hasUsableImageFile && (cellData.imageId || cellData.imageName)) {
      cellData.imageFile = undefined;
      const imageRef = cellData.imageId || cellData.imageName!;
      const match = await this.findFileInIDB(imageRef, 'image');
      if (match) {
        cellData.imageFile = match.file;
        cellData.imageId = match.id;
      }
    }

    if (cellData.imageFile instanceof Blob) {
      this.previewImage = URL.createObjectURL(cellData.imageFile);
    } else {
      this.previewImage = '';
    }

    // si le son n'est pas dans la mémoire
    if (!hasUsableSoundFile && (cellData.soundId || cellData.soundName)) {
      cellData.soundFile = undefined;
      const soundRef = cellData.soundId || cellData.soundName!;
      const match = await this.findFileInIDB(soundRef, 'sound');
      if (match) {
        cellData.soundFile = match.file;
        cellData.soundId = match.id;
      }
    }

    if (cellData.soundFile instanceof Blob) {
      this.previewSound = URL.createObjectURL(cellData.soundFile);
    } else {
      this.previewSound = '';
    }

    if (this.fileInputImage && this.fileInputSound) {
      this.fileInputImage.nativeElement.value = '';
      this.fileInputSound.nativeElement.value = '';
    }
  }

  async deleteCell(): Promise<void> {
    const cell = this.data.screen[this.data.cell];

    // Supprimer les fichiers de l'IDB si ils existent
    if (cell.imageId || cell.imageName) {
      await this.deleteFileFromIDB(cell.imageId || cell.imageName!, 'image');
    }

    if (cell.soundId || cell.soundName) {
      await this.deleteFileFromIDB(cell.soundId || cell.soundName!, 'sound');
    }

    this.data.screen[this.data.cell] = {
      imageId: '',
      imageName: '',
      imageFile: undefined,
      soundId: '',
      soundName: '',
      soundFile: undefined,
      goodAnswer: false,
    };

    this.checkCell();
  }

  private async findFileInIDB(fileName: string, expectedType: 'image' | 'sound'): Promise<{ file: File, id: string } | undefined> {
    const candidateIds = this.getCandidateIds(fileName);

    for (const id of candidateIds) {
      try {
        const evalFile = await this.idbService.getFile(id);
        if (evalFile.type !== expectedType) continue;
        if (!(evalFile?.file instanceof Blob)) continue;

        if (evalFile.file instanceof File) {
          return { file: evalFile.file, id };
        }

        const inferredName = this.extractFileNameFromId(id);
        return {
          file: new File([evalFile.file], inferredName, { type: evalFile.file.type }),
          id
        };
      } catch {
        // essaie le candidat suivant
      }
    }

    // Fallback: certaines sauvegardes ont un préfixe de projet différent.
    // Dans ce cas, on retrouve le média par son nom de fichier et son type.
    try {
      const allFiles = await this.idbService.getAllFiles();
      const baseName = this.extractFileNameFromId(fileName);
      const match = allFiles.find((entry) =>
        entry.type === expectedType && this.extractFileNameFromId(entry.id) === baseName
      );

      if (match?.file instanceof Blob) {
        if (match.file instanceof File) {
          return { file: match.file, id: match.id };
        }
        return {
          file: new File([match.file], baseName, { type: match.file.type }),
          id: match.id
        };
      }
    } catch {
      // ignore: fallback best-effort
    }

    return undefined;
  }

  private async deleteFileFromIDB(fileName: string, expectedType: 'image' | 'sound'): Promise<void> {
    const candidateIds = this.getCandidateIds(fileName);

    for (const id of candidateIds) {
      try {
        const evalFile = await this.idbService.getFile(id);
        if (evalFile.type !== expectedType) continue;
        await this.idbService.deleteFile(id);
      } catch {
        // peut déjà être supprimé ou absent
      }
    }

    try {
      const allFiles = await this.idbService.getAllFiles();
      const baseName = this.extractFileNameFromId(fileName);
      const matches = allFiles.filter((entry) =>
        entry.type === expectedType && this.extractFileNameFromId(entry.id) === baseName
      );

      for (const match of matches) {
        try {
          await this.idbService.deleteFile(match.id);
        } catch {
          // peut déjà être supprimé ou absent
        }
      }
    } catch {
      // ignore: cleanup best-effort
    }
  }

  private getCandidateIds(fileName: string): string[] {
    const cleanName = fileName.trim();
    if (!cleanName) return [];

    const projectName = this.saveService.getEvalName();
    const baseName = this.extractFileNameFromId(cleanName);
    const ids = new Set<string>();

    ids.add(cleanName);
    ids.add(baseName);

    if (projectName) {
      ids.add(`${projectName}/${cleanName}`);
      ids.add(`${projectName}/${baseName}`);
    }

    return [...ids];
  }

  private extractFileNameFromId(id: string): string {
    const parts = id.split('/');
    return parts[parts.length - 1] || id;
  }

  async getImageFile(event: Event){
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const projectName = this.saveService.getEvalName();
    const id = `${projectName}/${file.name}`;

    try {
      await this.idbService.addFile(id, file, 'image');
    } catch {
      await this.idbService.updateFile(id, file, 'image'); // écrase si existe déjà
    }

    this.data.screen[this.data.cell].imageName = file.name;
    this.data.screen[this.data.cell].imageId = id;
    this.data.screen[this.data.cell].imageFile = file;
    this.previewImage = URL.createObjectURL(file);
  }

  async getSoundFile(event: Event){
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const projectName = this.saveService.getEvalName();
    const id = `${projectName}/${file.name}`;

    try {
      await this.idbService.addFile(id, file, 'sound');
    } catch {
      await this.idbService.updateFile(id, file, 'sound');
    }

    this.data.screen[this.data.cell].soundName = file.name;
    this.data.screen[this.data.cell].soundId = id;
    this.data.screen[this.data.cell].soundFile = file;
    this.previewSound = URL.createObjectURL(file);
  }

  cropImage(){
    const dialogRef = this.dialog.open(CropImageComponent, {
      data: {
        image: this.data.screen[this.data.cell].imageFile
      },
      panelClass: 'crop-image',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((result: File | null) => {
      if (result) {
        this.data.screen[this.data.cell].imageFile = result;
        this.previewImage =  URL.createObjectURL(result);
      }
    });
  }

  startResize(event: MouseEvent){
    this.isResizing = true;

    document.addEventListener('mousemove', this.resize);
    document.addEventListener('mouseup', this.stopResize);
  }

  resize = (event: MouseEvent) => {
    if (!this.isResizing) return;

    const newWidth = event.clientX;
    const el = document.getElementById('configStimuli');

    if (el) {
      el.style.setProperty('--bs-offcanvas-width', `${newWidth}px`);
    }
  };

  stopResize = () => {
    this.isResizing = false;

    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);
  };
}
