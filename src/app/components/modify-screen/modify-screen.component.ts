import {
  Component,
  EventEmitter,
  Input, OnInit,
  Output,
} from '@angular/core';
import {
  transitionScreenConstModel,
  transitionScreenModel,
  defaultTransitionScreenModel,
  defaultInstructionScreenModel,
  defaultStimuliScreenModel,
  instructionScreenConstModel,
  instructionScreenModel,
  screenTypeModel,
  stimuliScreenConstModel,
  stimuliScreenModel
} from '../../shared/screenModel';
import {FormsModule} from '@angular/forms';
import {UpdateScreensService} from '../../services/updateScreens/update-screens.service';
import {SaveService} from '../../services/save/save.service';
import {ConfigStimuliComponent} from '../config-stimuli/config-stimuli.component';
import {Offcanvas} from 'bootstrap';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';

@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule,
    ConfigStimuliComponent,
  ],
  templateUrl: './modify-screen.component.html',
  standalone: true,
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent implements OnInit{

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<{ screen: screenTypeModel, flag: boolean }>();

  actualTypeScreen: string = "";
  typeFile: string = "";
  nameFile: string = "";
  haveInstructionFile: boolean = false;
  haveStimuliSoundFile: boolean = false;
  instructionFile: any = "";
  stimuliFile: any = "";
  textToRead: string = '';
  fileDuration: number = 0;
  showWarningMessage: boolean = false;
  private instructionObjectUrl: string | null = null;
  private stimuliObjectUrl: string | null = null;

  dataStimuli!: {
    cell: number;
    screen: any;
    rows: number;
    cols: number;
  }
  stimuliOffcanvasReady: boolean = false;

  constructor(
    private updateScreenService: UpdateScreensService,
    private saveService: SaveService,
    private autoSaveService: AutoSaveService,
    private idbService: IndexedDBService
  ) {
  }

  ngOnInit(): void {
    this.actualTypeScreen = this.screenToModify.type;
    void this.initializeMediaState();
  }

  private async initializeMediaState(): Promise<void> {
    this.haveInstructionFile = await this.checkInstructionFileExist();
    this.haveStimuliSoundFile = await this.checkStimuliSoundFileExist();
  }

  changeTypeScreen(type: string) {
    this.actualTypeScreen = type;
    switch (type){
      case transitionScreenConstModel :
        let newTransitionScreen: transitionScreenModel = structuredClone(defaultTransitionScreenModel);
        newTransitionScreen = this.updateScreenService.updateTransitionScreen(newTransitionScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsTransitionScreen);
        this.screenToModify = newTransitionScreen;
        break;

      case instructionScreenConstModel :
        let newInstructionScreen: instructionScreenModel = structuredClone(defaultInstructionScreenModel);
        newInstructionScreen = this.updateScreenService.updateInstructionScreen(newInstructionScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsInstructionScreen);
        this.screenToModify = newInstructionScreen;
        void this.refreshInstructionMediaState();
        break;

      case stimuliScreenConstModel :
        let newStimuliScreen: stimuliScreenModel = structuredClone(defaultStimuliScreenModel);
        newStimuliScreen = this.updateScreenService.updateStimuliScreen(newStimuliScreen, this.screenToModify.name, this.saveService.dataAuto.globalParamsStimuliScreen);
        this.screenToModify = newStimuliScreen;
        void this.refreshStimuliSoundState();
        this.checkStimuliCells();
        break;

      default :
        break;
    }
  }

  changeTypeFile(type: string){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.screenToModify.values[3] = type;
      this.screenToModify.values[4] = "";
      this.screenToModify.values[5] = undefined;
      this.screenToModify.values[8] = '';
      this.typeFile = type;
      this.haveInstructionFile = false;
      this.setInstructionPreview('');
    }
  }

  async getInstructionFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.screenToModify.type === instructionScreenConstModel ) {
      const file = input.files[0];
      const projectName = this.saveService.getEvalName();
      const id = `${projectName}/${file.name}`;

      try {
        await this.idbService.addFile(id, file, this.getInstructionMediaType());
      } catch {
        await this.idbService.updateFile(id, file, this.getInstructionMediaType());
      }

      this.screenToModify.values[4] = file.name;
      this.screenToModify.values[5] = file;
      this.screenToModify.values[8] = id;
      this.haveInstructionFile = true;
      this.nameFile = file.name;
      this.setInstructionPreview(URL.createObjectURL(file));
      this.getFileDuration(file);
    }else {
      this.haveInstructionFile = false;
    }
  }

  async getStimuliSoundFile(event: Event){
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.screenToModify.type === stimuliScreenConstModel ) {
      const file = input.files[0];
      const projectName = this.saveService.getEvalName();
      const id = `${projectName}/${file.name}`;

      try {
        await this.idbService.addFile(id, file, 'sound');
      } catch {
        await this.idbService.updateFile(id, file, 'sound');
      }

      this.screenToModify.values[10] = file.name;
      this.screenToModify.values[11] = file;
      this.screenToModify.values[13] = id;
      this.haveStimuliSoundFile = true;
      this.nameFile = file.name;
      this.setStimuliPreview(URL.createObjectURL(file));
      this.typeFile = "Son";
    }else {
      this.haveStimuliSoundFile = false;
    }
  }

  async checkInstructionFileExist(): Promise<boolean> {
    if (this.screenToModify.type === instructionScreenConstModel){
      this.typeFile = this.screenToModify.values[3];
      if (this.typeFile === 'Texte'){
        this.textToRead = this.screenToModify.values[4];
        this.setInstructionPreview('');
        return false;
      }else {
        if (this.screenToModify.values[4] !== ''){
          this.nameFile = this.screenToModify.values[4];
          const mediaFile = await this.resolveInstructionMediaFile();
          if (mediaFile) {
            this.screenToModify.values[5] = mediaFile.file;
            this.screenToModify.values[8] = mediaFile.id;
            this.setInstructionPreview(URL.createObjectURL(mediaFile.file));
            this.getFileDuration(mediaFile.file);
            return true;
          }
        }else {
          this.setInstructionPreview('');
        }
      }
    }
    return false;
  }

  async checkStimuliSoundFileExist(): Promise<boolean> {
    if (this.screenToModify.type === stimuliScreenConstModel){
      this.typeFile = "Son";
      if (this.screenToModify.values[10] !== ''){
        this.nameFile = this.screenToModify.values[10];
        const mediaFile = await this.resolveStimuliSoundFile();
        if (mediaFile) {
          this.screenToModify.values[11] = mediaFile.file;
          this.screenToModify.values[13] = mediaFile.id;
          this.setStimuliPreview(URL.createObjectURL(mediaFile.file));
          return true;
        }
      }else {
        this.setStimuliPreview('');
        return false;
      }
    }
    return false;
  }

  private async refreshInstructionMediaState(): Promise<void> {
    this.haveInstructionFile = await this.checkInstructionFileExist();
  }

  private async refreshStimuliSoundState(): Promise<void> {
    this.haveStimuliSoundFile = await this.checkStimuliSoundFileExist();
  }

  private getInstructionMediaType(): 'image' | 'video' | 'sound' {
    switch (this.typeFile) {
      case 'Video':
        return 'video';
      case 'Son':
        return 'sound';
      default:
        return 'image';
    }
  }

  private async resolveInstructionMediaFile(): Promise<{ file: File, id: string } | undefined> {
    const expectedType = this.getInstructionMediaType();
    const mediaId = this.screenToModify.values[8] || this.screenToModify.values[4];
    const candidateIds = this.getCandidateIds(mediaId);

    for (const id of candidateIds) {
      try {
        const evalFile = await this.idbService.getFile(id);
        if (evalFile.type !== expectedType) continue;
        if (!(evalFile.file instanceof Blob)) continue;

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

    try {
      const allFiles = await this.idbService.getAllFiles();
      const baseName = this.extractFileNameFromId(mediaId);
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

  private async resolveStimuliSoundFile(): Promise<{ file: File, id: string } | undefined> {
    const mediaId = this.screenToModify.values[13] || this.screenToModify.values[10];
    const candidateIds = this.getCandidateIds(mediaId);

    for (const id of candidateIds) {
      try {
        const evalFile = await this.idbService.getFile(id);
        if (evalFile.type !== 'sound') continue;
        if (!(evalFile.file instanceof Blob)) continue;

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

    try {
      const allFiles = await this.idbService.getAllFiles();
      const baseName = this.extractFileNameFromId(mediaId);
      const match = allFiles.find((entry) =>
        entry.type === 'sound' && this.extractFileNameFromId(entry.id) === baseName
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

  private getCandidateIds(fileName: string): string[] {
    const cleanName = (fileName ?? '').trim();
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
    const parts = (id ?? '').split('/');
    return parts[parts.length - 1] || id;
  }

  private setInstructionPreview(url: string): void {
    if (this.instructionObjectUrl) {
      URL.revokeObjectURL(this.instructionObjectUrl);
      this.instructionObjectUrl = null;
    }
    this.instructionFile = url;
    if (url) {
      this.instructionObjectUrl = url;
    }
  }

  private setStimuliPreview(url: string): void {
    if (this.stimuliObjectUrl) {
      URL.revokeObjectURL(this.stimuliObjectUrl);
      this.stimuliObjectUrl = null;
    }
    this.stimuliFile = url;
    if (url) {
      this.stimuliObjectUrl = url;
    }
  }

  getFileDuration(fileUser: File){
    if (this.typeFile === 'Video' || this.typeFile === 'Son'){
     const file = fileUser;

      const media = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
      media.src = URL.createObjectURL(file);

      media.preload = 'metadata';

      media.onloadedmetadata = () => {
        this.fileDuration = media.duration;
        console.log('Durée :', this.fileDuration);

        URL.revokeObjectURL(media.src);
      };
    }
  }

  getText(event: string){
    if (this.screenToModify.type === instructionScreenConstModel){
      this.textToRead = event;
      this.screenToModify.values[4] = event;
    }
  }

  playText() {
    if (!this.textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(this.textToRead);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  get totalCells(): number[] {
    return Array.from({ length: this.screenToModify.values[0] * this.screenToModify.values[1] }, (_, i) => i + 1);
  }

  checkStimuliCells(){
    let numberCells = this.screenToModify.values[0] * this.screenToModify.values[1];
    const listScreen = this.screenToModify.values[12];
    const numberKey = Object.keys(listScreen).length;
    if (numberKey < numberCells){
      for (let i = numberKey; i < numberCells; i++){
        listScreen[i] = {
          imageName: "",
          imageFile: undefined,
          soundName: "",
          soundFile: undefined,
          goodAnswer: false,
        }
      }
    }else {
      for (const keyNumber in listScreen){
        if (Number(keyNumber) >= numberCells){
          delete listScreen[keyNumber];
        }
      }
    }
  }

  openStimuliData(cellNumber: number) {
    const listScreen = this.screenToModify.values[12];
    this.dataStimuli = {
      cell: cellNumber,
      screen: listScreen,
      rows: this.screenToModify.values[0],
      cols: this.screenToModify.values[1]
    };
    this.stimuliOffcanvasReady = true;
    setTimeout(() => {
      this.openOffcanvasStimuli();
    });
  }

  openOffcanvasStimuli() {
    const element = document.getElementById('configStimuli');

    if (element) {
      const instance = Offcanvas.getOrCreateInstance(element);
      instance.show();
    }
  }

  checkFileDurationAndTimeScreen(){
    console.log(this.fileDuration, this.screenToModify.values[1])
    if (this.fileDuration > this.screenToModify.values[1]){
      if (this.showWarningMessage){
        this.showWarningMessage = false;
        this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
      }else {
        this.showWarningMessage = true;
      }
    }else {
      this.showWarningMessage = false;
      this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
    }
  }

  backToScreenList(){
    if (this.screenToModify.type === instructionScreenConstModel && (this.typeFile === 'Video' || this.typeFile === 'Son')){
      console.log("check file duration")
      this.checkFileDurationAndTimeScreen();
    }else {
      this.selectedScreenChange.emit({screen: this.screenToModify, flag: false});
    }
    this.autoSaveService.autoSave('backToScreenList');
  }

  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;
  protected readonly Number = Number;
}
