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

@Injectable({ providedIn: 'root' })
export class LoadZipService {

  constructor(
    private saveService: SaveService
  ) {}

  /**
   * Importe un fichier ZIP d'évaluation en mémoire de travail (slot 0).
   * Reconstruit les écrans depuis evalData.json et les métadonnées depuis evalInfo.json.
   * Les fichiers médias (images, audio, vidéos) ne sont pas traités ici :
   * leur chargement sera géré par un service dédié ultérieurement.
   *
   * @param zipFile Fichier ZIP exporté par l'application
   */
  async loadZip(zipFile: File): Promise<void> {

    const zip = await JSZip.loadAsync(zipFile);

    let evalData: any[] = [];
    let evalInfo: any = {};
    const filePromises: Promise<void>[] = []; // on collecte les promesses pour les attendre toutes ensemble

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return; // on ne traite pas les dossiers, seulement les fichiers
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

      // Les fichiers médias sont ignorés pour l'instant
    });

    // On attend que l'extraction des fichiers JSON soit terminée avant de reconstruire les écrans
    await Promise.all(filePromises);

    const listScreens = this.rebuildScreens(evalData);

    // Les globalParams sont présents dans evalInfo si le ZIP a été exporté avec le nouveau format.
    // Si absent (ancien format), on conserve les valeurs actuellement en mémoire.
    const globalTransition  = this.parseGlobalTransitionParams(evalInfo['globalParamsTransitionScreen'])
                              ?? this.saveService.dataAuto.globalParamsTransitionScreen;
    const globalInstruction = this.parseGlobalInstructionParams(evalInfo['globalParamsInstructionScreen'])
                              ?? this.saveService.dataAuto.globalParamsInstructionScreen;
    const globalStimuli     = this.parseGlobalStimuliParams(evalInfo['globalParamsStimuliScreen'])
                              ?? this.saveService.dataAuto.globalParamsStimuliScreen;

    // Le ZIP ne stocke pas l'étape de navigation : on conserve l'étape courante
    // pour que tryResume() puisse rediriger vers la bonne page après l'import
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

  /**
   * Convertit l'objet globalParamsTransitionScreen du JSON en tableau ordonné
   * attendu par le reste de l'application.
   * Retourne null si l'objet est absent (ancien format de ZIP).
   */
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

  /**
   * Convertit l'objet globalParamsInstructionScreen du JSON en tableau ordonné.
   * Retourne null si l'objet est absent (ancien format de ZIP).
   */
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

  /**
   * Convertit l'objet globalParamsStimuliScreen du JSON en tableau ordonné.
   * Retourne null si l'objet est absent (ancien format de ZIP).
   */
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
   * Reconstruit la liste des écrans à partir des données JSON de evalData.json.
   * Les champs File (images, sons) restent à undefined : ils seront remplis
   * par le service de chargement des médias lorsqu'il sera intégré.
   *
   * @param evalData Tableau d'objets écrans tel que parsé depuis evalData.json
   * @returns Liste des écrans reconstituée au format interne de l'application
   */
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
              item["Mettre un temps avant passage à l'écran suivant"], // [0]
              item["Combien de temps"],                                 // [1]
              item["Ajouter un media"],                                 // [2]
              item["Type de media"],                                    // [3]
              item["Lien du fichier"] ?? item["Nom du fichier"],        // [4] nom du fichier média
              undefined,                                                // [5] File — à remplir par le service médias
              item["Ajouter un bouton pour lancer evaluation"] ?? item["Mettre un temps de fixation"], // [6]
              item["Combien de temps de fixation"]                      // [7]
            ]
          };

        case stimuliScreenConstModel:
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
              item["Type du fichier"] ?? item["Nom du fichier"],        // [10] nom du son global
              undefined,                                                 // [11] File son global — à remplir par le service médias
              item["Liste des stimuli"]                                  // [12] dico des stimuli individuels
            ]
          };

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
    await this.loadZip(zipFile); // peuple le slot 0
    this.saveService.saveToSlot(slotIndex, this.saveService.dataAuto); // copie vers le slot cible
  }
}
