export type FormatTypeModel = 'Csv' | 'Xsl' | 'Csv&Xlsx';
export type evalModeModel = 'manuel' | 'auto' | null;

export interface saveModel {
  nomEval: string;
  format: FormatTypeModel;
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
