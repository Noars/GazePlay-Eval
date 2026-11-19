import {instructionScreenConstModel, screenTypeModel, stimuliScreenConstModel} from '../../shared/screenModel';

/**
 * Inventaire des médias référencés par une évaluation.
 *
 * Une évaluation désigne ses médias par identifiant IndexedDB (`"<nomEval>/<fichier>"`)
 * et/ou par simple nom de fichier (anciennes sauvegardes, imports). Les composants
 * retrouvent un média par plusieurs candidats, dont un repli par nom de fichier seul :
 * l'inventaire conserve donc à la fois les identifiants et les noms de fichiers, afin
 * qu'un nettoyage ne supprime jamais un média qu'une résolution pourrait encore utiliser.
 */
export interface MediaReferences {
  /** Identifiants IndexedDB explicitement ou implicitement référencés. */
  ids: Set<string>;
  /** Noms de fichiers (sans préfixe de projet) référencés. */
  fileNames: Set<string>;
}

/** Évaluation minimale nécessaire à l'inventaire (sauvegarde ou évaluation de travail). */
export interface EvalLike {
  nomEval?: string;
  listScreens?: screenTypeModel[] | unknown;
}

export function emptyReferences(): MediaReferences {
  return {ids: new Set<string>(), fileNames: new Set<string>()};
}

/** Nom de fichier d'un identifiant `"projet/fichier"` (ou l'identifiant lui-même). */
export function fileNameFromId(id: unknown): string {
  if (id === null || id === undefined) return '';
  if (typeof File !== 'undefined' && id instanceof File) return id.name;
  const asString = String(id).trim();
  const parts = asString.split('/');
  return parts[parts.length - 1] || asString;
}

function addReference(refs: MediaReferences, evalName: string, id: unknown, name: unknown): void {
  const cleanId = typeof id === 'string' ? id.trim() : '';
  const cleanName = typeof name === 'string' ? name.trim() : '';

  if (cleanId) {
    refs.ids.add(cleanId);
    refs.fileNames.add(fileNameFromId(cleanId));
  }
  if (cleanName) {
    refs.fileNames.add(fileNameFromId(cleanName));
    if (evalName) {
      // Identifiant implicite utilisé par l'export/import quand l'id est absent.
      refs.ids.add(`${evalName}/${cleanName}`);
    }
  }
}

/**
 * Ajoute à `refs` tous les médias référencés par une évaluation.
 * Robuste aux sauvegardes partielles ou corrompues (champs absents ignorés).
 */
export function collectMediaReferences(evaluation: EvalLike | null | undefined, refs: MediaReferences = emptyReferences()): MediaReferences {
  if (!evaluation || !Array.isArray(evaluation.listScreens)) return refs;
  const evalName = typeof evaluation.nomEval === 'string' ? evaluation.nomEval : '';

  for (const screen of evaluation.listScreens as screenTypeModel[]) {
    const values = Array.isArray(screen?.values) ? screen.values : [];

    if (screen?.type === instructionScreenConstModel) {
      // [4] nom du fichier (ou texte), [8] identifiant IDB. Un texte ne référence aucun média.
      if (values[3] !== 'Texte') {
        addReference(refs, evalName, values[8], values[4]);
      }
    }

    if (screen?.type === stimuliScreenConstModel) {
      // [10] nom du son global, [13] son identifiant IDB, [12] dictionnaire des cases.
      addReference(refs, evalName, values[13], values[10]);
      const cells = values[12];
      if (cells && typeof cells === 'object') {
        for (const cell of Object.values(cells as Record<string, any>)) {
          if (!cell || typeof cell !== 'object') continue;
          addReference(refs, evalName, cell.imageId, cell.imageName);
          addReference(refs, evalName, cell.soundId, cell.soundName);
        }
      }
    }
  }
  return refs;
}

/** Vrai si un média (par son identifiant) est encore référencé. */
export function isReferenced(mediaId: string, refs: MediaReferences): boolean {
  return refs.ids.has(mediaId) || refs.fileNames.has(fileNameFromId(mediaId));
}
