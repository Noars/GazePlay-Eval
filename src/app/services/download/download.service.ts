import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {SaveService} from '../save/save.service';
import {instructionScreenConstKey, transitionScreenConstKey} from '../../shared/screenModel';

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
        case "transition":
          const transitionValues = [...evalData[i].values];
          const transitionResult = transitionScreenConstKey.reduce((acc, key, idx) => {
            acc[key] = transitionValues[idx];
            return acc;
          }, {} as Record<string, any>);
          const transitionData = {
            Type: "Transition",
            ...transitionResult,
          }
          jsonData.push(transitionData);
          break;

        case "instruction":
          if (evalData[i].values[3] === "text") {
            const instructionTextValues = [...evalData[i].values];
            instructionTextValues[i].values.splice(5, 1);
            const instructionTxtResult = instructionScreenConstKey.reduce((acc, key, idx) => {
              acc[key] = instructionTextValues[idx];
              return acc;
            }, {} as Record<string, any>);
            const instructionTxtData = {
              Type: "Transition",
              ...instructionTxtResult,
            }
            jsonData.push(instructionTxtData);
          } else {
            let instructionValues = [...evalData[i].values];
            switch (instructionValues[i].values[3]) {
              case "image":
                const imgUrl = evalData[i].values[5];
                const imgResponse = await fetch(imgUrl);
                const imgBlob = await imgResponse.blob();
                zip.file('images/' + evalData[i].values[5], imgBlob);
                instructionValues[i].values.splice(5, 1);
                const instructionImgResult = instructionScreenConstKey.reduce((acc, key, idx) => {
                  acc[key] = instructionValues[idx];
                  return acc;
                }, {} as Record<string, any>);
                const instructionImgData = {
                  Type: "Transition",
                  ...instructionImgResult,
                }
                jsonData.push(instructionImgData);
                break;

              case "video":
                const videoUrl = evalData[i].values[5];
                const videoResponse = await fetch(videoUrl);
                const videoBlob = await videoResponse.blob();
                zip.file('videos/' + evalData[i].values[5], videoBlob);
                instructionValues[i].values.splice(5, 1);
                const instructionVideoResult = instructionScreenConstKey.reduce((acc, key, idx) => {
                  acc[key] = instructionValues[idx];
                  return acc;
                }, {} as Record<string, any>);
                const instructionVideoData = {
                  Type: "Transition",
                  ...instructionVideoResult,
                }
                jsonData.push(instructionVideoData);
                break;

              case "audio":
                const audioUrl = evalData[i].values[5];
                const audioResponse = await fetch(audioUrl);
                const audioBlob = await audioResponse.blob();
                zip.file('audio/' + evalData[i].values[5], audioBlob);
                instructionValues[i].values.splice(5, 1);
                const instructionAudioResult = instructionScreenConstKey.reduce((acc, key, idx) => {
                  acc[key] = instructionValues[idx];
                  return acc;
                }, {} as Record<string, any>);
                const instructionAudioData = {
                  Type: "Transition",
                  ...instructionAudioResult,
                }
                jsonData.push(instructionAudioData);
                break;

              default:
                break;
            }
          }
          break;

        case "stimuli":
          break;
      }
    }

    zip.file('evalData.json', JSON.stringify(jsonData, null, 2));

    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'gazeplayEval.zip');
    });
  }
}
