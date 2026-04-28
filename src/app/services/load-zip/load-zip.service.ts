import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { SaveService } from '../save/save.service';
import {
  transitionScreenConstModel,
  instructionScreenConstModel,
  stimuliScreenConstModel,
  screenTypeModel
} from '../../shared/screenModel';
import {FormatTypeConfig} from '../../shared/dataBaseConfig';
import {IndexedDBService} from '../indexedDB/indexed-db.service';

@Injectable({ providedIn: 'root' })
export class LoadZipService {

  constructor(
    private saveService: SaveService,
    private idbService: IndexedDBService
  ) {}

  /**
   * Importe un fichier ZIP d'évaluation en mémoire de travail (slot 0).
   * Reconstruit les écrans depuis evalData.json, les métadonnées depuis evalInfo.json,
   * et stocke tous les fichiers médias (images, audio, vidéos) dans l'IDB.
   *
   * @param zipFile Fichier ZIP exporté par l'application
   */
  async loadZip(zipFile: File): Promise<void> {

    const zip = await JSZip.loadAsync(zipFile);

    let evalData: any[] = [];
    let evalInfo: any = {};
    const mediaEntries: { path: string; zipEntry: JSZip.JSZipObject }[] = [];
    const jsonPromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      if (relativePath.startsWith('__MACOSX/') || relativePath.split('/').pop()?.startsWith('._')) return;

      if (relativePath.endsWith('evalInfo.json')) {
        jsonPromises.push(
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
        jsonPromises.push(
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

      // Collecte des fichiers médias pour traitement après lecture du JSON
      mediaEntries.push({ path: relativePath, zipEntry });
    });

    await Promise.all(jsonPromises);

    const evalName: string = evalInfo["Nom de l'évaluation"] ?? 'GazePlayEvalDefaultName';

    // Stockage des médias dans l'IDB
    await this.storeMediaInIDB(mediaEntries, evalName);

    const listScreens = this.rebuildScreens(evalData, evalName);

    const globalTransition  = this.parseGlobalTransitionParams(evalInfo['globalParamsTransitionScreen'])
                              ?? this.saveService.dataAuto.globalParamsTransitionScreen;
    const globalInstruction = this.parseGlobalInstructionParams(evalInfo['globalParamsInstructionScreen'])
                              ?? this.saveService.dataAuto.globalParamsInstructionScreen;
    const globalStimuli     = this.parseGlobalStimuliParams(evalInfo['globalParamsStimuliScreen'])
                              ?? this.saveService.dataAuto.globalParamsStimuliScreen;

    const step = this.saveService.dataAuto.step;

    this.saveService.saveDataAuto(
      evalName,
      evalInfo["Format choisi"],
      evalInfo["Informations participant"],
      globalTransition,
      globalInstruction,
      globalStimuli,
      listScreens,
      step
    );
  }

  /**
   * Extrait les fichiers médias du ZIP et les stocke dans l'IDB.
   * La clé IDB est `{evalName}/{fileName}`.
   * Le type est déduit du dossier : images/ → image, audio/ → sound, videos/ → video.
   */
  private async storeMediaInIDB(
    mediaEntries: { path: string; zipEntry: JSZip.JSZipObject }[],
    evalName: string
  ): Promise<void> {
    for (const { path, zipEntry } of mediaEntries) {
      const fileName = path.split('/').pop();
      if (!fileName) continue;

      const type: 'image' | 'sound' | 'video' =
        path.includes('/images/') ? 'image' :
        path.includes('/audio/')  ? 'sound' : 'video';

      const blob = await zipEntry.async('blob');
      const idbId = `${evalName}/${fileName}`;

      try {
        await this.idbService.addFile(idbId, blob, type);
      } catch {
        await this.idbService.updateFile(idbId, blob, type);
      }
    }
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

  /**
   * Reconstruit la liste des écrans depuis evalData.json.
   * Les clés IDB (`values[8]`, `values[13]`, `imageId`, `soundId`) sont injectées
   * pour permettre aux composants et au service de téléchargement de retrouver les médias.
   */
  private rebuildScreens(evalData: any[], evalName: string): screenTypeModel[] {
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

        case instructionScreenConstModel: {
          const fileName: string = item["Lien du fichier"] ?? item["Nom du fichier"] ?? '';
          const idbId = fileName ? `${evalName}/${fileName}` : '';
          return {
            name: item['name'] ?? 'Ecran ' + (index + 1),
            type: instructionScreenConstModel,
            values: [
              item["Mettre un temps avant passage à l'écran suivant"], // [0]
              item["Combien de temps"],                                 // [1]
              item["Ajouter un media"],                                 // [2]
              item["Type de media"],                                    // [3]
              fileName,                                                 // [4] nom du fichier
              undefined,                                                // [5] File (non sérialisable)
              item["Ajouter un bouton pour lancer evaluation"] ?? item["Mettre un temps de fixation"], // [6]
              item["Combien de temps de fixation"],                     // [7]
              idbId                                                     // [8] clé IDB
            ]
          };
        }

        case stimuliScreenConstModel: {
          const soundName: string = item["Type du fichier"] ?? item["Nom du fichier"] ?? '';
          const soundIdbId = soundName ? `${evalName}/${soundName}` : '';

          const stimuliList = item["Liste des stimuli"] ?? {};
          for (const key in stimuliList) {
            const cell = stimuliList[key];
            if (cell.imageName) cell.imageId = `${evalName}/${cell.imageName}`;
            if (cell.soundName) cell.soundId  = `${evalName}/${cell.soundName}`;
          }

          return {
            name: item['name'] ?? 'Ecran ' + (index + 1),
            type: stimuliScreenConstModel,
            values: [
              item["Nombre de lignes"],                                  // [0]
              item["Nombre de colonnes"],                                // [1]
              item["Mettre un temps avant passage à l'écran suivant"],  // [2]
              item["Combien de temps"],                                  // [3]
              item["Combien de temps de fixation"],                      // [4]
              item["Choix de sélection"],                                // [5]
              item["Combien à sélectionner"],                            // [6]
              item["Position stimuli aléatoire"],                        // [7]
              item["Caché stimuli après selection"],                     // [8]
              item["Mettre un son"],                                     // [9]
              soundName,                                                 // [10] nom du son global
              undefined,                                                 // [11] File (non sérialisable)
              stimuliList,                                               // [12] dico des stimuli
              soundIdbId                                                 // [13] clé IDB son global
            ]
          };
        }

        default:
          throw new Error(`Type d'écran inconnu : ${item['Type']}`);
      }
    });
  }

  /**
   * Importe un ZIP et sauvegarde le résultat dans un slot nommé (1, 2 ou 3)
   * en plus du slot de travail (slot 0) mis à jour par loadZip.
   *
   * @param zipFile   Fichier ZIP à importer
   * @param slotIndex Index du slot de destination (1, 2 ou 3)
   */
  async loadZipToSlot(zipFile: File, slotIndex: FormatTypeConfig): Promise<void> {
    await this.loadZip(zipFile);
    this.saveService.saveToSlot(slotIndex, this.saveService.dataAuto);
  }
}
