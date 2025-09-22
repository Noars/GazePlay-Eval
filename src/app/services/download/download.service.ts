import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {SaveService} from '../save/save.service';

@Injectable({
  providedIn: 'root'
})
export class DownloadService {

  async generateEvalZip(saveService: SaveService) {
    const zip = new JSZip();

    const evalData = saveService.dataAuto.listScreens;
    console.log(evalData);
    let jsonData: any[] = [];

    for (let i = 0; i < evalData.length; i++) {
      switch (evalData[i].type) {
        case "transition":
          jsonData.push(evalData[i].values);
          break;

        case "instruction":
          if (evalData[i].values[3] === "text") {
            jsonData.push(evalData[i].values);
          } else {
            let newEvalData = [...evalData[i].values];
            switch (newEvalData[i].values[3]) {
              case "image":
                const imgUrl = evalData[i].values[5];
                const imgResponse = await fetch(imgUrl);
                const imgBlob = await imgResponse.blob();
                zip.file('images/' + evalData[i].values[4], imgBlob);
                newEvalData[i].values.splice(5, 1);
                jsonData.push(newEvalData);
                break;

              case "video":
                const videoUrl = evalData[i].values[5];
                const videoResponse = await fetch(videoUrl);
                const videoBlob = await videoResponse.blob();
                zip.file('videos/' + evalData[i].values[4], videoBlob);
                newEvalData[i].values.splice(5, 1);
                jsonData.push(newEvalData);
                break;

              case "audio":
                const audioUrl = evalData[i].values[5];
                const audioResponse = await fetch(audioUrl);
                const audioBlob = await audioResponse.blob();
                zip.file('audio/' + evalData[i].values[4], audioBlob);
                newEvalData[i].values.splice(5, 1);
                jsonData.push(newEvalData);
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
