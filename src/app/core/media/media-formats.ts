import {instructionScreenConstModel, screenTypeModel, stimuliScreenConstModel} from '../../shared/screenModel';
import type {MediaType} from './media-library.service';

/**
 * Formats de médias acceptés par le site : ceux que GazePlay-Learning lit réellement.
 *
 * Référence : `EvalReader.SUPPORTED_EXTENSIONS` (dépôt GazePlay) et les essais de lecture de
 * `GazePlayEval.md`. La liste est volontairement plus stricte que celle de Learning :
 *  - `m4a` et `aac` passent son import mais n'ont pas été lus lors de ses essais ;
 *  - `flv` et `fxm` passent son import mais ne sont pas prévisualisables dans un navigateur.
 */
export const SUPPORTED_MEDIA_EXTENSIONS: Readonly<Record<MediaType, readonly string[]>> = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'bmp'],
  sound: ['mp3', 'wav', 'aif', 'aiff'],
  video: ['mp4', 'm4v'],
};

/** Profondeur maximale d'un WAV : GazePlay-Learning ne lit pas le WAV 24 bits. */
export const MAX_WAV_BITS_PER_SAMPLE = 16;

/** Extension en minuscules d'un nom de fichier, sans le point (`''` si aucune). */
export function mediaExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}

export function isSupportedMediaName(fileName: string, type: MediaType): boolean {
  return SUPPORTED_MEDIA_EXTENSIONS[type].includes(mediaExtension(fileName));
}

/** Valeur de l'attribut `accept` d'un sélecteur de fichier. */
export function mediaAccept(type: MediaType): string {
  return SUPPORTED_MEDIA_EXTENSIONS[type].map(extension => `.${extension}`).join(',');
}

/** Formats acceptés, pour les messages (ex. `PNG, JPG, JPEG, GIF, BMP`). */
export function mediaFormatsLabel(type: MediaType): string {
  return SUPPORTED_MEDIA_EXTENSIONS[type].map(extension => extension.toUpperCase()).join(', ');
}

/**
 * Vrai si les premiers octets correspondent à une image lue par GazePlay-Learning (PNG, JPEG,
 * GIF ou BMP). Learning se fie au contenu : une image WebP renommée en `.png` s'afficherait dans
 * le navigateur mais pas dans Learning.
 */
export function hasSupportedImageSignature(bytes: Uint8Array): boolean {
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  return startsWith(0x89, 0x50, 0x4e, 0x47)
    || startsWith(0xff, 0xd8, 0xff)
    || startsWith(0x47, 0x49, 0x46, 0x38)
    || startsWith(0x42, 0x4d);
}

/** Vrai si les octets commencent par le bloc `ftyp` d'un conteneur MP4 (aussi utilisé par M4V). */
export function hasMp4Signature(bytes: Uint8Array): boolean {
  return String.fromCharCode(...bytes.subarray(4, 8)) === 'ftyp';
}

/**
 * Lit la profondeur (bits par échantillon) dans le bloc `fmt ` d'un WAV.
 * @returns la profondeur, ou `null` si l'en-tête ne permet pas de la lire.
 */
export function wavBitsPerSample(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const size = view.getUint32(offset + 4, true);
    if (tag(offset) === 'fmt ') {
      return offset + 8 + 16 <= bytes.length ? view.getUint16(offset + 8 + 14, true) : null;
    }
    // Les blocs RIFF de taille impaire sont suivis d'un octet de remplissage.
    offset += 8 + size + (size % 2);
  }
  return null;
}

/** Média d'une évaluation dans un format que GazePlay-Learning ne lit pas. */
export interface UnsupportedMedia {
  screenIndex: number;
  screenName: string;
  type: MediaType;
  fileName: string;
}

/**
 * Liste, d'après leur extension, les médias que GazePlay-Learning refuserait à l'import. Parcourt
 * les mêmes champs que lui : le média d'une instruction ou le son d'une grille désactivés sont
 * ignorés. Les emplacements vides sont ignorés aussi : ils ne contiennent aucun média.
 */
export function findUnsupportedMedia(screens: screenTypeModel[] | null | undefined): UnsupportedMedia[] {
  const found: UnsupportedMedia[] = [];
  (screens ?? []).forEach((screen, screenIndex) => {
    const values: any[] = Array.isArray(screen?.values) ? screen.values : [];
    const add = (fileName: unknown, type: MediaType) => {
      if (typeof fileName === 'string' && fileName && !isSupportedMediaName(fileName, type)) {
        found.push({screenIndex, screenName: screen.name, type, fileName});
      }
    };

    if (screen?.type === instructionScreenConstModel && values[2] && values[3] !== 'Texte') {
      add(values[4], values[3] === 'Video' ? 'video' : values[3] === 'Son' ? 'sound' : 'image');
    }
    if (screen?.type === stimuliScreenConstModel) {
      if (values[9]) add(values[10], 'sound');
      for (const cell of Object.values((values[12] ?? {}) as Record<string, any>)) {
        if (!cell || cell.hidden) continue;
        add(cell.imageName, 'image');
        add(cell.soundName, 'sound');
      }
    }
  });
  return found;
}
