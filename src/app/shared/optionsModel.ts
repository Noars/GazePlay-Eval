/**
 * @deprecated Ancien modèle de la clé localStorage `options`, remplacé par
 * `core/preferences/user-preferences.model.ts`.
 */
export interface optionsModel {
  theme: string;
  flashDuration: number;
  fontSize: number;
}

export const optionsModelDefault: optionsModel = {
  theme: 'dark',
  flashDuration: 5,
  fontSize: 12,
}
