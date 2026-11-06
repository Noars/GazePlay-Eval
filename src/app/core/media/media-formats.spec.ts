import {TestBed} from '@angular/core/testing';
import {
  findUnsupportedMedia,
  hasMp4Signature,
  hasSupportedImageSignature,
  isSupportedMediaName,
  mediaAccept,
  mediaFormatsLabel,
  wavBitsPerSample
} from './media-formats';
import {MediaValidationService} from './media-validation.service';

/** PNG valide de 1 × 1 pixel. */
const PNG_1PX = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
), c => c.charCodeAt(0));

/** Début d'un fichier MP4 : taille du bloc, puis `ftyp` et sa marque. */
const MP4_HEADER = new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode('ftypisom')]);

/** En-tête d'un WAV PCM, avec un bloc facultatif avant `fmt ` pour vérifier le parcours des blocs. */
function wavHeader(bits: number, extraChunkSize = 0): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(12 + (extraChunkSize ? 8 + extraChunkSize + (extraChunkSize % 2) : 0) + 24 + 8);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  write(0, 'RIFF');
  write(8, 'WAVE');
  let offset = 12;
  if (extraChunkSize) {
    write(offset, 'LIST');
    view.setUint32(offset + 4, extraChunkSize, true);
    offset += 8 + extraChunkSize + (extraChunkSize % 2);
  }
  write(offset, 'fmt ');
  view.setUint32(offset + 4, 16, true);
  view.setUint16(offset + 8, 1, true);
  view.setUint16(offset + 22, bits, true);
  return bytes;
}

