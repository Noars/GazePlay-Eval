export type evalModeModel = 'manuel' | 'auto' | null;
export type screenTypeModel = blackScreenModel | instructionScreenModel | endScreenModel | stimuliScreenModel;

export type blackScreenTypeModel = 'black';
export type instructionScreenTypeModel = 'instruction';
export type endScreenTypeModel = 'end';
export type stimuliScreenTypeModel = 'stimuli';

export const blackScreenConstModel = 'black';
export const instructionScreenConstModel = 'instruction';
export const endScreenConstModel = 'end';
export const stimuliScreenConstModel = 'stimuli';

export interface blackScreenModel {
  name: string;
  type: blackScreenTypeModel;
}

export const defaultBlackScreenModel: blackScreenModel = {
  name: '',
  type: blackScreenConstModel
}

export interface instructionScreenModel {
  name: string;
  type: instructionScreenTypeModel;
}

export const defaultInstructionScreenModel: instructionScreenModel = {
  name: '',
  type: instructionScreenConstModel
}

export interface endScreenModel {
  name: string;
  type: endScreenTypeModel;
}

export const defaultEndScreenModel: endScreenModel = {
  name: '',
  type: endScreenConstModel
}

export interface stimuliScreenModel {
  name: string;
  type: stimuliScreenTypeModel;
}

export const defaultStimuliScreenModel: stimuliScreenModel = {
  name: '',
  type: stimuliScreenConstModel,
}
