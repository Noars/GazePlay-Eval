export type FormatType = 'Csv' | 'Xsl' | 'Csv&Xlsx';

export interface saveModel {
  nomEval: string;
  format: FormatType;
  createdAt: string;
  version: number;
}
