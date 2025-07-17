export type evalModeModel = 'manuel' | 'auto' | null;
export type screenTypeModel = 'black' | 'instruction' | 'end' | 'stimuli';

export interface ScreenModel {
  name: string;
  type: screenTypeModel;
}
