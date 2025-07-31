export type evalModeModel = 'manuel' | 'auto' | null;
export type screenTypeModel = transitionScreenModel | instructionScreenModel | endScreenModel | stimuliScreenModel;

export type transitionScreenTypeModel = 'transition';
export type instructionScreenTypeModel = 'instruction';
export type endScreenTypeModel = 'end';
export type stimuliScreenTypeModel = 'stimuli';

export const transitionScreenConstModel = 'transition';
export const instructionScreenConstModel = 'instruction';
export const endScreenConstModel = 'end';
export const stimuliScreenConstModel = 'stimuli';

export interface transitionScreenModel {
  name: string;
  type: transitionScreenTypeModel;
}

export const defaultTransitionScreenModel: transitionScreenModel = {
  name: '',
  type: transitionScreenConstModel
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
