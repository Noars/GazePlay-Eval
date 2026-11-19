/* constante qui permet de récupérer les différentes routes de création d'évaluation en fonction de leur position. */
export const STEP_TO_ROUTE: Record<number, string> = {
  0: '/info-eval',
  1: '/info-participant',
  2: '/setup-eval',
  3: '/create-eval',
  4: '/download-eval'
};

/* libellés (clés de traduction) des étapes du parcours, dans l'ordre. */
export const STEP_LABEL_KEYS = ['steps.0', 'steps.1', 'steps.2', 'steps.3', 'steps.4'] as const;

/* constante qui permet de récupérer les différentes positions de route de création d'évaluation en fonction de leur nom. */
export const ROUTE_TO_STEP: Record<string, number> = {
  'info-eval': 0,
  'info-participant': 1,
  'setup-eval': 2,
  'create-eval': 3,
  'download-eval': 4,

  // sous-pages de 'create-eval', qui renvoient donc vers celle-ci
  'stimuli': 3,
  'instruction': 3,
  'backToScreenList': 3,
};
