import { TestBed } from '@angular/core/testing';
import JSZip from 'jszip';
import { EvalValidationService } from './eval-validation.service';

describe('EvalValidationService', () => {
  let service: EvalValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalValidationService);
  });

  async function makeZip(files: Record<string, string | Blob>): Promise<File> {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) zip.file(path, content);
    const blob = await zip.generateAsync({ type: 'blob' });
    return new File([blob], 'eval.zip');
  }

  const fullInstruction = {
    Type: 'instruction',
    "Mettre un temps avant passage à l'écran suivant": true,
    "Combien de temps": 8,
    "Ajouter un media": true,
    "Type de media": 'Video',
    "Nom du fichier": 'clip.mp4',
    "Mettre un temps de fixation": false,
    "Combien de temps de fixation": 1
  };

  const fullStimuli = {
    Type: 'stimuli',
    "Nombre de lignes": 1,
    "Nombre de colonnes": 1,
    "Mettre un temps avant passage à l'écran suivant": false,
    "Combien de temps": 10,
    "Combien de temps de fixation": 2,
    "Choix de sélection": 'Tout',
    "Combien à sélectionner": 1,
    "Position stimuli aléatoire": false,
    "Caché stimuli après selection": false,
    "Mettre un son": false,
    "Nom du fichier": '',
    "Liste des stimuli": {
      '0': { imageName: 'img.png', soundName: 'ding.mp3', goodAnswer: true }
    }
  };

  it('devrait être créé', () => {
    expect(service).toBeTruthy();
  });

  it('archive complète → ok=true, aucun manque', async () => {
    const zip = await makeZip({
      'Eval/evalData.json': JSON.stringify([fullInstruction, fullStimuli]),
      'Eval/evalInfo.json': JSON.stringify({ "Nom de l'évaluation": 'Eval' }),
      'Eval/videos/clip.mp4': new Blob(['v']),
      'Eval/images/img.png': new Blob(['i']),
      'Eval/audio/ding.mp3': new Blob(['s'])
    });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(true);
    expect(report.screenCount).toBe(2);
    expect(report.missingFields).toStrictEqual([]);
    expect(report.missingMedia).toStrictEqual([]);
    expect(report.unusedMedia).toStrictEqual([]);
  });

  it('champ de fin d’écran manquant → signalé dans missingFields (le bug Delphine)', async () => {
    const truncatedTransition = {
      Type: 'transition',
      "Mettre un temps avant passage à l'écran suivant": true,
      "Combien de temps": 3,
      "Mettre une croix de fixation": false
      // manque "Mettre un temps de fixation" + "Combien de temps de fixation"
    };
    const zip = await makeZip({ 'E/evalData.json': JSON.stringify([truncatedTransition]) });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(false);
    const fields = report.missingFields.map(f => f.field);
    expect(fields).toContain('Mettre un temps de fixation');
    expect(fields).toContain('Combien de temps de fixation');
  });

  it('média référencé absent → signalé dans missingMedia', async () => {
    const zip = await makeZip({
      'E/evalData.json': JSON.stringify([{ ...fullInstruction, "Nom du fichier": 'manquant.mp4' }])
    });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(false);
    expect(report.missingMedia.length).toBe(1);
    expect(report.missingMedia[0]).toStrictEqual(
      expect.objectContaining({ type: 'video', fileName: 'manquant.mp4', screenIndex: 0 })
    );
  });

  it('image et son de stimulus manquants → deux médias signalés', async () => {
    const zip = await makeZip({
      'E/evalData.json': JSON.stringify([fullStimuli]) // aucun média fourni
    });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(false);
    expect(report.missingMedia.map(m => m.fileName).sort()).toStrictEqual(['ding.mp3', 'img.png']);
  });

  it('média présent mais non référencé → listé dans unusedMedia', async () => {
    const zip = await makeZip({
      'Eval/evalData.json': JSON.stringify([fullInstruction]),
      'Eval/videos/clip.mp4': new Blob(['v']),
      'Eval/images/orphelin.png': new Blob(['i'])
    });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(true);
    expect(report.unusedMedia).toStrictEqual(['Eval/images/orphelin.png']);
  });

  it('écran d’instruction Texte → aucun média requis', async () => {
    const textScreen = {
      Type: 'instruction',
      "Mettre un temps avant passage à l'écran suivant": true,
      "Combien de temps": 5,
      "Ajouter un media": false,
      "Type de media": 'Texte',
      "Nom du fichier": 'Bonjour',
      "Mettre un temps de fixation": false,
      "Combien de temps de fixation": 1
    };
    const zip = await makeZip({ 'E/evalData.json': JSON.stringify([textScreen]) });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(true);
    expect(report.referencedMedia).toStrictEqual([]);
  });

  it('archive illisible → erreur, ok=false', async () => {
    const report = await service.validateZip(new File([new Blob(['ceci n’est pas un zip'])], 'x.zip'));

    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('evalData.json absent → erreur', async () => {
    const zip = await makeZip({ 'E/evalInfo.json': JSON.stringify({}) });

    const report = await service.validateZip(zip);

    expect(report.ok).toBe(false);
    expect(report.errors.some(e => e.includes('evalData.json'))).toBe(true);
  });
});