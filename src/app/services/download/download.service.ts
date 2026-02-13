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

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

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
                await this.generateInstructionScreenZipImg(saveService, instructionValues, jsonData, zip);
                break;

              case "Video":
                await this.generateInstructionScreenZipVideo(saveService, instructionValues, jsonData, zip);
                break;

              case "Son":
                await this.generateInstructionScreenZipSound(saveService, instructionValues, jsonData, zip);
                break;

              default:
                break;
            }
          }
          break;

        case stimuliScreenConstModel:
          await this.generateStimuliScreenZip(saveService, evalData[i], jsonData, zip);
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

  async generateInstructionScreenZipImg(saveService: SaveService, instructionValues: any[], jsonData: any[], zip: JSZip){
    const imgFile: File = instructionValues[5];
    if (imgFile) {
      const imgArrayBuffer = await imgFile.arrayBuffer();
      zip.file(saveService.getEvalName() + '/images/' + instructionValues[4], imgArrayBuffer);
    }
    instructionValues.splice(5, 1);
    const instructionImgResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    const instructionImgData = {
      Type: instructionScreenConstModel,
      ...instructionImgResult,
    }
    jsonData.push(instructionImgData);
  }

  async generateInstructionScreenZipVideo(saveService: SaveService, instructionValues: any[], jsonData: any[], zip: JSZip){
    const videoFile: File = instructionValues[5];
    if (videoFile) {
      const videoArrayBuffer = await videoFile.arrayBuffer();
      zip.file(saveService.getEvalName() + '/videos/' + instructionValues[4], videoArrayBuffer);
      instructionValues.splice(5, 1);
    }
    const instructionVideoResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    const instructionVideoData = {
      Type: instructionScreenConstModel,
      ...instructionVideoResult,
    }
    jsonData.push(instructionVideoData);
  }

  async generateInstructionScreenZipSound(saveService: SaveService, instructionValues: any[], jsonData: any[], zip: JSZip){
    const audioFile: File = instructionValues[5];
    if (audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();
      zip.file(saveService.getEvalName() + '/audio/' + instructionValues[4], audioArrayBuffer);
      instructionValues.splice(5, 1);
    }
    const instructionAudioResult = instructionScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = instructionValues[idx];
      return acc;
    }, {} as Record<string, any>);
    const instructionAudioData = {
      Type: instructionScreenConstModel,
      ...instructionAudioResult,
    }
    jsonData.push(instructionAudioData);
  }

  async generateStimuliScreenZip(saveService: SaveService, evalData: screenTypeModel, jsonData: any[], zip: JSZip){
    const stimuliValues = structuredClone(evalData.values);
    const stimuliList = stimuliValues[12];

    for (const key in stimuliList) {
      const entry = stimuliList[key];
      const entryNameImageFile: string = entry.imageName;
      const entryImageFile: File = entry.imageFile;
      const entryNameSoundFile: string = entry.soundName;
      const entrySoundFile: File = entry.soundFile;

      if (entryImageFile) {
        const arrayImageFileBuffer = await entryImageFile.arrayBuffer();
        zip.file(saveService.getEvalName() + '/images/' + entryNameImageFile, arrayImageFileBuffer);
      }
      if (entrySoundFile) {
        const arraySoundFileBuffer = await entrySoundFile.arrayBuffer();
        zip.file(saveService.getEvalName() + '/audio/' + entryNameSoundFile, arraySoundFileBuffer);
      }

      delete entry.imageFile;
      delete entry.soundFile;
    }

    const audioFile: File = stimuliValues[11];
    if (audioFile) {
      const audioArrayBuffer = await audioFile.arrayBuffer();
      zip.file(saveService.getEvalName() + '/audio/' + stimuliValues[10], audioArrayBuffer);
    }
    stimuliValues.splice(11, 1);

    const stimuliResult = stimuliScreenConstKey.reduce((acc, key, idx) => {
      acc[key] = stimuliValues[idx];
      return acc;
    }, {} as Record<string, any>);
    const stimuliData = {
      Type: stimuliScreenConstModel,
      ...stimuliResult,
    }
    jsonData.push(stimuliData);
  }
}
