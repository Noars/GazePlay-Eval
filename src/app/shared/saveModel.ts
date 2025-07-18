import {screenTypeModel} from './screenModel';

export type formatTypeModel = 'Csv' | 'Xsl' | 'Csv&Xlsx';

export interface saveModel {
  nomEval: string;
  format: formatTypeModel;
  infoParticipant: string[];
  globalParamsStimuli: string[];
  listScreens: screenTypeModel[];
  createdAt: string;
  version: number;
}

export const saveModelDefault: saveModel = {
  nomEval: '',
  format: 'Csv&Xlsx',
  infoParticipant: [],
  globalParamsStimuli: ['1', '1', 'false', '10', '1', '1', 'false', 'false'],
  listScreens: [],
  createdAt: new Date().toISOString(),
  version: 1,
}
