export type evalModeModel = 'manuel' | 'auto' | null;
export type screenTypeModel = transitionScreenModel | instructionScreenModel | stimuliScreenModel;

export type transitionScreenTypeModel = 'transition';
export type instructionScreenTypeModel = 'instruction';
export type stimuliScreenTypeModel = 'stimuli';

export const transitionScreenConstModel = 'transition';
export const instructionScreenConstModel = 'instruction';
export const stimuliScreenConstModel = 'stimuli';

export const transitionScreenConstValue = [false, 0, false, false, 0];
export const transitionScreenConstKey = [
  "Mettre un temps avant passage à l'écran suivant",
  "Combien de temps",
  "Mettre une croix de fixation",
  "Mettre un temps de fixation",
  "Combien de temps de fixation"];

export const instructionScreenConstValue = [false, 1, false, 'Image', '', '', false, 1];
export const instructionScreenConstKey = [
  "Mettre un temps avant passage à l'écran suivant",
  "Combien de temps",
  "Ajouter un media",
  "Type de media",
  "Nom du fichier",
  "Mettre un temps de fixation",
  "Combien de temps de fixation"
];

export interface stimuliScreenValues {
  imageName?: string;
  imageFile?: File;
  soundName?: string;
  soundFile?: File;
}
export const stimuliScreenDico: { [key: number]: stimuliScreenValues } = {};
export const stimuliScreenConstValue = [1, 1, false, 10, 1, 1, false, false, false, '', '', stimuliScreenDico];
export const stimuliScreenConstKey = [
  "Nombre de lignes",
  "Nombre de colonnes",
  "Mettre un temps avant passage à l'écran suivant",
  "Combien de temps",
  "Combien de temps de fixation",
  "Combien de stimuli à sélectionner",
  "Position stimuli aléatoire",
  "Caché stimuli après selection",
  "Mettre un son",
  "Nom du fichier",
  "Liste des stimuli"
];

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
  values: any[];
}

export const defaultStimuliScreenModel: stimuliScreenModel = {
  name: '',
  type: stimuliScreenConstModel,
  values: stimuliScreenConstValue,
}
