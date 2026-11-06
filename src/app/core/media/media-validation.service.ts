import {inject, Injectable} from '@angular/core';
import {I18nService} from '../i18n/i18n.service';
import type {MediaType} from './media-library.service';
import {
  hasMp4Signature,
  hasSupportedImageSignature,
  isSupportedMediaName,
  MAX_WAV_BITS_PER_SAMPLE,
  mediaExtension,
  mediaFormatsLabel,
  wavBitsPerSample
} from './media-formats';

/** Octets lus au début d'un fichier : le bloc `fmt ` d'un WAV s'y trouve en pratique. */
const HEADER_SIZE = 64 * 1024;

/** Contrôle d'un fichier choisi par l'utilisateur, avant tout enregistrement. */
@Injectable({providedIn: 'root'})
export class MediaValidationService {
  private readonly i18n = inject(I18nService);

  /**
   * @returns le message à afficher si le fichier est refusé, `null` s'il est accepté.
   *
   * Vidéos et sons ne sont pas soumis à une lecture d'essai : le navigateur n'est pas un bon
   * juge, car Learning lit certaines vidéos qu'il ne lit pas. Seuls l'extension, la présence de
   * contenu et l'en-tête (MP4, WAV) sont contrôlés.
   */
  async rejectionMessage(file: File, type: MediaType): Promise<string | null> {
    const formats = mediaFormatsLabel(type);
    const name = file.name;
    if (!isSupportedMediaName(name, type)) {
      return this.i18n.t('media.rejected.format', {name, formats});
    }
    if (file.size === 0) {
      return this.i18n.t('media.rejected.empty', {name});
    }

    if (type === 'video' && !hasMp4Signature(await this.readHeader(file))) {
      return this.i18n.t('media.rejected.videoContent', {name, formats});
    }

    if (type === 'image') {
      const readable = hasSupportedImageSignature(await this.readHeader(file)) && await this.canDecodeImage(file);
      return readable ? null : this.i18n.t('media.rejected.imageContent', {name, formats});
    }

    if (type === 'sound' && mediaExtension(name) === 'wav') {
      const bits = wavBitsPerSample(await this.readHeader(file));
      if (bits !== null && bits > MAX_WAV_BITS_PER_SAMPLE) {
        return this.i18n.t('media.rejected.wavDepth', {name, bits});
      }
    }
    return null;
  }

  private async readHeader(file: File): Promise<Uint8Array> {
    return new Uint8Array(await file.slice(0, HEADER_SIZE).arrayBuffer());
  }

  private async canDecodeImage(file: File): Promise<boolean> {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return true;
    } catch {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
