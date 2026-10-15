import {saveModel, saveModelDefault} from './saveModel';

/** Champs comparés pour décider si deux sauvegardes contiennent la même évaluation. */
const CONTENT_KEYS = ['nomEval', 'format', 'infoParticipant', 'globalParamsTransitionScreen',
  'globalParamsInstructionScreen', 'globalParamsStimuliScreen', 'listScreens'] as const;

/** Évaluation enregistrée ou de travail : seuls les champs de contenu sont requis. */
export type EvaluationContent = Pick<saveModel, typeof CONTENT_KEYS[number]> & Partial<saveModel>;

/**
 * Vrai si les deux évaluations ont le même contenu (date de modification et étape ignorées).
 * La comparaison passe par la forme JSON enregistrée, clés triées : un `File` en mémoire
 * vaut `{}` comme dans localStorage.
 */
export function sameEvaluation(a: EvaluationContent, b: EvaluationContent): boolean {
  return CONTENT_KEYS.every(key => stableJson(a[key]) === stableJson(b[key]));
}

/**
 * Vrai si l'évaluation ne contient encore rien que l'utilisateur pourrait perdre : ni nom, ni
 * champ participant, ni écran, format et paramètres globaux par défaut (ou jamais renseignés).
 * Une évaluation sans nom mais avec du contenu n'est donc PAS vide.
 */
export function isEmptyEvaluation(evaluation: EvaluationContent): boolean {
  const unchanged = (value: unknown, initial: unknown) =>
    value === undefined || value === null || (Array.isArray(value) && value.length === 0) || stableJson(value) === stableJson(initial);
  return !(evaluation.nomEval ?? '').trim()
    && (evaluation.infoParticipant ?? []).length === 0
    && (evaluation.listScreens ?? []).length === 0
    && (evaluation.format ?? saveModelDefault.format) === saveModelDefault.format
    && unchanged(evaluation.globalParamsTransitionScreen, saveModelDefault.globalParamsTransitionScreen)
    && unchanged(evaluation.globalParamsInstructionScreen, saveModelDefault.globalParamsInstructionScreen)
    && unchanged(evaluation.globalParamsStimuliScreen, saveModelDefault.globalParamsStimuliScreen);
}

function stableJson(value: unknown): string {
  return JSON.stringify(normalize(JSON.parse(JSON.stringify(value ?? null))));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as object).sort()
      .map(key => [key, normalize((value as Record<string, unknown>)[key])]));
  }
  return value;
}
