import { TestBed } from '@angular/core/testing';
import { DownloadService } from './download.service';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { SaveService } from '../save/save.service';

class MockSaveService {
  dataAuto = {
    listScreens: [
      { type: 'transition', values: ['t1', 't2'] },
      { type: 'instruction', values: ['i1', 'i2', 'i3', 'text'] },
      { type: 'instruction', values: ['i4', 'i5', 'i6', 'image', null, 'img.jpg'] },
      { type: 'instruction', values: ['i7', 'i8', 'i9', 'video', null, 'vid.mp4'] },
      { type: 'instruction', values: ['i10', 'i11', 'i12', 'audio', null, 'audio.mp3'] },
      { type: 'stimuli', values: ['s1', 's2'] }
    ]
  };
}

describe('DownloadService', () => {
  let service: DownloadService;
  let mockSaveService: MockSaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DownloadService,
        { provide: SaveService, useClass: MockSaveService }
      ]
    });

    service = TestBed.inject(DownloadService);
    mockSaveService = TestBed.inject(SaveService) as unknown as MockSaveService;

    spyOn(JSZip.prototype, 'file').and.callThrough();
    spyOn(JSZip.prototype, 'generateAsync').and.returnValue(Promise.resolve(new Blob(['zipcontent'])));

    spyOn<any>(window, 'fetch').and.returnValue(Promise.resolve({
      blob: () => Promise.resolve(new Blob(['fakefile']))
    }));

    spyOn(FileSaver, 'saveAs' as any).and.callFake(() => {});
  });

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('devrait générer un zip avec toutes les ressources et appeler saveAs', async () => {
    await service.generateEvalZip(mockSaveService as unknown as SaveService);

    // JSON evalData
    expect(JSZip.prototype.file).toHaveBeenCalledWith('evalData.json', jasmine.any(String));

    // Images, Videos et Audio
    expect(JSZip.prototype.file).toHaveBeenCalledWith(jasmine.stringMatching(/^images\//), jasmine.any(Blob));
    expect(JSZip.prototype.file).toHaveBeenCalledWith(jasmine.stringMatching(/^videos\//), jasmine.any(Blob));
    expect(JSZip.prototype.file).toHaveBeenCalledWith(jasmine.stringMatching(/^audio\//), jasmine.any(Blob));

    // Génération et Téléchargement
    expect(JSZip.prototype.generateAsync).toHaveBeenCalled();
    expect(FileSaver.saveAs).toHaveBeenCalledWith(jasmine.any(Blob), 'gazeplayEval.zip');
  });
});
