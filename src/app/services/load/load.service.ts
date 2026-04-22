/*import { Injectable } from '@angular/core';
import {saveModel} from '../../shared/saveModel';
import {FormatTypeConfig, MaxSlots, SAVE_SLOT_LIST} from '../../shared/dataBaseConfig';
import JSZip from 'jszip';
import { IndexedDBService} from '../indexedDB/indexed-db.service';
import {SaveService} from '../save/save.service';*/
/*@Injectable({

  providedIn: 'root'
})
export class LoadService {

  getSlot(slotIndex: FormatTypeConfig): saveModel | null {
    const slotKey = SAVE_SLOT_LIST[slotIndex];
    const raw = localStorage.getItem(slotKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as saveModel;
    } catch (e) {
      console.error(`Erreur de lecture du slot ${slotKey}`, e);
      return null;
    }
  }

  getAllSlots() {
    let allSlots: [saveModel | null, saveModel | null, saveModel | null] = [null, null, null];
    for (let i = 0; i < MaxSlots; i++){
      const raw = localStorage.getItem(SAVE_SLOT_LIST[i])
      if (!raw) {
        allSlots[i] = null;
      }else {
        allSlots[i] = JSON.parse(raw) as saveModel;
      }
    }
    return allSlots;
  }
}*/


// src/app/services/load/load.service.ts


// src/app/services/load/load.service.ts
// src/app/services/load/load.service.ts
import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { IndexedDBService } from '../indexedDB/indexed-db.service';
import { SaveService } from '../save/save.service';
import {
  transitionScreenConstModel,
  instructionScreenConstModel,
  stimuliScreenConstModel,
  screenTypeModel
} from '../../shared/screenModel';

@Injectable({ providedIn: 'root' })
export class LoadService {

  constructor(
    private idbService: IndexedDBService,
    private saveService: SaveService
  ) {}

