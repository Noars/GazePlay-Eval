import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import {
  transitionScreenConstModel,
  instructionScreenConstModel,
  stimuliScreenConstModel,
  transitionScreenConstKey,
  instructionScreenConstKey,
  stimuliScreenConstKey
} from '../../shared/screenModel';
import {isSupportedMediaName} from '../../core/media/media-formats';

export type MediaType = 'image' | 'sound' | 'video';

/** Un champ attendu manquant (ou indéfini) dans un écran de `evalData.json`. */
export interface MissingField {
  screenIndex: number;
  screenType: string;
  field: string;
}

/** Un média référencé par un écran mais absent de l'archive. */
export interface MissingMedia {
  screenIndex: number;
  type: MediaType;
  fileName: string;
}

/** Rapport de validation d'une archive d'évaluation (.zip / .gpSave). */
export interface EvalZipReport {
  ok: boolean;
  screenCount: number;
  missingFields: MissingField[];
  missingMedia: MissingMedia[];
  /** Médias présents ou non, dans un format que GazePlay-Learning refuse. */
  unsupportedMedia: MissingMedia[];
  referencedMedia: { type: MediaType; fileName: string }[];
  unusedMedia: string[];
  errors: string[];
}

/**
 * Vérifie qu'une archive d'évaluation exportée est exploitable par GazePlay-Learning :
 *   1. chaque écran de `evalData.json` possède bien tous ses champs (aucun `undefined`
 *      supprimé par `JSON.stringify`) ;
 *   2. chaque média référencé (vidéo d'instruction, son global, image/son de stimulus)
 *      est effectivement présent dans l'archive (`images/`, `videos/`, `audio/`), et dans un
 *      format accepté.
 *
 * Aucune dépendance à l'IndexedDB ni au modèle interne : on lit uniquement l'archive,
 * exactement comme le ferait Learning.
 */
@Injectable({ providedIn: 'root' })
export class EvalValidationService {

  private readonly requiredKeys: Record<string, readonly string[]> = {
    [transitionScreenConstModel]: transitionScreenConstKey,
    [instructionScreenConstModel]: instructionScreenConstKey,
    [stimuliScreenConstModel]: stimuliScreenConstKey
  };

  /**
   * Valide une archive d'évaluation.
   * @param zipFile l'archive exportée (.zip ou .gpSave).
   * @returns un rapport détaillé ; `ok` est vrai si aucun champ ni média ne manque et si tous
   *          les médias sont dans un format accepté.
   */
  async validateZip(zipFile: File | Blob): Promise<EvalZipReport> {
    const report: EvalZipReport = {
      ok: false,
      screenCount: 0,
      missingFields: [],
      missingMedia: [],
      unsupportedMedia: [],
      referencedMedia: [],
      unusedMedia: [],
      errors: []
    };

    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(zipFile);
    } catch {
      report.errors.push('Archive illisible (ZIP/gpSave invalide).');
      return report;
    }

    const evalData = await this.readEvalData(zip, report);
    if (!evalData) return report;
    report.screenCount = evalData.length;

    const presentMedia = this.indexMedia(zip); // clé "type|nom" → chemin dans l'archive
    const usedKeys = new Set<string>();

    evalData.forEach((screen, index) => {
      this.checkFields(screen, index, report);

      for (const ref of this.collectMediaRefs(screen)) {
        report.referencedMedia.push(ref);
        if (!isSupportedMediaName(ref.fileName, ref.type)) {
          report.unsupportedMedia.push({ screenIndex: index, type: ref.type, fileName: ref.fileName });
        }
        const key = `${ref.type}|${ref.fileName}`;
        if (presentMedia.has(key)) {
          usedKeys.add(key);
        } else {
          report.missingMedia.push({ screenIndex: index, type: ref.type, fileName: ref.fileName });
        }
      }
    });

    for (const [key, path] of presentMedia) {
      if (!usedKeys.has(key)) report.unusedMedia.push(path);
    }

    report.ok = report.missingFields.length === 0 && report.missingMedia.length === 0 && report.unsupportedMedia.length === 0;
    return report;
  }

  private async readEvalData(zip: JSZip, report: EvalZipReport): Promise<any[] | null> {
    const entry = zip.file(/(^|\/)evalData\.json$/i)[0];
    if (!entry) {
      report.errors.push('evalData.json introuvable dans l’archive.');
      return null;
    }
    try {
      const parsed = JSON.parse(await entry.async('string'));
      if (!Array.isArray(parsed)) {
        report.errors.push('evalData.json n’est pas un tableau d’écrans.');
        return null;
      }
      return parsed;
    } catch {
      report.errors.push('evalData.json illisible (JSON invalide).');
      return null;
    }
  }

  /** Indexe les médias présents dans l'archive par "type|nomDeFichier". */
  private indexMedia(zip: JSZip): Map<string, string> {
    const media = new Map<string, string>();
    zip.forEach((path, entry) => {
      if (entry.dir) return;
      if (path.startsWith('__MACOSX/') || path.split('/').pop()?.startsWith('._')) return;
      if (/\.json$/i.test(path)) return;

      const type = this.folderType(path);
      if (!type) return;

      const name = path.split('/').pop();
      if (name) media.set(`${type}|${name}`, path);
    });
    return media;
  }

  private folderType(path: string): MediaType | null {
    if (path.includes('/images/')) return 'image';
    if (path.includes('/audio/')) return 'sound';
    if (path.includes('/videos/')) return 'video';
    return null;
  }

  private checkFields(screen: any, index: number, report: EvalZipReport): void {
    const keys = this.requiredKeys[screen?.Type];
    if (!keys) {
      report.errors.push(`Écran #${index} : type inconnu « ${screen?.Type} ».`);
      return;
    }
    for (const field of keys) {
      if (!(field in screen) || screen[field] === undefined) {
        report.missingFields.push({ screenIndex: index, screenType: screen.Type, field });
      }
    }
  }

  private collectMediaRefs(screen: any): { type: MediaType; fileName: string }[] {
    const refs: { type: MediaType; fileName: string }[] = [];

    if (screen?.Type === instructionScreenConstModel) {
      const mediaType = screen['Type de media'];
      const fileName = screen['Nom du fichier'];
      if (mediaType && mediaType !== 'Texte' && fileName) {
        refs.push({ type: this.instructionMediaType(mediaType), fileName });
      }
    }

    if (screen?.Type === stimuliScreenConstModel) {
      const globalSound = screen['Nom du fichier'];
      if (globalSound) refs.push({ type: 'sound', fileName: globalSound });

      const list = screen['Liste des stimuli'] ?? {};
      for (const key of Object.keys(list)) {
        const cell = list[key] ?? {};
        if (cell.imageName) refs.push({ type: 'image', fileName: cell.imageName });
        if (cell.soundName) refs.push({ type: 'sound', fileName: cell.soundName });
      }
    }

    return refs;
  }

  private instructionMediaType(mediaType: string): MediaType {
    if (mediaType === 'Image') return 'image';
    if (mediaType === 'Video') return 'video';
    return 'sound';
  }
}