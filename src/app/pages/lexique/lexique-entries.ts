/**
 * Contenu du lexique : termes employés dans GazePlay-Eval et leur explication.
 *
 * Comme les pages du guide, ce contenu rédactionnel a une version par langue (le français
 * reste la référence) ; les textes de l'interface de la page passent, eux, par les
 * dictionnaires `fr.ts` / `en.ts`. Chaque entrée doit avoir ses deux versions
 * (vérifié par `lexique.component.spec.ts`). L'ordre du tableau est indifférent : la page
 * trie les termes par ordre alphabétique dans la langue affichée.
 */

/** Page du guide (route `/guide/<page>`) et section à afficher. */
export interface LexiqueGuideLink {
  page: '' | 'creation' | 'sauvegardes' | 'imports' | 'options' | 'depannage';
  section?: string;
}

export interface LexiqueText {
  term: string;
  definition: string;
}

export interface LexiqueEntry {
  /** Identifiant stable (ancre `#term-<id>`), indépendant de la langue. */
  id: string;
  fr: LexiqueText;
  en: LexiqueText;
  /** Identifiants d'autres termes du lexique (« Voir aussi »). */
  related?: string[];
  /** Section du guide qui détaille le sujet. */
  guide?: LexiqueGuideLink;
}

export const LEXIQUE_ENTRIES: readonly LexiqueEntry[] = [
  // ─── GazePlay et évaluation ─────────────────────────────────────────────
  {
    id: 'eye-tracking',
    fr: {
      term: 'Oculométrie (eye-tracking)',
      definition: 'Technique qui mesure l\'endroit où une personne pose son regard sur l\'écran, à l\'aide d\'un appareil appelé oculomètre (eye-tracker). GazePlay-Learning l\'utilise pour que le participant réponde avec les yeux : regarder un élément suffisamment longtemps revient à le sélectionner.',
    },
    en: {
      term: 'Eye tracking',
      definition: 'A technique that measures where a person is looking on the screen, using a device called an eye tracker. GazePlay-Learning uses it so that the participant can answer with their eyes: looking at an element for long enough selects it.',
    },
    related: ['fixation-duration', 'gazeplay-learning'],
  },
  {
    id: 'gazeplay-learning',
    fr: {
      term: 'GazePlay-Learning',
      definition: 'Logiciel de la suite GazePlay qui fait passer les évaluations créées ici. On y ouvre le fichier .zip exporté à l\'étape 5 : il affiche les écrans au participant et enregistre les résultats.',
    },
    en: {
      term: 'GazePlay-Learning',
      definition: 'The GazePlay software that runs the assessments created here. You open in it the .zip file exported at step 5: it shows the screens to the participant and records the results.',
    },
    related: ['zip', 'session'],
    guide: {page: 'imports', section: 'formats'},
  },
  {
    id: 'evaluation',
    fr: {
      term: 'Évaluation',
      definition: 'Suite d\'écrans (instructions, grilles de stimuli, transitions) qu\'un participant parcourt du regard dans GazePlay-Learning. Elle se crée en 5 étapes : informations, participant, mode et paramètres, création des écrans, téléchargement et export.',
    },
    en: {
      term: 'Assessment',
      definition: 'A series of screens (instructions, stimulus grids, transitions) that a participant goes through with their eyes in GazePlay-Learning. It is created in 5 steps: information, participant, mode and settings, screen creation, download and export.',
    },
    related: ['screen', 'current-evaluation'],
    guide: {page: 'creation'},
  },
  {
    id: 'current-evaluation',
    fr: {
      term: 'Évaluation en cours',
      definition: 'L\'évaluation sur laquelle vous travaillez dans cet onglet. Elle est enregistrée automatiquement et peut être reprise depuis l\'accueil (« Reprendre cette évaluation »). Si elle est liée à un emplacement, ses modifications y sont aussi reportées.',
    },
    en: {
      term: 'Assessment in progress',
      definition: 'The assessment you are working on in this tab. It is saved automatically and can be resumed from the home page (“Resume this assessment”). If it is linked to a slot, its changes are also copied there.',
    },
    related: ['auto-save', 'slot', 'tab'],
    guide: {page: 'sauvegardes', section: 'auto-save'},
  },
  {
    id: 'session',
    fr: {
      term: 'Passation',
      definition: 'Séance pendant laquelle un participant fait l\'évaluation dans GazePlay-Learning. Chaque passation produit des fichiers de résultats, au format choisi à l\'étape 1.',
    },
    en: {
      term: 'Session',
      definition: 'A sitting during which a participant takes the assessment in GazePlay-Learning. Each session produces results files, in the format chosen at step 1.',
    },
    related: ['participant', 'results-format'],
  },
  {
    id: 'participant',
    fr: {
      term: 'Participant',
      definition: 'La personne évaluée. Les informations la concernant (champs participant) sont saisies dans GazePlay-Learning au début de chaque passation.',
    },
    en: {
      term: 'Participant',
      definition: 'The person being assessed. Information about them (participant fields) is entered in GazePlay-Learning at the start of each session.',
    },
    related: ['participant-field', 'session'],
  },
  {
    id: 'participant-field',
    fr: {
      term: 'Champ participant',
      definition: 'Information à renseigner sur le participant au début de chaque passation, par exemple nom, prénom, âge ou classe. Vous choisissez les champs et leur ordre à l\'étape 2, qui est facultative. Ces données restent sur l\'ordinateur utilisé.',
    },
    en: {
      term: 'Participant field',
      definition: 'Information to fill in about the participant at the start of each session, for example last name, first name, age or class. You choose the fields and their order at step 2, which is optional. This data stays on the computer used.',
    },
    related: ['participant'],
    guide: {page: 'creation', section: 'info-participant'},
  },
  {
    id: 'results-format',
    fr: {
      term: 'Format des résultats',
      definition: 'Format des fichiers de résultats produits par GazePlay-Learning après chaque passation : CSV, XLSX ou les deux (recommandé). Il se choisit à l\'étape 1.',
    },
    en: {
      term: 'Results format',
      definition: 'The format of the results files produced by GazePlay-Learning after each session: CSV, XLSX or both (recommended). It is chosen at step 1.',
    },
    related: ['csv', 'xlsx'],
  },
  {
    id: 'csv',
    fr: {
      term: 'CSV',
      definition: '« Comma-Separated Values » : fichier texte où les valeurs sont séparées par un caractère (virgule ou point-virgule). Léger et universel, il s\'ouvre dans tous les tableurs et logiciels d\'analyse.',
    },
    en: {
      term: 'CSV',
      definition: '“Comma-Separated Values”: a text file in which values are separated by a character (comma or semicolon). Light and universal, it opens in every spreadsheet and analysis program.',
    },
    related: ['results-format', 'xlsx'],
  },
  {
    id: 'xlsx',
    fr: {
      term: 'XLSX',
      definition: 'Format de classeur de Microsoft Excel, lu aussi par LibreOffice Calc ou Google Sheets.',
    },
    en: {
      term: 'XLSX',
      definition: 'The Microsoft Excel workbook format, also read by LibreOffice Calc and Google Sheets.',
    },
    related: ['results-format', 'csv'],
  },

  // ─── Création ───────────────────────────────────────────────────────────
  {
    id: 'creation-mode',
    fr: {
      term: 'Mode manuel / mode automatique',
      definition: 'Les deux façons de construire les écrans, proposées à l\'étape 3. En mode manuel (recommandé), vous définissez des paramètres globaux puis créez chaque écran vous-même. Le mode automatique, qui générera les écrans, est en cours de développement et n\'est pas encore disponible.',
    },
    en: {
      term: 'Manual mode / automatic mode',
      definition: 'The two ways of building the screens, offered at step 3. In manual mode (recommended), you define global settings and then create each screen yourself. Automatic mode, which will generate the screens, is under development and not yet available.',
    },
    related: ['global-settings'],
    guide: {page: 'creation', section: 'setup-eval'},
  },
  {
    id: 'global-settings',
    fr: {
      term: 'Paramètres globaux',
      definition: 'Réglages par défaut définis à l\'étape 3 pour chaque type d\'écran (transition, instruction, stimuli). Ils pré-remplissent chaque nouvel écran ; les écrans déjà créés ne changent pas si vous les modifiez ensuite. Chaque écran peut être ajusté individuellement à l\'étape 4.',
    },
    en: {
      term: 'Global settings',
      definition: 'Default settings defined at step 3 for each screen type (transition, instruction, stimulus). They pre-fill every new screen; screens already created do not change if you modify them later. Each screen can be adjusted individually at step 4.',
    },
    related: ['screen', 'creation-mode'],
    guide: {page: 'creation', section: 'setup-eval'},
  },
  {
    id: 'screen',
    fr: {
      term: 'Écran',
      definition: 'Une page de l\'évaluation, affichée au participant dans GazePlay-Learning. Il en existe trois types : instruction, stimuli et transition. Les écrans se créent, s\'ordonnent et se modifient à l\'étape 4.',
    },
    en: {
      term: 'Screen',
      definition: 'A page of the assessment, shown to the participant in GazePlay-Learning. There are three types: instruction, stimulus and transition. Screens are created, ordered and edited at step 4.',
    },
    related: ['instruction-screen', 'stimuli-screen', 'transition-screen'],
    guide: {page: 'creation', section: 'create-eval'},
  },
  {
    id: 'instruction-screen',
    fr: {
      term: 'Écran d\'instruction',
      definition: 'Écran qui donne une consigne au participant sous forme de texte, d\'image, de vidéo ou de son. Il peut comporter un bouton de lancement.',
    },
    en: {
      term: 'Instruction screen',
      definition: 'A screen that gives the participant an instruction as text, an image, a video or a sound. It can include a start button.',
    },
    related: ['instruction', 'start-button', 'media'],
    guide: {page: 'creation', section: 'create-eval'},
  },
  {
    id: 'instruction',
    fr: {
      term: 'Consigne',
      definition: 'Ce que l\'on demande au participant de faire, par exemple « Regarde le chat ». Elle est présentée par un écran d\'instruction, ou énoncée par le son d\'un écran de stimuli.',
    },
    en: {
      term: 'Instruction',
      definition: 'What the participant is asked to do, for example “Look at the cat”. It is presented by an instruction screen, or spoken by the sound of a stimulus screen.',
    },
    related: ['instruction-screen', 'screen-sound'],
  },
  {
    id: 'stimuli-screen',
    fr: {
      term: 'Écran de stimuli',
      definition: 'Écran qui affiche une grille de cases (images et/ou sons) que le participant regarde pour répondre. On y règle notamment la taille de la grille, le nombre de stimuli à valider, les cases prises en compte et le temps maximum.',
    },
    en: {
      term: 'Stimulus screen',
      definition: 'A screen that shows a grid of cells (images and/or sounds) that the participant looks at to answer. Its settings include the grid size, the number of stimuli to validate, the cells taken into account and the maximum time.',
    },
    related: ['stimulus', 'grid', 'validate'],
    guide: {page: 'creation', section: 'create-eval'},
  },
  {
    id: 'transition-screen',
    fr: {
      term: 'Écran de transition',
      definition: 'Pause entre deux écrans, qui laisse le temps d\'intégrer l\'information précédente. Elle peut afficher une croix de fixation pour ramener le regard du participant au centre de l\'écran.',
    },
    en: {
      term: 'Transition screen',
      definition: 'A pause between two screens, which leaves time to take in the previous information. It can show a fixation cross to bring the participant\'s gaze back to the centre of the screen.',
    },
    related: ['fixation-cross', 'next-delay'],
    guide: {page: 'creation', section: 'setup-eval'},
  },
  {
    id: 'stimulus',
    fr: {
      term: 'Stimulus (pluriel : stimuli)',
      definition: 'Élément présenté au participant pour provoquer une réponse : ici, le contenu d\'une case de la grille (image et/ou son). Le participant sélectionne un stimulus en le regardant pendant la durée de fixation.',
    },
    en: {
      term: 'Stimulus (plural: stimuli)',
      definition: 'An element presented to the participant to prompt an answer: here, the content of a grid cell (image and/or sound). The participant selects a stimulus by looking at it for the fixation duration.',
    },
    related: ['cell', 'validate', 'fixation-duration'],
  },
  {
    id: 'grid',
    fr: {
      term: 'Grille',
      definition: 'Disposition en lignes et en colonnes des cases d\'un écran de stimuli. Le nombre de stimuli à valider ne peut pas dépasser le nombre de lignes multiplié par le nombre de colonnes.',
    },
    en: {
      term: 'Grid',
      definition: 'The arrangement in rows and columns of the cells of a stimulus screen. The number of stimuli to validate cannot exceed the number of rows multiplied by the number of columns.',
    },
    related: ['cell', 'stimuli-screen'],
  },
  {
    id: 'cell',
    fr: {
      term: 'Case',
      definition: 'Un emplacement de la grille d\'un écran de stimuli. Une case peut contenir une image, un son, ou les deux, et elle est marquée comme bonne ou mauvaise réponse. Elle se règle dans le panneau qui s\'ouvre quand on la sélectionne dans l\'éditeur.',
    },
    en: {
      term: 'Cell',
      definition: 'A position in the grid of a stimulus screen. A cell can contain an image, a sound or both, and it is marked as a correct or wrong answer. It is set in the panel that opens when you select it in the editor.',
    },
    related: ['grid', 'correct-answer', 'crop'],
    guide: {page: 'creation', section: 'create-eval'},
  },
  {
    id: 'correct-answer',
    fr: {
      term: 'Bonne réponse / mauvaise réponse',
      definition: 'Marque donnée à chaque case : une coche verte signale une bonne réponse, une croix rouge une mauvaise réponse. Avec « Cases prises en compte : Bonnes réponses », seules les bonnes réponses comptent pour valider l\'écran.',
    },
    en: {
      term: 'Correct answer / wrong answer',
      definition: 'A mark given to each cell: a green tick shows a correct answer, a red cross a wrong answer. With “Cells taken into account: Correct answers”, only correct answers count towards validating the screen.',
    },
    related: ['counted-cells', 'cell'],
  },
  {
    id: 'counted-cells',
    fr: {
      term: 'Cases prises en compte (Tout / Bonnes réponses)',
      definition: 'Règle de validation d\'un écran de stimuli. « Tout » : toute case sélectionnée compte, du moment que le participant en sélectionne le nombre demandé. « Bonnes réponses » : seules les cases marquées comme bonnes réponses comptent.',
    },
    en: {
      term: 'Cells taken into account (All / Correct answers)',
      definition: 'The validation rule of a stimulus screen. “All”: every selected cell counts, as long as the participant selects the required number. “Correct answers”: only cells marked as correct answers count.',
    },
    related: ['correct-answer', 'validate'],
    guide: {page: 'creation', section: 'create-eval'},
  },
  {
    id: 'validate',
    fr: {
      term: 'Valider un stimulus',
      definition: 'Le sélectionner du regard : le participant doit regarder la case pendant la « durée de fixation pour valider ». Quand le nombre de stimuli à valider est atteint, GazePlay-Learning passe à l\'écran suivant.',
    },
    en: {
      term: 'Validate a stimulus',
      definition: 'To select it with the eyes: the participant must look at the cell for the “fixation time to validate”. When the number of stimuli to validate is reached, GazePlay-Learning moves to the next screen.',
    },
    related: ['fixation-duration', 'counted-cells', 'max-time'],
  },
  {
    id: 'fixation-duration',
    fr: {
      term: 'Durée de fixation',
      definition: 'Temps pendant lequel le participant doit garder le regard sur un élément (case, bouton de lancement, croix de fixation) pour qu\'il soit pris en compte. Comme toutes les durées de l\'application, elle s\'exprime en secondes, au dixième près (par exemple 1,5).',
    },
    en: {
      term: 'Fixation duration',
      definition: 'The time during which the participant must keep looking at an element (cell, start button, fixation cross) for it to be taken into account. Like every duration in the application, it is expressed in seconds, to the nearest tenth (for example 1.5).',
    },
    related: ['eye-tracking', 'validate', 'fixation-cross', 'start-button'],
    guide: {page: 'creation', section: 'setup-eval'},
  },
  {
    id: 'fixation-cross',
    fr: {
      term: 'Croix de fixation',
      definition: 'Croix « + » affichée au centre d\'un écran de transition pour y ramener le regard du participant avant l\'écran suivant. Avec « Imposer un temps de fixation », le participant doit la regarder pendant la durée de fixation choisie.',
    },
    en: {
      term: 'Fixation cross',
      definition: 'A “+” cross shown in the centre of a transition screen to bring the participant\'s gaze back there before the next screen. With “Require a fixation time”, the participant must look at it for the chosen fixation duration.',
    },
    related: ['transition-screen', 'fixation-duration'],
    guide: {page: 'creation', section: 'setup-eval'},
  },
  {
    id: 'start-button',
    fr: {
      term: 'Bouton de lancement',
      definition: 'Bouton affiché sur un écran d\'instruction : le participant le fixe du regard pendant la « durée de fixation du bouton » pour démarrer l\'évaluation.',
    },
    en: {
      term: 'Start button',
      definition: 'A button shown on an instruction screen: the participant looks at it for the “button fixation duration” to start the assessment.',
    },
    related: ['instruction-screen', 'fixation-duration'],
    guide: {page: 'creation', section: 'setup-eval'},
  },
  {
    id: 'next-delay',
    fr: {
      term: 'Délai avant l\'écran suivant',
      definition: 'Avec « Passer automatiquement à l\'écran suivant après un délai », temps pendant lequel un écran de transition ou d\'instruction reste affiché avant de passer au suivant. Si une vidéo ou un son dure plus longtemps, un message propose d\'ajuster le délai.',
    },
    en: {
      term: 'Delay before the next screen',
      definition: 'With “Automatically move to the next screen after a delay”, the time a transition or instruction screen stays displayed before moving to the next one. If a video or sound lasts longer, a message offers to adjust the delay.',
    },
    related: ['transition-screen', 'instruction-screen'],
  },
  {
    id: 'max-time',
    fr: {
      term: 'Temps maximum',
      definition: 'Avec « Limiter le temps passé sur chaque écran », durée au-delà de laquelle GazePlay-Learning quitte un écran de stimuli, même si le participant n\'a pas validé le nombre de stimuli demandé.',
    },
    en: {
      term: 'Maximum time',
      definition: 'With “Limit the time spent on each screen”, the duration after which GazePlay-Learning leaves a stimulus screen, even if the participant has not validated the required number of stimuli.',
    },
    related: ['stimuli-screen', 'validate'],
  },
  {
    id: 'random-position',
    fr: {
      term: 'Position aléatoire des stimuli',
      definition: 'Option d\'un écran de stimuli : les cases sont mélangées à l\'affichage, pour que le participant ne puisse pas se fier à leur position.',
    },
    en: {
      term: 'Random stimulus position',
      definition: 'A stimulus screen option: the cells are shuffled when displayed, so that the participant cannot rely on their position.',
    },
    related: ['stimuli-screen', 'grid'],
  },
  {
    id: 'hide-after-selection',
    fr: {
      term: 'Cacher après sélection',
      definition: 'Option d\'un écran de stimuli : une case disparaît une fois validée, ce qui empêche de la sélectionner deux fois.',
    },
    en: {
      term: 'Hide after selection',
      definition: 'A stimulus screen option: a cell disappears once validated, which prevents it from being selected twice.',
    },
    related: ['validate'],
  },
  {
    id: 'screen-sound',
    fr: {
      term: 'Son de l\'écran',
      definition: 'Son diffusé sur un écran de stimuli (option « Jouer un son ? »), indépendamment des sons des cases, par exemple pour énoncer la consigne.',
    },
    en: {
      term: 'Screen sound',
      definition: 'A sound played on a stimulus screen (“Play a sound?” option), independently of the cell sounds, for example to speak the instruction.',
    },
    related: ['instruction', 'media'],
  },
  {
    id: 'media',
    fr: {
      term: 'Média',
      definition: 'Fichier image, son ou vidéo ajouté à un écran. Il est copié dans le stockage du navigateur : vous pouvez ensuite déplacer ou supprimer le fichier d\'origine sans conséquence sur l\'évaluation.',
    },
    en: {
      term: 'Media',
      definition: 'An image, sound or video file added to a screen. It is copied into the browser storage: you can then move or delete the original file without affecting the assessment.',
    },
    related: ['unsupported-file', 'browser-storage'],
    guide: {page: 'options', section: 'media-storage'},
  },
  {
    id: 'unsupported-file',
    fr: {
      term: 'Fichier non lu par GazePlay-Learning',
      definition: 'Fichier dans un format que GazePlay-Learning ne lit pas (par exemple une image SVG ou un son M4A). Il est refusé quand on le choisit ; les formats acceptés sont indiqués sous chaque bouton de choix de fichier. S\'il vient d\'une ancienne sauvegarde ou d\'une importation, il est conservé et signalé par un triangle jaune, et l\'export du .zip demande une confirmation.',
    },
    en: {
      term: 'File not read by GazePlay-Learning',
      definition: 'A file in a format that GazePlay-Learning cannot read (for example an SVG image or an M4A sound). It is refused when you choose it; the accepted formats are shown under each file selection button. If it comes from an older save or an import, it is kept and marked with a yellow triangle, and exporting the .zip asks for confirmation.',
    },
    related: ['media', 'export'],
    guide: {page: 'depannage', section: 'export-blocked'},
  },
  {
    id: 'crop',
    fr: {
      term: 'Recadrer',
      definition: 'Ne garder qu\'une partie d\'une image, en déplaçant un cadre ou en saisissant sa largeur et sa hauteur en pixels. Disponible pour l\'image d\'une case.',
    },
    en: {
      term: 'Crop',
      definition: 'To keep only part of an image, by moving a frame or entering its width and height in pixels. Available for a cell image.',
    },
    related: ['cell', 'media'],
    guide: {page: 'creation', section: 'create-eval'},
  },

  // ─── Fichiers et sauvegardes ────────────────────────────────────────────
  {
    id: 'gpsave',
    fr: {
      term: '.gpSave',
      definition: 'Fichier de sauvegarde complète d\'une évaluation (écrans, médias et paramètres globaux), téléchargé à l\'étape 5 ou depuis Mes sauvegardes. Il se réimporte dans GazePlay-Eval pour continuer l\'évaluation, sur cet ordinateur ou sur un autre. Pour faire passer l\'évaluation, exportez plutôt le .zip.',
    },
    en: {
      term: '.gpSave',
      definition: 'A complete backup file of an assessment (screens, media and global settings), downloaded at step 5 or from My saves. It can be imported back into GazePlay-Eval to continue the assessment, on this computer or another one. To run the assessment, export the .zip instead.',
    },
    related: ['zip', 'import'],
    guide: {page: 'imports', section: 'formats'},
  },
  {
    id: 'zip',
    fr: {
      term: '.zip',
      definition: 'Archive produite par « Exporter le .zip » à l\'étape 5. Elle contient les écrans et les médias : c\'est le fichier à ouvrir dans GazePlay-Learning. Elle peut aussi être réimportée dans GazePlay-Eval, mais sans les paramètres globaux.',
    },
    en: {
      term: '.zip',
      definition: 'The archive produced by “Export the .zip” at step 5. It contains the screens and media: it is the file to open in GazePlay-Learning. It can also be imported back into GazePlay-Eval, but without the global settings.',
    },
    related: ['export', 'gpsave', 'gazeplay-learning'],
    guide: {page: 'imports', section: 'formats'},
  },
  {
    id: 'export',
    fr: {
      term: 'Exporter',
      definition: 'Produire le fichier .zip lu par GazePlay-Learning, à l\'étape 5. À ne pas confondre avec « Télécharger le .gpSave », qui produit une sauvegarde destinée à GazePlay-Eval.',
    },
    en: {
      term: 'Export',
      definition: 'To produce the .zip file read by GazePlay-Learning, at step 5. Not to be confused with “Download the .gpSave”, which produces a backup intended for GazePlay-Eval.',
    },
    related: ['zip', 'gpsave'],
    guide: {page: 'imports', section: 'export'},
  },
  {
    id: 'import',
    fr: {
      term: 'Importer',
      definition: 'Ouvrir dans GazePlay-Eval un fichier .gpSave ou .zip (menu « Importer un fichier »). « Ouvrir » charge l\'évaluation sans l\'enregistrer dans un emplacement ; « Ouvrir et sauvegarder » l\'enregistre aussi dans l\'un des trois emplacements.',
    },
    en: {
      term: 'Import',
      definition: 'To open a .gpSave or .zip file in GazePlay-Eval (“Import a file” menu). “Open” loads the assessment without saving it in a slot; “Open and save” also saves it in one of the three slots.',
    },
    related: ['gpsave', 'zip', 'slot'],
    guide: {page: 'imports', section: 'import'},
  },
  {
    id: 'slot',
    fr: {
      term: 'Emplacement',
      definition: 'L\'une des trois places de sauvegarde de la page Mes sauvegardes, dans ce navigateur. Une évaluation enregistrée dans un emplacement y est liée : ses modifications suivantes y sont reportées automatiquement (mention « En cours »).',
    },
    en: {
      term: 'Slot',
      definition: 'One of the three save places on the My saves page, in this browser. An assessment saved in a slot is linked to it: its later changes are copied there automatically (“In progress” label).',
    },
    related: ['current-evaluation', 'auto-save', 'tab'],
    guide: {page: 'sauvegardes', section: 'my-saves'},
  },
  {
    id: 'auto-save',
    fr: {
      term: 'Sauvegarde automatique',
      definition: 'Enregistrement de l\'évaluation en cours sans action de votre part : à chaque changement d\'étape, en quittant une étape par le menu et à la fermeture de l\'onglet. Elle permet de reprendre le travail depuis l\'accueil.',
    },
    en: {
      term: 'Automatic save',
      definition: 'Saving of the assessment in progress without any action on your part: at each change of step, when leaving a step through the menu and when the tab is closed. It lets you resume work from the home page.',
    },
    related: ['current-evaluation', 'slot'],
    guide: {page: 'sauvegardes', section: 'auto-save'},
  },
  {
    id: 'browser-storage',
    fr: {
      term: 'Stockage du navigateur',
      definition: 'Espace où le navigateur conserve les données de GazePlay-Eval sur cet ordinateur : évaluations, médias et préférences. Rien n\'est envoyé sur un serveur. Effacer les données de navigation, changer de navigateur ou d\'ordinateur les rend inaccessibles : téléchargez un .gpSave pour en garder une copie.',
    },
    en: {
      term: 'Browser storage',
      definition: 'The space where the browser keeps GazePlay-Eval data on this computer: assessments, media and preferences. Nothing is sent to a server. Clearing browsing data or changing browser or computer makes them inaccessible: download a .gpSave to keep a copy.',
    },
    related: ['gpsave', 'media'],
    guide: {page: 'sauvegardes', section: 'storage'},
  },
  {
    id: 'tab',
    fr: {
      term: 'Onglet',
      definition: 'Chaque onglet du navigateur a sa propre évaluation en cours. Un emplacement en cours de modification dans un onglet ne peut pas être remplacé depuis un autre, et un onglet dupliqué travaille sur une copie de l\'évaluation.',
    },
    en: {
      term: 'Tab',
      definition: 'Each browser tab has its own assessment in progress. A slot being edited in one tab cannot be replaced from another, and a duplicated tab works on a copy of the assessment.',
    },
    related: ['current-evaluation', 'slot'],
    guide: {page: 'depannage', section: 'several-tabs'},
  },

  // ─── Affichage ──────────────────────────────────────────────────────────
  {
    id: 'high-contrast',
    fr: {
      term: 'Contraste renforcé',
      definition: 'Option d\'affichage (page Options) qui utilise des couleurs plus franches et des bordures plus épaisses, pour mieux distinguer les éléments de l\'interface.',
    },
    en: {
      term: 'High contrast',
      definition: 'A display option (Options page) that uses stronger colours and thicker borders, to make the interface elements easier to tell apart.',
    },
    related: ['colour-blind-mode'],
    guide: {page: 'options', section: 'appearance'},
  },
  {
    id: 'colour-blind-mode',
    fr: {
      term: 'Mode daltonisme',
      definition: 'Option d\'affichage (page Options) qui utilise des couleurs plus faciles à distinguer pour les états (réussite, erreur, avertissement) et les complète par des symboles, des motifs et des liens soulignés, pour ne pas dépendre de la couleur.',
    },
    en: {
      term: 'Colour-blind mode',
      definition: 'A display option (Options page) that uses colours that are easier to tell apart for states (success, error, warning) and adds symbols, patterns and underlined links, so as not to rely on colour.',
    },
    related: ['high-contrast'],
    guide: {page: 'options', section: 'appearance'},
  },
];