  async loadZip(zipFile: File): Promise<void> {

    // 1. Vider l'IDB
    await this.idbService.deleteAll();

    // 2. Lire le zip
    const zip = await JSZip.loadAsync(zipFile);

    let evalData: any[] = [];
    let evalInfo: any = {};
    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;

      // 3. Parser les JSON
      if (relativePath.endsWith('evalData.json')) {
        filePromises.push(
          zipEntry.async('string').then(content => {
            evalData = JSON.parse(content);
          })
        );
        return;
      }

      if (relativePath.endsWith('evalInfo.json')) {
        filePromises.push(
          zipEntry.async('string').then(content => {
            evalInfo = JSON.parse(content);
          })
        );
        return;
      }

      // 4. Stocker les fichiers dans IDB
      filePromises.push(
        zipEntry.async('blob').then(async blob => {
          const type = this.getFileType(relativePath);
          const mimeType = this.getMimeType(relativePath);
          const fileName = relativePath.split('/').pop() ?? relativePath;
          const file = new File([blob], fileName, { type: mimeType });

          try {
            await this.idbService.addFile(relativePath, file, type);
            console.log('Fichier ajouté en IDB :', relativePath);
          } catch {
            await this.idbService.updateFile(relativePath, file, type);
            console.log('Fichier mis à jour en IDB :', relativePath);
          }
        })
      );
    });

    await Promise.all(filePromises);

    // 5. Reconstruire les screens
    const listScreens = this.rebuildScreens(evalData);

    // 6. Lier les fichiers IDB aux cases
    await this.rebuildFilesFromIDB(listScreens, evalInfo["Nom de l'évaluation"]);

    // 7. Reconstruire dataAuto
    this.saveService.saveDataAuto(
      evalInfo["Nom de l'évaluation"],
      evalInfo["Format choisi"],
      evalInfo["Informations participant"],
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      listScreens
    );

    console.log('LoadService — dataAuto reconstruit :', this.saveService.dataAuto);
  }

  private rebuildScreens(evalData: any[]): screenTypeModel[] {
    return evalData.map((item, index) => {
      switch (item['Type']) {

        case transitionScreenConstModel:
          return {
            name: item['name'] ?? 'Ecran ' + (index + 1),
            type: transitionScreenConstModel,
            values: [
              item["Mettre un temps avant passage à l'écran suivant"],
              item["Combien de temps"],
              item["Mettre une croix de fixation"],
              item["Mettre un temps de fixation"],
              item["Combien de temps de fixation"]
            ]
          };

        case instructionScreenConstModel:
          return {
            name: item['name'] ?? 'Ecran ' + (index + 1),
            type: instructionScreenConstModel,
            values: [
              item["Mettre un temps avant passage à l'écran suivant"],
              item["Combien de temps"],
              item["Ajouter un media"],
              item["Type de media"],
              item["Nom du fichier"],
              undefined,
              item["Mettre un temps de fixation"],
              item["Combien de temps de fixation"]
            ]
          };

        case stimuliScreenConstModel:
          return {
            name: item['name'] ?? 'Ecran ' + (index + 1),
            type: stimuliScreenConstModel,
            values: [
              item["Nombre de lignes"],
              item["Nombre de colonnes"],
              item["Mettre un temps avant passage à l'écran suivant"],
              item["Combien de temps"],
              item["Combien de temps de fixation"],
              item["Choix de sélection"],
              item["Combien à sélectionner"],
              item["Position stimuli aléatoire"],
              item["Caché stimuli après selection"],
              item["Mettre un son"],
              item["Nom du fichier"],
              undefined,
              item["Liste des stimuli"]
            ]
          };

        default:
          throw new Error(`Type d'écran inconnu : ${item['Type']}`);
      }
    });
  }

  private async rebuildFilesFromIDB(listScreens: screenTypeModel[], evalName: string): Promise<void> {
    for (const screen of listScreens) {

      // Instruction — values[5] = File image/video/son
      if (screen.type === instructionScreenConstModel) {
        const fileName = screen.values[4];
        if (fileName && fileName !== '') {
          try {
            const evalFile = await this.idbService.getFile(evalName + '/images/' + fileName);
            screen.values[5] = evalFile.file;
          } catch {
            try {
              const evalFile = await this.idbService.getFile(evalName + '/audio/' + fileName);
              screen.values[5] = evalFile.file;
            } catch {
              try {
                const evalFile = await this.idbService.getFile(evalName + '/videos/' + fileName);
                screen.values[5] = evalFile.file;
              } catch {
                console.warn('Fichier introuvable en IDB :', fileName);
              }
            }
          }
        }
      }

      // Stimuli — values[11] = File son global, values[12] = liste des stimuli
      if (screen.type === stimuliScreenConstModel) {

        // Son global de l'écran stimuli
        const soundFileName = screen.values[10];
        if (soundFileName && soundFileName !== '') {
          try {
            const evalFile = await this.idbService.getFile(evalName + '/audio/' + soundFileName);
            screen.values[11] = evalFile.file;
          } catch {
            console.warn('Son stimuli introuvable en IDB :', soundFileName);
          }
        }

        // Images et sons de chaque case
        const stimuliList = screen.values[12];
        for (const key in stimuliList) {
          const cell = stimuliList[key];

          if (cell.imageName && cell.imageName !== '') {
            try {
              const evalFile = await this.idbService.getFile(evalName + '/images/' + cell.imageName);
              cell.imageFile = evalFile.file;
              console.log('Image liée à la case', key, ':', cell.imageName);
            } catch {
              console.warn('Image introuvable en IDB pour la case', key, ':', cell.imageName);
            }
          }

          if (cell.soundName && cell.soundName !== '') {
            try {
              const evalFile = await this.idbService.getFile(evalName + '/audio/' + cell.soundName);
              cell.soundFile = evalFile.file;
              console.log('Son lié à la case', key, ':', cell.soundName);
            } catch {
              console.warn('Son introuvable en IDB pour la case', key, ':', cell.soundName);
            }
          }
        }
      }
    }
  }

  private getFileType(path: string): 'image' | 'sound' | 'video' {
    if (path.includes('/images/')) return 'image';
    if (path.includes('/audio/'))  return 'sound';
    if (path.includes('/videos/')) return 'video';
    return 'image';
  }

  private getMimeType(path: string): string {
    if (path.includes('/images/')) return 'image/png';
    if (path.includes('/videos/')) return 'video/mp4';
    if (path.includes('/audio/'))  return 'audio/mpeg';
    return 'application/octet-stream';
  }
}
