import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {ConfigStimuliComponent} from './config-stimuli.component';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {SaveService} from '../../services/save/save.service';
import {AutoSaveService} from '../../services/auto-save/auto-save.service';
import {FlashService} from '../../services/flash-message/flash.service';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {emptyReferences, MediaReferences} from '../../core/media/media-references';
import {stimuliScreenValues} from '../../shared/screenModel';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

function makeCell(overrides: Partial<stimuliScreenValues> = {}): stimuliScreenValues {
  return {
    imageName: '', imageFile: undefined, imageId: '',
    soundName: '', soundFile: undefined, soundId: '',
    goodAnswer: false,
    ...overrides
  };
}

describe('ConfigStimuliComponent', () => {
  let component: ConfigStimuliComponent;
  let fixture: ComponentFixture<ConfigStimuliComponent>;
  let dialogSpy: Mocked<MatDialog>;
  let idbServiceSpy: Mocked<IndexedDBService>;
  let saveServiceSpy: Mocked<SaveService>;
  let autoSaveSpy: Mocked<AutoSaveService>;
  let flashSpy: Mocked<FlashService>;
  let cleanupSpy: Mocked<MediaCleanupService>;
  let references: MediaReferences;

  beforeEach(async () => {
    dialogSpy = createSpyObj('MatDialog', ['open']);
    idbServiceSpy = createSpyObj('IndexedDBService', ['getFile', 'addFile', 'updateFile', 'deleteFile', 'getAllFiles', 'incrementRef', 'releaseFile']);
    saveServiceSpy = createSpyObj('SaveService', ['getEvalName']);
    autoSaveSpy = createSpyObj('AutoSaveService', ['autoSave']);
    flashSpy = createSpyObj('FlashService', ['show']);
    cleanupSpy = createSpyObj('MediaCleanupService', ['collectAllReferences']);
    references = emptyReferences();
    cleanupSpy.collectAllReferences.mockImplementation(() => references);

    idbServiceSpy.getFile.mockReturnValue(Promise.reject(new Error('not found')));
    idbServiceSpy.addFile.mockReturnValue(Promise.resolve());
    idbServiceSpy.updateFile.mockReturnValue(Promise.resolve());
    idbServiceSpy.deleteFile.mockReturnValue(Promise.resolve());
    idbServiceSpy.getAllFiles.mockReturnValue(Promise.resolve([]));
    idbServiceSpy.incrementRef.mockReturnValue(Promise.resolve());
    idbServiceSpy.releaseFile.mockReturnValue(Promise.resolve());
    saveServiceSpy.getEvalName.mockReturnValue('TestProject');
    dialogSpy.open.mockReturnValue({afterClosed: () => of(null)} as any);

    await TestBed.configureTestingModule({
      imports: [ConfigStimuliComponent],
      providers: [
        {provide: MatDialog, useValue: dialogSpy},
        {provide: IndexedDBService, useValue: idbServiceSpy},
        {provide: SaveService, useValue: saveServiceSpy},
        {provide: AutoSaveService, useValue: autoSaveSpy},
        {provide: FlashService, useValue: flashSpy},
        {provide: MediaCleanupService, useValue: cleanupSpy},
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigStimuliComponent);
    component = fixture.componentInstance;

    component.data = {cell: 0, screen: {0: makeCell()}, cols: 2};
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('affiche la position de la case et un titre focalisable', () => {
    const title: HTMLElement = fixture.nativeElement.querySelector('#configStimuliLabel');
    expect(title.textContent).toContain('Case 1');
    expect(title.textContent).toContain('ligne 1, colonne 1');
    expect(title.getAttribute('tabindex')).toBe('-1');
  });

  it("dans l'éditeur (mediaReleased écouté) → la libération est confiée au parent, rien n'est supprimé ici", async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', imageName: 'img.png', soundId: 'TestProject/snd.mp3', soundName: 'snd.mp3'});
    const released: {ref: string, type: string}[] = [];
    component.mediaReleased.subscribe(event => released.push(event));

    await component.deleteCell();

    expect(released).toStrictEqual([{ref: 'TestProject/img.png', type: 'image'}, {ref: 'TestProject/snd.mp3', type: 'sound'}]);
    expect(idbServiceSpy.releaseFile).not.toHaveBeenCalled();
    expect(idbServiceSpy.deleteFile).not.toHaveBeenCalled();
  });

  // ─── checkCell ────────────────────────────────────────────────────────────

  it('checkCell — imageFile déjà un Blob → aperçu sans appel IDB', async () => {
    component.data.screen[0].imageFile = new Blob(['img'], {type: 'image/png'}) as File;
    idbServiceSpy.getFile.mockClear();

    await component.checkCell();

    expect(idbServiceSpy.getFile).not.toHaveBeenCalled();
    expect(component.previewImage).toBe('blob:fake-url');
  });

  it('checkCell — imageId sans fichier en mémoire → résolu depuis l\'IDB', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', imageName: 'img.png'});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/img.png', file: new File(['img'], 'img.png', {type: 'image/png'}), type: 'image', lastEdit: new Date(), refCount: 1
    }));

    await component.checkCell();

    expect(component.data.screen[0].imageFile).toBeTruthy();
    expect(component.previewImage).toBe('blob:fake-url');
    expect(component.missingImage).toBe(false);
  });

  it('checkCell — son stocké sous forme de Blob → converti en File', async () => {
    component.data.screen[0] = makeCell({soundId: 'TestProject/snd.mp3', soundName: 'snd.mp3'});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/snd.mp3', file: new Blob(['snd'], {type: 'audio/mpeg'}), type: 'sound', lastEdit: new Date(), refCount: 1
    }));

    await component.checkCell();

    expect(component.data.screen[0].soundFile instanceof File).toBe(true);
    expect(component.previewSound).toBe('blob:fake-url');
  });

  it('checkCell — média introuvable → avertissement « introuvable »', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/missing.png', imageName: 'missing.png'});

    await component.checkCell();
    fixture.detectChanges();

    expect(component.previewImage).toBe('');
    expect(component.missingImage).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('missing.png');
  });

  it('checkCell — repli par nom de fichier quand l\'identifiant ne correspond pas', async () => {
    component.data.screen[0] = makeCell({imageId: 'AutreNom/img.png', imageName: 'img.png'});
    idbServiceSpy.getAllFiles.mockReturnValue(Promise.resolve([
      {id: 'Ancien/img.png', file: new File(['img'], 'img.png'), type: 'image' as const, lastEdit: new Date(), refCount: 1}
    ]));

    await component.checkCell();

    expect(component.data.screen[0].imageId).toBe('Ancien/img.png');
  });

  // ─── Réponse ──────────────────────────────────────────────────────────────

  it('setGoodAnswer → met à jour la case', () => {
    component.setGoodAnswer(true);
    expect(component.data.screen[0].goodAnswer).toBe(true);
  });

  // ─── Suppression ──────────────────────────────────────────────────────────

  it('deleteImage → vide la case et sauvegarde', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', imageName: 'img.png'});

    await component.deleteImage();

    expect(component.data.screen[0].imageId).toBe('');
    expect(component.data.screen[0].imageName).toBe('');
    expect(component.data.screen[0].imageFile).toBeUndefined();
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('stimuli');
  });

  it('deleteImage — média partagé (refCount 2) → une référence libérée, fichier conservé', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', imageName: 'img.png'});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/img.png', file: new File([''], 'img.png'), type: 'image', lastEdit: new Date(), refCount: 2
    }));

    await component.deleteImage();

    expect(idbServiceSpy.releaseFile).toHaveBeenCalledWith('TestProject/img.png');
    expect(idbServiceSpy.deleteFile).not.toHaveBeenCalled();
  });

  it('deleteImage — dernière référence et plus utilisé ailleurs → fichier supprimé', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', imageName: 'img.png'});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/img.png', file: new File([''], 'img.png'), type: 'image', lastEdit: new Date(), refCount: 1
    }));

    await component.deleteImage();

    expect(idbServiceSpy.deleteFile).toHaveBeenCalledWith('TestProject/img.png');
  });

  it('deleteImage — dernière référence mais encore utilisé par une sauvegarde → fichier conservé', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', imageName: 'img.png'});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/img.png', file: new File([''], 'img.png'), type: 'image', lastEdit: new Date(), refCount: 1
    }));
    references.ids.add('TestProject/img.png');

    await component.deleteImage();

    expect(idbServiceSpy.deleteFile).not.toHaveBeenCalled();
    expect(idbServiceSpy.releaseFile).not.toHaveBeenCalled();
  });

  it('deleteSound → vide le son et sauvegarde', async () => {
    component.data.screen[0] = makeCell({soundId: 'TestProject/snd.mp3', soundName: 'snd.mp3'});

    await component.deleteSound();

    expect(component.data.screen[0].soundId).toBe('');
    expect(component.data.screen[0].soundName).toBe('');
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('stimuli');
  });

  it('deleteImage — case sans média → aucune opération IDB', async () => {
    await component.deleteImage();
    expect(idbServiceSpy.releaseFile).not.toHaveBeenCalled();
    expect(idbServiceSpy.deleteFile).not.toHaveBeenCalled();
  });

  it('deleteCell → vide image, son et réponse, libère les deux médias', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/img.png', soundId: 'TestProject/snd.mp3', goodAnswer: true});
    idbServiceSpy.getFile.mockImplementation((id: string) => Promise.resolve({
      id, file: new File([''], 'f'), type: id.includes('mp3') ? 'sound' : 'image', lastEdit: new Date(), refCount: 2
    } as any));

    await component.deleteCell();

    const cell = component.data.screen[0];
    expect(cell.imageId).toBe('');
    expect(cell.soundId).toBe('');
    expect(cell.goodAnswer).toBe(false);
    expect(idbServiceSpy.releaseFile).toHaveBeenCalledWith('TestProject/img.png');
    expect(idbServiceSpy.releaseFile).toHaveBeenCalledWith('TestProject/snd.mp3');
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('stimuli');
  });

  // ─── Ajout / remplacement ─────────────────────────────────────────────────

  it('getImageFile — nouveau fichier → enregistré sous "<eval>/<nom>"', async () => {
    const file = new File(['img'], 'photo.png', {type: 'image/png'});

    await component.getImageFile(file);

    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('TestProject/photo.png', file, 'image');
    expect(component.data.screen[0].imageName).toBe('photo.png');
    expect(component.data.screen[0].imageId).toBe('TestProject/photo.png');
    expect(component.data.screen[0].imageFile).toBe(file);
  });

  it('getImageFile — accepte aussi un événement de champ fichier', async () => {
    const file = new File(['img'], 'photo.png', {type: 'image/png'});
    const input = {files: [file], value: 'C:\\fakepath\\photo.png'};

    await component.getImageFile({target: input} as unknown as Event);

    expect(component.data.screen[0].imageName).toBe('photo.png');
    expect(input.value).toBe('');
  });

  it('getImageFile — fichier déjà présent → une référence ajoutée', async () => {
    idbServiceSpy.addFile.mockReturnValue(Promise.reject(new Error('exists')));

    await component.getImageFile(new File(['img'], 'photo.png'));

    expect(idbServiceSpy.incrementRef).toHaveBeenCalledWith('TestProject/photo.png');
  });

  it('getImageFile — remplace une image → l\'ancienne est libérée', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/old.png', imageName: 'old.png'});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/old.png', file: new File([''], 'old.png'), type: 'image', lastEdit: new Date(), refCount: 2
    }));

    await component.getImageFile(new File(['img'], 'new.png'));

    expect(idbServiceSpy.releaseFile).toHaveBeenCalledWith('TestProject/old.png');
    expect(component.data.screen[0].imageId).toBe('TestProject/new.png');
  });

  it('getImageFile — même fichier choisi à nouveau → contenu remplacé, compteur inchangé', async () => {
    component.data.screen[0] = makeCell({imageId: 'TestProject/photo.png', imageName: 'photo.png'});
    const file = new File(['v2'], 'photo.png', {type: 'image/png'});

    await component.getImageFile(file);

    expect(idbServiceSpy.updateFile).toHaveBeenCalledWith('TestProject/photo.png', file, 'image');
    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
    expect(idbServiceSpy.incrementRef).not.toHaveBeenCalled();
    expect(idbServiceSpy.releaseFile).not.toHaveBeenCalled();
  });

  it('getImageFile — échec d\'enregistrement → message d\'erreur, case inchangée', async () => {
    idbServiceSpy.addFile.mockReturnValue(Promise.reject(new Error('quota')));
    idbServiceSpy.incrementRef.mockReturnValue(Promise.reject(new Error('introuvable')));

    await component.getImageFile(new File(['img'], 'photo.png'));

    expect(flashSpy.show).toHaveBeenCalledWith('error', expect.stringMatching('photo.png'));
    expect(component.data.screen[0].imageName).toBe('');
    expect(component.busy).toBeNull();
  });

  it('getSoundFile — nouveau son → enregistré et prévisualisé', async () => {
    const file = new File(['snd'], 'son.mp3', {type: 'audio/mpeg'});

    await component.getSoundFile(file);

    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('TestProject/son.mp3', file, 'sound');
    expect(component.data.screen[0].soundId).toBe('TestProject/son.mp3');
    expect(component.previewSound).toBe('blob:fake-url');
  });

  it('getSoundFile — aucun fichier → rien ne se passe', async () => {
    await component.getSoundFile({target: {files: [], value: ''}} as unknown as Event);
    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
  });

  // ─── Recadrage ────────────────────────────────────────────────────────────

  it('cropImage — résultat → enregistré comme nouveau fichier, ancienne référence libérée', async () => {
    const original = new File(['original'], 'chat.jpg', {type: 'image/jpeg'});
    component.data.screen[0] = makeCell({imageId: 'TestProject/chat.jpg', imageName: 'chat.jpg', imageFile: original});
    idbServiceSpy.getFile.mockReturnValue(Promise.resolve({
      id: 'TestProject/chat.jpg', file: original, type: 'image', lastEdit: new Date(), refCount: 2
    }));
    dialogSpy.open.mockReturnValue({afterClosed: () => of(new Blob(['cropped'], {type: 'image/png'}))} as any);

    await component.cropImage();

    const cell = component.data.screen[0];
    expect(cell.imageName).toBe('chat-recadree.png');
    expect(cell.imageId).toBe('TestProject/chat-recadree.png');
    expect(idbServiceSpy.addFile).toHaveBeenCalledWith('TestProject/chat-recadree.png', expect.any(File), 'image');
    expect(idbServiceSpy.releaseFile).toHaveBeenCalledWith('TestProject/chat.jpg');
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('stimuli');
  });

  it('cropImage — nom recadré déjà pris → suffixe numérique', async () => {
    component.data.screen[0] = makeCell({imageName: 'chat.jpg', imageFile: new File(['o'], 'chat.jpg')});
    idbServiceSpy.addFile.mockImplementation((id: string) => id === 'TestProject/chat-recadree.png'
      ? Promise.reject(new Error('exists')) : Promise.resolve());
    dialogSpy.open.mockReturnValue({afterClosed: () => of(new Blob(['c']))} as any);

    await component.cropImage();

    expect(component.data.screen[0].imageName).toBe('chat-recadree-1.png');
  });

  it('cropImage — fenêtre annulée → image inchangée', async () => {
    const original = new File(['original'], 'orig.png');
    component.data.screen[0] = makeCell({imageName: 'orig.png', imageFile: original});

    await component.cropImage();

    expect(component.data.screen[0].imageFile).toBe(original);
    expect(idbServiceSpy.addFile).not.toHaveBeenCalled();
  });

  // ─── Fermeture ────────────────────────────────────────────────────────────

  it('finish → sauvegarde puis émet closed', () => {
    const closed = vi.spyOn(component.closed, 'emit').mockImplementation(() => undefined);
    component.finish();
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('stimuli');
    expect(closed).toHaveBeenCalled();
  });

  it('saveProgress → autoSave(\'stimuli\')', () => {
    component.saveProgress();
    expect(autoSaveSpy.autoSave).toHaveBeenCalledWith('stimuli');
  });
});
