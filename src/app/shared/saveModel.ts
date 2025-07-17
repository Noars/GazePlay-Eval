export type formatTypeModel = 'Csv' | 'Xsl' | 'Csv&Xlsx';

export interface saveModel {
  nomEval: string;
  format: formatTypeModel;
  infoParticipant: string[];
  globalParamsStimuli: string[];
  createdAt: string;
  version: number;
}

export const saveModelDefault: saveModel = {
  nomEval: '',
  format: 'Csv&Xlsx',
  infoParticipant: [],
  globalParamsStimuli: ['1', '1', 'false', '10', '1', '1', 'false', 'false'],
  createdAt: new Date().toISOString(),
  version: 1,
}
