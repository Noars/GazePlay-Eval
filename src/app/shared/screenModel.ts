export type evalModeModel = 'manuel' | 'auto' | null;
export type screenTypeModel = transitionScreenModel | instructionScreenModel | stimuliScreenModel;

export type transitionScreenTypeModel = 'transition';
export type instructionScreenTypeModel = 'instruction';
export type stimuliScreenTypeModel = 'stimuli';

export const transitionScreenConstModel = 'transition';
export const instructionScreenConstModel = 'instruction';
export const stimuliScreenConstModel = 'stimuli';

export const transitionScreenConstValue = [false, '1', false, false, '1'];
export const instructionScreenConstValue = [false, '1', false, 'Image', '', false, '1'];

export interface transitionScreenModel {
  name: string;
  type: transitionScreenTypeModel;
  values: any[];
}

export const defaultTransitionScreenModel: transitionScreenModel = {
  name: '',
  type: transitionScreenConstModel,
  values: transitionScreenConstValue
}

export interface instructionScreenModel {
  name: string;
  type: instructionScreenTypeModel;
  values: any[];
}

export const defaultInstructionScreenModel: instructionScreenModel = {
  name: '',
  type: instructionScreenConstModel,
  values: instructionScreenConstValue,
}

export interface stimuliScreenModel {
  name: string;
  type: stimuliScreenTypeModel;
}

export const defaultStimuliScreenModel: stimuliScreenModel = {
  name: '',
  type: stimuliScreenConstModel,
}
