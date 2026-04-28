import {Injectable} from '@angular/core';
import JSZip from 'jszip';
import {saveAs} from 'file-saver';
import {SaveService} from '../save/save.service';
import {
  instructionScreenConstKey,
  instructionScreenConstModel,
  screenTypeModel,
  stimuliScreenConstKey,
  stimuliScreenConstModel,
  transitionScreenConstKey,
  transitionScreenConstModel
} from '../../shared/screenModel';
import {saveModel} from '../../shared/saveModel';
import {IndexedDBService} from '../indexedDB/indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  constructor(private idbService: IndexedDBService) {}

  private async getFileFromIDB(id: string): Promise<Blob | null> {
    if (!id) return null;
    try {
      const entry = await this.idbService.getFile(id);
      return entry.file;
    } catch {
      return null;
    }
  }

  private isValidFile(f: any): f is File | Blob {
    return f instanceof File || f instanceof Blob;
  }

  async generateEvalZip(saveService: SaveService) {
    const zip = new JSZip();

    const evalData = saveService.dataAuto.listScreens;
    let jsonData: any[] = [];

    for (let i = 0; i < evalData.length; i++) {
      switch (evalData[i].type) {

        case transitionScreenConstModel:
          this.generateTransitionScreenZip(evalData[i], jsonData);
          break;

        case instructionScreenConstModel:
          if (evalData[i].values[3] === "Texte") {
            this.generateInstructionScreenZipText(evalData[i], jsonData);
          } else {
            let instructionValues = structuredClone(evalData[i].values);
            switch (instructionValues[3]) {

              case "Image":
                await this.generateInstructionScreenZipImg(saveService.getEvalName(), instructionValues, jsonData, zip);
                break;

              case "Video":
                await this.generateInstructionScreenZipVideo(saveService.getEvalName(), instructionValues, jsonData, zip);
                break;

              case "Son":
                await this.generateInstructionScreenZipSound(saveService.getEvalName(), instructionValues, jsonData, zip);
                break;

              default:
                break;
            }
          }
          break;

        case stimuliScreenConstModel:
          await this.generateStimuliScreenZip(saveService.getEvalName(), evalData[i], jsonData, zip);
          break;

        default:
          break;
      }
    }

    zip.file(saveService.getEvalName() + '/evalData.json', JSON.stringify(jsonData, null, 2));
    zip.file(saveService.getEvalName() + '/evalInfo.json', JSON.stringify(this.getInfoEval(saveService), null, 2));

    zip.generateAsync({type: 'blob'}).then(content => {
      saveAs(content, saveService.getEvalName() + '-gazeplayEval.zip');
    });
  }

  getInfoEval(saveService: SaveService){
    return {
      "Nom de l'évaluation": saveService.getEvalName(),
      "Format choisi": saveService.dataAuto.format,
      "Informations participant": saveService.dataAuto.infoParticipant
    };
  }

  generateTransitionScreenZip(evalData: screenTypeModel, jsonData: any[]){
    const transitionValues = structuredClone(evalData.values);
    const transitionResult = transitionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = transitionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    const transitionData = {
      Type: transitionScreenConstModel,
      ...transitionResult,
    }
    jsonData.push(transitionData);
  }

  generateInstructionScreenZipText(evalData: screenTypeModel, jsonData: any[]){
    const instructionTextValues = structuredClone(evalData.values);
    instructionTextValues.splice(5, 1);
    const instructionTxtResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionTextValues[idx];
      return acc;
    }, {} as Record<string, any>);
    const instructionTxtData = {
      Type: instructionScreenConstModel,
      ...instructionTxtResult,
    }
    jsonData.push(instructionTxtData);
  }

  async generateInstructionScreenZipImg(evalName: string, instructionValues: any[], jsonData: any[], zip: JSZip){
    let imgFile: File | Blob | null = this.isValidFile(instructionValues[5]) ? instructionValues[5] : null;
    if (!imgFile && instructionValues[4]) {
      const idbId = instructionValues[8] || `${evalName}/${instructionValues[4]}`;
      imgFile = await this.getFileFromIDB(idbId);
    }
    if (imgFile) {
      const imgArrayBuffer = await imgFile.arrayBuffer();
      zip.file(evalName + '/images/' + instructionValues[4], imgArrayBuffer);
    }
    instructionValues.splice(5, 1);
    const instructionImgResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    jsonData.push({
      Type: instructionScreenConstModel,
      ...instructionImgResult,
    });
  }

  async generateInstructionScreenZipVideo(evalName: string, instructionValues: any[], jsonData: any[], zip: JSZip){
    let videoFile: File | Blob | null = this.isValidFile(instructionValues[5]) ? instructionValues[5] : null;
    if (!videoFile && instructionValues[4]) {
      const idbId = instructionValues[8] || `${evalName}/${instructionValues[4]}`;
      videoFile = await this.getFileFromIDB(idbId);
    }
    if (videoFile) {
      const videoArrayBuffer = await videoFile.arrayBuffer();
      zip.file(evalName + '/videos/' + instructionValues[4], videoArrayBuffer);
    }
    instructionValues.splice(5, 1);
    const instructionVideoResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    jsonData.push({
      Type: instructionScreenConstModel,
      ...instructionVideoResult,
    });
  }

  async generateInstructionScreenZipSound(evalName: string, instructionValues: any[], jsonData: any[], zip: JSZip){
    let audioFile: File | Blob | null = this.isValidFile(instructionValues[5]) ? instructionValues[5] : null;
    if (!audioFile && instructionValues[4]) {
      const idbId = instructionValues[8] || `${evalName}/${instructionValues[4]}`;
      audioFile = await this.getFileFromIDB(idbId);
    }
    if (audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();
      zip.file(evalName + '/audio/' + instructionValues[4], audioArrayBuffer);
    }
    instructionValues.splice(5, 1);
    const instructionAudioResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    jsonData.push({
      Type: instructionScreenConstModel,
      ...instructionAudioResult,
    });
  }

  async generateStimuliScreenZip(evalName: string, evalData: screenTypeModel, jsonData: any[], zip: JSZip){
    const stimuliValues = structuredClone(evalData.values);
    const stimuliList = stimuliValues[12];

    for (const key in stimuliList) {
      const entry = stimuliList[key];
      const entryNameImageFile: string = entry.imageName;
      const entryNameSoundFile: string = entry.soundName;

      let entryImageFile: File | Blob | null = this.isValidFile(entry.imageFile) ? entry.imageFile : null;
      if (!entryImageFile && entryNameImageFile) {
        entryImageFile = await this.getFileFromIDB(entry.imageId || `${evalName}/${entryNameImageFile}`);
      }
      if (entryImageFile) {
        const arrayImageFileBuffer = await entryImageFile.arrayBuffer();
        zip.file(evalName + '/images/' + entryNameImageFile, arrayImageFileBuffer);
      }

      let entrySoundFile: File | Blob | null = this.isValidFile(entry.soundFile) ? entry.soundFile : null;
      if (!entrySoundFile && entryNameSoundFile) {
        entrySoundFile = await this.getFileFromIDB(entry.soundId || `${evalName}/${entryNameSoundFile}`);
      }
      if (entrySoundFile) {
        const arraySoundFileBuffer = await entrySoundFile.arrayBuffer();
        zip.file(evalName + '/audio/' + entryNameSoundFile, arraySoundFileBuffer);
      }

      delete entry.imageFile;
      delete entry.soundFile;
    }

    let audioFile: File | Blob | null = this.isValidFile(stimuliValues[11]) ? stimuliValues[11] : null;
    if (!audioFile && stimuliValues[10]) {
      const soundId = stimuliValues[13] || `${evalName}/${stimuliValues[10]}`;
      audioFile = await this.getFileFromIDB(soundId);
    }
    if (audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();
      zip.file(evalName + '/audio/' + stimuliValues[10], audioArrayBuffer);
    }
    stimuliValues.splice(11, 1);

    const stimuliResult = stimuliScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = stimuliValues[idx];
      return acc;
    }, {} as Record<string, any>);
    jsonData.push({
      Type: stimuliScreenConstModel,
      ...stimuliResult,
    });
  }

  /**
   * Génère un fichier ZIP à partir d'une évaluation sauvegardée.
   * @param saveData l'évaluation à convertir en fichier ZIP.
   */
  async generateSlotZip(saveData: saveModel): Promise<void> {
    try {
      const zip = new JSZip();
      const evalName = saveData.nomEval || 'GazePlayEvalDefaultName';
      const jsonData: any[] = [];

      for (const screen of saveData.listScreens) {
        switch (screen.type) {
          case transitionScreenConstModel:
            this.generateTransitionScreenZip(screen, jsonData);
            break;
          case instructionScreenConstModel:
            await this.generateInstructionScreenZipSlot(screen, jsonData, evalName, zip);
            break;
          case stimuliScreenConstModel:
            await this.generateStimuliScreenZipSlot(screen, jsonData, evalName, zip);
            break;
        }
      }

      zip.file(evalName + '/evalData.json', JSON.stringify(jsonData, null, 2));
      zip.file(evalName + '/evalInfo.json', JSON.stringify(this.getInfoEvalFromSlot(saveData), null, 2));

      const content = await zip.generateAsync({type: 'blob'});
      saveAs(content, evalName + '-gazeplayEval.gpSave');
    } catch (err) {
      console.error('[generateSlotZip] erreur:', err);
    }
  }

  /**
   * Créé l'objet JSON correspondant à `evalInfo.json` à partir d'une sauvegarde dans un slot.
   * @param saveData l'évaluation dont les données seront extraites.
   */
  getInfoEvalFromSlot(saveData: saveModel) {
    return {
      "Nom de l'évaluation": saveData.nomEval,
      "Format choisi": saveData.format,
      "Informations participant": saveData.infoParticipant
    };
  }

  /**
   * Génère les données JSON et les médias d'un écran instruction pour l'export en ZIP d'un slot.
   * Les fichiers sont récupérés depuis l'IDB si non présents en mémoire.
   */
  async generateInstructionScreenZipSlot(evalData: screenTypeModel, jsonData: any[], evalName: string, zip: JSZip): Promise<void> {
    const values = structuredClone(evalData.values);

    if (values[3] !== 'Texte' && values[4]) {
      const idbId = values[8] || `${evalName}/${values[4]}`;
      const file = await this.getFileFromIDB(idbId);
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const folder = values[3] === 'Image' ? 'images' : values[3] === 'Video' ? 'videos' : 'audio';
        zip.file(`${evalName}/${folder}/${values[4]}`, arrayBuffer);
      }
    }

    values.splice(5, 1);
    const result = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = values[idx];
      return acc;
    }, {} as Record<string, any>);
    jsonData.push({Type: instructionScreenConstModel, ...result});
  }

  /**
   * Génère les données JSON et les médias d'un écran de stimuli pour l'export en ZIP d'un slot.
   * Les fichiers sont récupérés depuis l'IDB si non présents en mémoire.
   */
  async generateStimuliScreenZipSlot(evalData: screenTypeModel, jsonData: any[], evalName: string, zip: JSZip): Promise<void> {
    const values = structuredClone(evalData.values);
    const stimuliList = values[12];

    for (const key in stimuliList) {
      const entry = stimuliList[key];

      if (entry.imageName) {
        const imageFile = await this.getFileFromIDB(entry.imageId || `${evalName}/${entry.imageName}`);
        if (imageFile) {
          const arrayBuffer = await imageFile.arrayBuffer();
          zip.file(`${evalName}/images/${entry.imageName}`, arrayBuffer);
        }
      }

      if (entry.soundName) {
        const soundFile = await this.getFileFromIDB(entry.soundId || `${evalName}/${entry.soundName}`);
        if (soundFile) {
          const arrayBuffer = await soundFile.arrayBuffer();
          zip.file(`${evalName}/audio/${entry.soundName}`, arrayBuffer);
        }
      }

      delete entry.imageFile;
      delete entry.soundFile;
    }

    if (values[10]) {
      const soundId = values[13] || `${evalName}/${values[10]}`;
      const soundFile = await this.getFileFromIDB(soundId);
      if (soundFile) {
        const arrayBuffer = await soundFile.arrayBuffer();
        zip.file(`${evalName}/audio/${values[10]}`, arrayBuffer);
      }
    }

    values.splice(11, 1);

    const result = stimuliScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = values[idx];
      return acc;
    }, {} as Record<string, any>);
    jsonData.push({Type: stimuliScreenConstModel, ...result});
  }
}
