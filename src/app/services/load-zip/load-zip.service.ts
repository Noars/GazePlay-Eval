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
import {FormatTypeConfig} from '../../shared/dataBaseConfig';

@Injectable({ providedIn: 'root' })
export class LoadZipService {

  constructor(
    private idbService: IndexedDBService,
    private saveService: SaveService
  ) {}

  async loadZip(zipFile: File): Promise<void> {

    await this.idbService.deleteAll();

    const zip = await JSZip.loadAsync(zipFile);

    let evalData: any[] = [];
    let evalInfo: any = {};
    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      // Ignorer les métadonnées macOS (ex: __MACOSX/.../._evalInfo.json)
      if (relativePath.startsWith('__MACOSX/') || relativePath.split('/').pop()?.startsWith('._')) return;

      if (relativePath.endsWith('evalInfo.json')) {
        filePromises.push(
          zipEntry.async('string').then(content => {
            try {
              evalInfo = JSON.parse(content);
            } catch (e) {
              console.warn('evalInfo.json ignoré (contenu invalide) :', relativePath, e);
            }
          })
        );
        return;
      }

      if (relativePath.endsWith('evalData.json')) {
        filePromises.push(
          zipEntry.async('string').then(content => {
            try {
              evalData = JSON.parse(content);
            } catch (e) {
              console.warn('evalData.json ignoré (contenu invalide) :', relativePath, e);
            }
          })
        );
        return;
      }

      filePromises.push(
        zipEntry.async('blob').then(async blob => {
          const type = this.getFileType(relativePath);
          const mimeType = this.getMimeType(relativePath);
          const fileName = relativePath.split('/').pop() ?? relativePath;
          const file = new File([blob], fileName, { type: mimeType });

          try {
            await this.idbService.addFile(relativePath, file, type);
          } catch {
            await this.idbService.updateFile(relativePath, file, type);
          }
        })
      );
    });

    await Promise.all(filePromises);

    const listScreens = this.rebuildScreens(evalData);
    await this.rebuildFilesFromIDB(listScreens, evalInfo["Nom de l'évaluation"]);

    // GlobalParams : présents dans evalInfo si nouveau format, sinon on garde les valeurs actuelles
    const globalTransition  = this.parseGlobalTransitionParams(evalInfo['globalParamsTransitionScreen'])
                              ?? this.saveService.dataAuto.globalParamsTransitionScreen;
    const globalInstruction = this.parseGlobalInstructionParams(evalInfo['globalParamsInstructionScreen'])
                              ?? this.saveService.dataAuto.globalParamsInstructionScreen;
    const globalStimuli     = this.parseGlobalStimuliParams(evalInfo['globalParamsStimuliScreen'])
                              ?? this.saveService.dataAuto.globalParamsStimuliScreen;

    const step = this.saveService.dataAuto.step;



    this.saveService.saveDataAuto(
      evalInfo["Nom de l'évaluation"],
      evalInfo["Format choisi"],
      evalInfo["Informations participant"],
      globalTransition,
      globalInstruction,
      globalStimuli,
      listScreens,
      step
    );
  }

  // ─── GlobalParams parsers ───────────────────────────────────────────────────

  private parseGlobalTransitionParams(gp: any): any[] | null {
    if (!gp) return null;
    return [
      gp["Mettre un temps avant passage à l'écran suivant"],
      gp["Combien de temps"],
      gp["Mettre une croix de fixation"],
      gp["Mettre un temps de fixation"],
      gp["Combien de temps de fixation"]
    ];
  }

  private parseGlobalInstructionParams(gp: any): any[] | null {
    if (!gp) return null;
    return [
      gp["Mettre un temps avant passage à l'écran suivant"],
      gp["Combien de temps"],
      gp["Ajouter un media"],
      gp["Type de media"],
      gp["Ajouter un bouton pour lancer evaluation"],
      gp["Combien de temps de fixation"]
    ];
  }

  private parseGlobalStimuliParams(gp: any): any[] | null {
    if (!gp) return null;
    return [
      gp["Nombre de lignes"],
      gp["Nombre de colonnes"],
      gp["Mettre un temps avant passage à l'écran suivant"],
      gp["Combien de temps"],
      gp["Combien de temps de fixation"],
      gp["Choix de sélection"],
      gp["Combien à sélectionner"],
      gp["Position stimuli aléatoire"]
    ];
  }

  // ─── Screens rebuild ────────────────────────────────────────────────────────

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
              item["Lien du fichier"] ?? item["Nom du fichier"],
              undefined, // File — reconstruit par rebuildFilesFromIDB
              item["Ajouter un bouton pour lancer evaluation"] ?? item["Mettre un temps de fixation"],
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
              item["Type du fichier"] ?? item["Nom du fichier"],
              undefined, // File son global — reconstruit par rebuildFilesFromIDB
              item["Liste des stimuli"]
            ]
          };

        default:
          throw new Error(`Type d'écran inconnu : ${item['Type']}`);
      }
    });
  }

  // ─── IDB files rebuild ──────────────────────────────────────────────────────

  private async rebuildFilesFromIDB(listScreens: screenTypeModel[], evalName: string): Promise<void> {
    for (const screen of listScreens) {

      if (screen.type === instructionScreenConstModel) {
        const fileRef: string = screen.values[4];
        if (fileRef && fileRef !== '') {
          const fileName = this.extractFileName(fileRef);
          for (const folder of ['images', 'audio', 'videos']) {
            try {
              const evalFile = await this.idbService.getFile(`${evalName}/${folder}/${fileName}`);
              screen.values[5] = evalFile.file;
              break;
            } catch { /* essaie le dossier suivant */ }
          }
        }
      }

      if (screen.type === stimuliScreenConstModel) {
        const soundRef: string = screen.values[10];
        if (soundRef && soundRef !== '') {
          try {
            const evalFile = await this.idbService.getFile(`${evalName}/audio/${this.extractFileName(soundRef)}`);
            screen.values[11] = evalFile.file;
          } catch {
            console.warn('Son stimuli introuvable en IDB :', soundRef);
          }
        }

        const stimuliList = screen.values[12];
        for (const key in stimuliList) {
          const cell = stimuliList[key];

          // imageLink (nouveau) ou imageName (ancien)
          const imageRef: string = cell.imageLink ?? cell.imageName ?? '';
          if (imageRef !== '') {
            try {
              const evalFile = await this.idbService.getFile(`${evalName}/images/${this.extractFileName(imageRef)}`);
              cell.imageFile = evalFile.file;
            } catch {
              console.warn('Image introuvable en IDB pour la case', key, ':', imageRef);
            }
          }

          // soundLink (nouveau) ou soundName (ancien)
          const soundRef: string = cell.soundLink ?? cell.soundName ?? '';
          if (soundRef !== '') {
            try {
              const evalFile = await this.idbService.getFile(`${evalName}/audio/${this.extractFileName(soundRef)}`);
              cell.soundFile = evalFile.file;
            } catch {
              console.warn('Son introuvable en IDB pour la case', key, ':', soundRef);
            }
          }
        }
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private extractFileName(ref: string): string {
    return ref.includes('/') ? ref.split('/').pop()! : ref;
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

  async loadZipToSlot(zipFile: File, slotIndex: FormatTypeConfig): Promise<void> {
    await this.loadZip(zipFile);
    this.saveService.saveToSlot(slotIndex, this.saveService.dataAuto);
  }
}
