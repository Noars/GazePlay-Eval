import {Injectable} from '@angular/core';
import JSZip from 'jszip';
import {saveAs} from 'file-saver';
import {SaveService} from '../save/save.service';
import {
  instructionScreenConstKey,
  instructionScreenConstModel, stimuliScreenConstModel,
  transitionScreenConstKey, transitionScreenConstModel
} from '../../shared/screenModel';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  async generateEvalZip(saveService: SaveService) {
    const zip = new JSZip();

    const evalData = saveService.dataAuto.listScreens;
    console.log("Value = ");
    console.log(evalData);
    let jsonData: any[] = [];

    for (let i = 0; i < evalData.length; i++) {
      switch (evalData[i].type) {
        case transitionScreenConstModel:
          const transitionValues = [...evalData[i].values];
          const transitionResult = transitionScreenConstKey.reduce((acc, key, idx) => {
            acc[key] = transitionValues[idx];
            return acc;
          }, {} as Record<string, any>);
          const transitionData = {
            Type: transitionScreenConstModel,
            ...transitionResult,
          }
          jsonData.push(transitionData);
          break;

        case instructionScreenConstModel:
          if (evalData[i].values[3] === "Texte") {
            const instructionTextValues = [...evalData[i].values];
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
          } else {
            let instructionValues = [...evalData[i].values];
            switch (instructionValues[3]) {
              case "Image":
                const imgFile = instructionValues[5];
                if (imgFile !== ''){
                  const imgArrayBuffer = await imgFile.arrayBuffer();
                  zip.file('images/' + instructionValues[4], imgArrayBuffer);
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
                break;

              case "Video":
                const videoFile = instructionValues[5];
                const videoArrayBuffer = await videoFile.arrayBuffer();
                if (videoArrayBuffer !== ''){
                  zip.file('videos/' + instructionValues[4], videoArrayBuffer);
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
                break;

              case "Son":
                const audioFile = instructionValues[5];
                const audioArrayBuffer = await audioFile.arrayBuffer();
                if (audioArrayBuffer !== ''){
                  zip.file('audio/' + instructionValues[4], audioArrayBuffer);
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
                break;

              default:
                break;
            }
          }
          break;

        case stimuliScreenConstModel:
          break;
      }
    }

    zip.file('evalData.json', JSON.stringify(jsonData, null, 2));

    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'gazeplayEval.zip');
    });
  }
}
