export type FormatTypeModel = 'Csv' | 'Xsl' | 'Csv&Xlsx';

export interface saveModel {
  nomEval: string;
  format: FormatTypeModel;
  infoPatient: string[];
  createdAt: string;
  version: number;
}

export const saveModelDefault: saveModel = {
  nomEval: '',
  format: 'Csv&Xlsx',
  infoPatient: [],
  createdAt: new Date().toISOString(),
  version: 1,
}
