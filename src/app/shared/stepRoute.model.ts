/* constante qui permet de récupérer les différentes routes de création d'évaluation en fonction de leur position. */
export const STEP_TO_ROUTE: Record<number, string> = {
  0: '/info-eval',
  1: '/info-participant',
  2: '/setup-eval',
  3: '/create-eval',
  4: '/download-eval'
};

/* constante qui permet de récupérer les différentes positions de route de création d'évaluation en fonction de leur nom. */
export const ROUTE_TO_STEP: Record<string, number> = {
  'info-eval': 0,
  'info-participant': 1,
  'setup-eval': 2,
  'create-eval': 3,
  'download-eval': 4
};
