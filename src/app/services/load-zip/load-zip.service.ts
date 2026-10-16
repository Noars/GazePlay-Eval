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
import {saveModelDefault} from '../../shared/saveModel';

/** Archive qui ne contient pas d'évaluation lisible (rien n'est importé). */
export class InvalidEvaluationArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEvaluationArchiveError';
  }
}

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
   * L'archive est entièrement validée avant toute écriture : sans `evalData.json` lisible
   * (tableau d'écrans de types connus), l'import échoue sans rien modifier, au lieu de
   * produire une évaluation vide présentée comme importée.
   *
   * @param zipFile Fichier ZIP exporté par l'application
   * @throws InvalidEvaluationArchiveError si l'archive ne contient pas d'évaluation lisible
   */
  async loadZip(zipFile: File): Promise<void> {

    const zip = await JSZip.loadAsync(zipFile);

    let evalData: unknown = undefined;
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
              console.warn('evalData.json illisible :', relativePath, e);
              evalData = null;
            }
          })
        );
        return;
      }

      // Collecte des fichiers médias pour traitement après lecture du JSON
      mediaEntries.push({ path: relativePath, zipEntry });
    });

    await Promise.all(jsonPromises);

    if (!Array.isArray(evalData)) {
      throw new InvalidEvaluationArchiveError(evalData === undefined
        ? 'Archive sans evalData.json'
        : "evalData.json illisible (tableau d'écrans attendu)");
    }
    if (!evalInfo || typeof evalInfo !== 'object' || Array.isArray(evalInfo)) {
      evalInfo = {};
    }

    const evalName: string = evalInfo["Nom de l'évaluation"] ?? 'GazePlayEvalDefaultName';

    // Reconstruit (et valide) les écrans AVANT d'écrire le moindre média.
    const listScreens = this.rebuildScreens(evalData, evalName);

    // Stockage des médias dans l'IDB, puis report des identifiants qui ont dû changer.
    const renamedIds = await this.storeMediaInIDB(mediaEntries, evalName);
    this.applyRenamedIds(listScreens, renamedIds);

    const globalTransition  = this.parseGlobalTransitionParams(evalInfo['globalParamsTransitionScreen'])
                              ?? this.saveService.dataAuto.globalParamsTransitionScreen;
    const globalInstruction = this.parseGlobalInstructionParams(evalInfo['globalParamsInstructionScreen'])
                              ?? this.saveService.dataAuto.globalParamsInstructionScreen;
    const globalStimuli     = this.parseGlobalStimuliParams(evalInfo['globalParamsStimuliScreen'])
                              ?? this.saveService.dataAuto.globalParamsStimuliScreen;

    const step = this.saveService.dataAuto.step;

    // Champs absents d'un fichier incomplet : valeurs par défaut plutôt que `undefined`.
    this.saveService.saveDataAuto(
      evalName,
      evalInfo["Format choisi"] ?? saveModelDefault.format,
      Array.isArray(evalInfo["Informations participant"]) ? evalInfo["Informations participant"] : [],
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
   *
   * Si cette clé est déjà prise par un média **différent** (évaluation homonyme déjà
   * enregistrée, ou ancienne version de la même évaluation encore utilisée ailleurs), il
   * n'est jamais remplacé : le média importé reçoit une clé libre `{evalName}/{nom}-N.{ext}`
   * (même convention que `MediaLibraryService.storeAsNew`). Un média identique est réutilisé.
   *
   * @returns les clés qui diffèrent de `{evalName}/{fileName}`, indexées par cette clé.
   */
  private async storeMediaInIDB(
    mediaEntries: { path: string; zipEntry: JSZip.JSZipObject }[],
    evalName: string
  ): Promise<Map<string, string>> {
    const renamed = new Map<string, string>();
    for (const { path, zipEntry } of mediaEntries) {
      const fileName = path.split('/').pop();
      if (!fileName) continue;

      const type: 'image' | 'sound' | 'video' =
        path.includes('/images/') ? 'image' :
        path.includes('/audio/')  ? 'sound' : 'video';

      const blob = await zipEntry.async('blob');
      const idbId = `${evalName}/${fileName}`;
      const storedId = await this.storeWithoutOverwriting(idbId, blob, type);
      if (storedId !== idbId) renamed.set(idbId, storedId);
    }
    return renamed;
  }

  /** Enregistre un média sous `id`, ou sous la première variante libre (ou au contenu identique). */
  private async storeWithoutOverwriting(id: string, blob: Blob, type: 'image' | 'sound' | 'video'): Promise<string> {
    const slash = id.lastIndexOf('/');
    const prefix = id.slice(0, slash + 1);
    const name = id.slice(slash + 1);
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const extension = dot > 0 ? name.slice(dot) : '';

    for (let attempt = 0; attempt < 1000; attempt++) {
      const candidate = attempt === 0 ? id : `${prefix}${base}-${attempt}${extension}`;
      try {
        await this.idbService.addFile(candidate, blob, type);
        return candidate;
      } catch {
        // clé déjà prise : même contenu → réutilisé, sinon variante suivante
      }
      let existing: Blob | null;
      try {
        existing = (await this.idbService.getFile(candidate)).file;
      } catch {
        // ajout refusé alors que la clé semble libre : écriture directe, comme auparavant
        await this.idbService.updateFile(candidate, blob, type);
        return candidate;
      }
      if (await sameContent(existing, blob)) return candidate;
    }
    throw new Error(`Impossible d'enregistrer « ${name} » : trop de médias portent ce nom.`);
  }

  /** Remplace, dans les écrans importés, les clés IDB des médias enregistrés sous une autre clé. */
  private applyRenamedIds(screens: screenTypeModel[], renamed: Map<string, string>): void {
    if (renamed.size === 0) return;
    const remap = (id: unknown) => typeof id === 'string' ? renamed.get(id) ?? id : id;
    for (const screen of screens) {
      if (screen.type === instructionScreenConstModel) {
        screen.values[8] = remap(screen.values[8]);
      } else if (screen.type === stimuliScreenConstModel) {
        screen.values[13] = remap(screen.values[13]);
        for (const cell of Object.values(screen.values[12] ?? {}) as any[]) {
          if (!cell || typeof cell !== 'object') continue;
          cell.imageId = remap(cell.imageId);
          cell.soundId = remap(cell.soundId);
        }
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
            name: item['Name'] ?? 'Ecran ' + (index + 1),
            type: transitionScreenConstModel,
            // `?? défaut` : un champ absent/null d'un fichier déjà corrompu est réparé
            // ici plutôt que recopié en `undefined` (qui ressortirait en `null` à l'export).
            values: [
              item["Mettre un temps avant passage à l'écran suivant"] ?? false,
              item["Combien de temps"] ?? 0,
              item["Mettre une croix de fixation"] ?? false,
              item["Mettre un temps de fixation"] ?? false,
              item["Combien de temps de fixation"] ?? 0
            ]
          };

        case instructionScreenConstModel: {
          const fileName: string = item["Lien du fichier"] ?? item["Nom du fichier"] ?? '';
          // Pour une consigne « Texte », [4] contient le texte : aucun média à référencer.
          const idbId = fileName && item["Type de media"] !== 'Texte' ? `${evalName}/${fileName}` : '';
          return {
            name: item['Name'] ?? 'Ecran ' + (index + 1),
            type: instructionScreenConstModel,
            values: [
              item["Mettre un temps avant passage à l'écran suivant"] ?? false,  // [0]
              item["Combien de temps"] ?? 1,                            // [1]
              item["Ajouter un media"] ?? false,                        // [2]
              item["Type de media"] ?? 'Image',                         // [3]
              fileName,                                                 // [4] nom du fichier
              undefined,                                                // [5] File (non sérialisable)
              (item["Ajouter un bouton pour lancer evaluation"] ?? item["Mettre un temps de fixation"]) ?? false, // [6]
              item["Combien de temps de fixation"] ?? 1,                // [7]
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
            if (!cell || typeof cell !== 'object') continue;
            if (cell.imageName) cell.imageId = `${evalName}/${cell.imageName}`;
            if (cell.soundName) cell.soundId  = `${evalName}/${cell.soundName}`;
          }

          return {
            name: item['Name'] ?? 'Ecran ' + (index + 1),
            type: stimuliScreenConstModel,
            values: [
              item["Nombre de lignes"] ?? 1,                             // [0]
              item["Nombre de colonnes"] ?? 1,                           // [1]
              item["Mettre un temps avant passage à l'écran suivant"] ?? false, // [2]
              item["Combien de temps"] ?? 10,                            // [3]
              item["Combien de temps de fixation"] ?? 1,                 // [4]
              item["Choix de sélection"] ?? 'Tout',                      // [5]
              item["Combien à sélectionner"] ?? 1,                       // [6]
              item["Position stimuli aléatoire"] ?? false,               // [7]
              item["Caché stimuli après selection"] ?? false,            // [8]
              item["Mettre un son"] ?? false,                            // [9]
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

/** Vrai si les deux fichiers ont exactement le même contenu. */
async function sameContent(a: Blob | null | undefined, b: Blob): Promise<boolean> {
  if (!(a instanceof Blob) || a.size !== b.size) return false;
  const [left, right] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== y[i]) return false;
  }
  return true;
}
