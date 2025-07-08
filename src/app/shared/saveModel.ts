export type FormatTypeModel = 'Csv' | 'Xsl' | 'Csv&Xlsx';

export interface saveModel {
  nomEval: string;
  format: FormatTypeModel;
  createdAt: string;
  version: number;
}
