import {screenTypeModel} from './screenModel';

export type formatTypeModel = 'Csv' | 'Xsl' | 'Csv&Xlsx';

export interface saveModel {
  nomEval: string;
  format: formatTypeModel;
  infoParticipant: string[];
  globalParamsTransitionScreen: any[]; // 0-Add time screen ?, 1-value, 2-Add fixation cross ?, 3-Add fixation time ?, 4-value
  globalParamsInstructionScreen: any[]; // 0-Add time screen ?, 1-value, 2-Add file ?, 3-Type file, 4-Add button start ?, 5-Value fixation length
  globalParamsStimuliScreen: any[]; // 0-Nb rows, 1-Nb cols, 2-Add max time screen, 3-Max time screen, 4-Fixation length, 5-Nb stimuli, 6-Disable stimuli, 7-Random position stimuli
  listScreens: screenTypeModel[];
  createdAt: string;
  version: number;
}

export const saveModelDefault: saveModel = {
  nomEval: '',
  format: 'Csv&Xlsx',
  infoParticipant: [],
  globalParamsTransitionScreen: [false, 0, false, false, 0],
  globalParamsInstructionScreen: [false, 1, false, 'Image', false, 1],
  globalParamsStimuliScreen: [1, 1, false, 10, 1, 1, false, false],
  listScreens: [],
  createdAt: new Date().toISOString(),
  version: 1,
}
