import {screenTypeModel} from './screenModel';
/**
 * Format des résultats. L'interface écrit `'Csv&Xlsx'`, `'Csv'` ou `'Xlsx'` (valeurs exportées
 * telles quelles vers GazePlay-Learning). `'Xsl'` est conservé pour typer d'éventuelles
 * anciennes données : il n'est plus proposé.
 */
export type formatTypeModel = 'Csv' | 'Xlsx' | 'Csv&Xlsx' | 'Xsl';

export interface saveModel {
  nomEval: string;
  format: formatTypeModel;
  infoParticipant: string[];
  globalParamsTransitionScreen: any[]; // 0-Add time screen ?, 1-value, 2-Add fixation cross ?, 3-Add fixation time ?, 4-value
  globalParamsInstructionScreen: any[]; // 0-Add time screen ?, 1-value, 2-Add file ?, 3-Type file, 4-Add button start ?, 5-Value fixation length
  globalParamsStimuliScreen: any[]; // 0-Nb rows, 1-Nb cols, 2-Add max time screen, 3-Max time screen, 4-Fixation length, 5-Nb stimuli, 6-Random position stimuli, 7-Disable stimuli
  listScreens: screenTypeModel[];
  createdAt: string;
  step: number; // avancée dans l'évaluation
  version: number;
}

export const saveModelDefault: saveModel = {
  nomEval: '',
  format: 'Csv&Xlsx',
  infoParticipant: [],
  globalParamsTransitionScreen: [true, 10, false, false, 0],
  globalParamsInstructionScreen: [true, 10, false, 'Image', false, 1],
  globalParamsStimuliScreen: [1, 1, false, 10, 1, 1, false, false],
  listScreens: [],
  createdAt: new Date().toISOString(),
  step: 0, // initialement à 0
  version: 1,
}