describe('media-formats', () => {
  it('isSupportedMediaName — formats acceptés, sans tenir compte de la casse', () => {
    for (const name of ['a.png', 'a.JPG', 'a.jpeg', 'a.gif', 'a.bmp']) {
      expect(isSupportedMediaName(name, 'image')).toBe(true);
    }
    for (const name of ['a.mp3', 'a.WAV', 'a.aif', 'a.aiff']) {
      expect(isSupportedMediaName(name, 'sound')).toBe(true);
    }
    for (const name of ['a.mp4', 'a.M4V']) {
      expect(isSupportedMediaName(name, 'video')).toBe(true);
    }
  });

  it('isSupportedMediaName — formats refusés', () => {
    for (const name of ['butterfly mulberry.svg', 'a.webp', 'a.avif', 'a.heic', 'a.tiff', 'a', 'png']) {
      expect(isSupportedMediaName(name, 'image')).toBe(false);
    }
    for (const name of ['a.m4a', 'a.aac', 'a.ogg', 'a.flac', 'a.opus']) {
      expect(isSupportedMediaName(name, 'sound')).toBe(false);
    }
    for (const name of ['a.flv', 'a.fxm', 'a.webm', 'a.mov']) {
      expect(isSupportedMediaName(name, 'video')).toBe(false);
    }
  });

  it('mediaAccept et mediaFormatsLabel — dérivés de la même liste', () => {
    expect(mediaAccept('video')).toBe('.mp4,.m4v');
    expect(mediaFormatsLabel('video')).toBe('MP4, M4V');
  });

  it('hasSupportedImageSignature — reconnaît PNG, JPEG, GIF et BMP, pas WebP ni SVG', () => {
    expect(hasSupportedImageSignature(PNG_1PX)).toBe(true);
    expect(hasSupportedImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(hasSupportedImageSignature(new TextEncoder().encode('GIF89a'))).toBe(true);
    expect(hasSupportedImageSignature(new TextEncoder().encode('BM....'))).toBe(true);
    expect(hasSupportedImageSignature(new TextEncoder().encode('RIFF....WEBP'))).toBe(false);
    expect(hasSupportedImageSignature(new TextEncoder().encode('<svg></svg>'))).toBe(false);
    expect(hasSupportedImageSignature(new Uint8Array())).toBe(false);
  });

  it('hasMp4Signature — reconnaît le bloc ftyp, pas un autre contenu', () => {
    expect(hasMp4Signature(MP4_HEADER)).toBe(true);
    expect(hasMp4Signature(new TextEncoder().encode('du texte, pas une video'))).toBe(false);
    expect(hasMp4Signature(new Uint8Array())).toBe(false);
  });

  it('wavBitsPerSample — lit la profondeur, même après un autre bloc', () => {
    expect(wavBitsPerSample(wavHeader(16))).toBe(16);
    expect(wavBitsPerSample(wavHeader(24))).toBe(24);
    expect(wavBitsPerSample(wavHeader(24, 7))).toBe(24);
  });

  it('wavBitsPerSample — en-tête illisible → null', () => {
    expect(wavBitsPerSample(new Uint8Array(4))).toBeNull();
    expect(wavBitsPerSample(new TextEncoder().encode('RIFF....AVI ....'))).toBeNull();
    expect(wavBitsPerSample(wavHeader(24).subarray(0, 24))).toBeNull();
  });

  describe('findUnsupportedMedia', () => {
    const instruction = (values: any[]) => ({name: 'Consigne', type: 'instruction', values} as any);
    const stimuli = (cells: any, sound = '', soundOn = true) => {
      const values: any[] = [1, 1, false, 10, 1, 'Tout', 1, false, false, soundOn, sound, undefined, cells, ''];
      return {name: 'Grille', type: 'stimuli', values} as any;
    };

    it('signale chaque média incompatible avec son écran', () => {
      const found = findUnsupportedMedia([
        instruction([false, 1, true, 'Video', 'film.webm', undefined, false, 1, '']),
        stimuli({0: {imageName: 'a.svg', soundName: 'b.m4a'}, 1: {imageName: 'ok.png', soundName: 'ok.mp3'}}, 'c.ogg'),
      ]);
      expect(found).toStrictEqual([
        {screenIndex: 0, screenName: 'Consigne', type: 'video', fileName: 'film.webm'},
        {screenIndex: 1, screenName: 'Grille', type: 'sound', fileName: 'c.ogg'},
        {screenIndex: 1, screenName: 'Grille', type: 'image', fileName: 'a.svg'},
        {screenIndex: 1, screenName: 'Grille', type: 'sound', fileName: 'b.m4a'},
      ]);
    });

    it('ignore comme Learning les médias désactivés, le texte et les emplacements vides', () => {
      expect(findUnsupportedMedia([
        instruction([false, 1, false, 'Image', 'a.svg', undefined, false, 1, '']),
        instruction([false, 1, true, 'Texte', 'un.texte', undefined, false, 1, '']),
        stimuli({0: {imageName: 'a.svg', hidden: true}, 1: null}, 'c.ogg', false),
        {name: 'Pause', type: 'transition', values: []} as any,
      ])).toStrictEqual([]);
    });

    it('sauvegarde partielle ou absente → aucune erreur', () => {
      expect(findUnsupportedMedia(undefined)).toStrictEqual([]);
      expect(findUnsupportedMedia([{name: 'x', type: 'stimuli'} as any])).toStrictEqual([]);
    });
  });
});

describe('MediaValidationService', () => {
  let service: MediaValidationService;

  beforeEach(() => {
    service = TestBed.inject(MediaValidationService);
  });

  it('accepte une vraie image, sans dépendre du type déclaré (fichier sans type)', async () => {
    expect(await service.rejectionMessage(new File([PNG_1PX], 'ok.png', {type: 'image/png'}), 'image')).toBeNull();
    expect(await service.rejectionMessage(new File([PNG_1PX], 'ok.PNG'), 'image')).toBeNull();
  });

  it('refuse un SVG et nomme le fichier et les formats acceptés', async () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'butterfly mulberry.svg', {type: 'image/svg+xml'});
    const message = await service.rejectionMessage(svg, 'image');
    expect(message).toContain('butterfly mulberry.svg');
    expect(message).toContain('PNG, JPG, JPEG, GIF, BMP');
  });

  it('refuse un WebP renommé en .png', async () => {
    const renamed = new File([new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')], 'renomme.png');
    expect(await service.rejectionMessage(renamed, 'image')).toContain('renomme.png');
  });

  it('refuse une image endommagée dont le début est correct', async () => {
    const damaged = new File([PNG_1PX.subarray(0, 16)], 'abimee.png', {type: 'image/png'});
    expect(await service.rejectionMessage(damaged, 'image')).toContain('abimee.png');
  });

  it('refuse un WAV 24 bits, accepte un WAV 16 bits', async () => {
    expect(await service.rejectionMessage(new File([wavHeader(24)], 'fort.wav'), 'sound')).toContain('24');
    expect(await service.rejectionMessage(new File([wavHeader(16)], 'ok.wav'), 'sound')).toBeNull();
  });

  it('WAV dont l\'en-tête est illisible → accepté (seule la profondeur connue est refusée)', async () => {
    expect(await service.rejectionMessage(new File(['x'], 'inconnu.wav'), 'sound')).toBeNull();
  });

  it('sons → extension acceptée et fichier non vide', async () => {
    expect(await service.rejectionMessage(new File(['x'], 'son.mp3'), 'sound')).toBeNull();
    expect(await service.rejectionMessage(new File(['x'], 'son.m4a'), 'sound')).toContain('son.m4a');
  });

  it('vidéos → extension acceptée et contenu MP4', async () => {
    expect(await service.rejectionMessage(new File([MP4_HEADER], 'film.mp4'), 'video')).toBeNull();
    expect(await service.rejectionMessage(new File([MP4_HEADER], 'film.M4V'), 'video')).toBeNull();
    expect(await service.rejectionMessage(new File(['x'], 'film.webm'), 'video')).toContain('MP4, M4V');
    expect(await service.rejectionMessage(new File(['du texte'], 'renomme.mp4'), 'video')).toContain('n\'est pas une vidéo MP4');
  });

  it('fichier vide → refusé pour chaque type de média', async () => {
    for (const [name, type] of [['a.png', 'image'], ['a.mp3', 'sound'], ['a.wav', 'sound'], ['a.mp4', 'video']] as const) {
      expect(await service.rejectionMessage(new File([], name), type)).toContain('ce fichier est vide');
    }
  });
});
