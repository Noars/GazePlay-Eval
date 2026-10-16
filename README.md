# GazePlay-Eval

Une extension Web de [GazePlay-Learning](https://gazeplay.github.io/GazePlay/fr) permettant de créer des évaluations personnalisés.

lien : [https://lig-gazeplay.imag.fr/#/home](https://lig-gazeplay.imag.fr/#/home)


## Description du projet
> [!TIP]
> Vous plus de détails sur la description du projet, vous pouvez consulter ce [rapport de stage](https://github.com/GazePlay/reports-and-presentations/blob/master/Reports/Simon_Favreau_Thomas_Peterschmitt_Rapport.pdf). Les explications suivantes en sont une synthèse.

GazePlay-Eval est une application web construite avec Angular 21. Le site est "monopage", ce qui signifie que seuls les composants graphiques (des menus, des boutons, ...) sont rafraîchis.

### Architecture

L'architecture du projet se présente sous la forme suivante : 
```
src/
├── app/
│   ├── components/
│   │   └── [éléments réutilisés : en-tête, menu, éditeur d'écran, fenêtres…]
│   ├── core/
│   │   ├── a11y/          [titre de page, focus après navigation]
│   │   ├── media/         [accès aux médias, inventaire des références, nettoyage sûr]
│   │   ├── preferences/   [préférences d'affichage stockées dans IndexedDB]
│   │   └── storage/       [ouverture et migrations de la base IndexedDB]
│   ├── pages/
│   │   └── [pages de l'application : parcours de création, sauvegardes, options, guide…]
│   ├── services/
│   │   └── [logique métier : sauvegarde, import, export, médias…]
│   ├── shared/
│   │   ├── ui/            [composants de formulaire accessibles réutilisables]
│   │   └── [modèles de données de l'application]
│   ├── testing/           [contrôles d'accessibilité automatisés]
│   ├── app.config.ts
│   ├── app.html
│   ├── app.routes.ts
│   └── app.ts
├── assets/
│   ├── guide/images/
│   └── icons/
├── styles/                [système de design SCSS : jetons, composants, accessibilité]
├── index.html
├── main.ts
└── styles.scss
docs/
└── ACCESSIBILITE.md       [état de l'accessibilité et écarts connus]
tests/
├── [fichiers png, mp3, gpSave]
└── README.md
CLAUDE.md                  [règles de travail et contraintes du projet]
README.md
package.json
```

Comme expliqué ci-dessus, l'application se compose de "pages" qui sont elle-mêmes créées avec des components. La seule différence entre les deux est qu'un component peut être utilisé à plusieurs endroits différents, ce qui n'est pas le cas des pages.

Pages et Components sont structurés de la même façon : 

```
un-composant/
├── un-composant.component.css
├── un-composant.component.html
├── un-composant.component.spec.ts
└── un-composant.component.ts
```
```
une-page/
├── une-page.component.css
├── une-page.component.html
├── une-page.component.spec.ts
└── une-page.component.ts
```
- Le CSS contient le style spécifique au component ou à la page. L'apparence générale vient du **système de design** de `src/styles/` (classes `gp-…` et variables `--gp-…`), construit au-dessus de **Bootstrap** (grille, utilitaires). Les couleurs ne sont jamais écrites en dur : elles viennent des jetons, ce qui garantit la cohérence des thèmes clair, sombre et contrasté.
- Le HTML contient le "layout" de l'élément. C'est la vue modifiée dynamiquement par le fichier **TypeScript**.
- Le SPEC contient les tests unitaires de l'élément. Ils utilisent Jasmine (plus de détails dans la partie sur les tests).
- Le TS (TypeScript) correspond au View-Model. Il permet d'afficher la vue et de récupérer les actions utilisateurs pour utiliser les services.

Les services sont structurés d'une façon similaire : 

```
un-service/
├── un-service.service.spec.ts
└── un-service.service.ts
```

Les services contiennent toute la logique métier de l'application. Ils permettent d'interagir avec les évaluations, les options, ... Ils font partis du modèle.

L'architecture globale de l'application est donc en **MVVM** (Model-View, Vue, Modèle).

*les graphes ont été réalisés avec un [outil](https://gitlab.com/nfriend/tree-online) créé par Nathan Friend.*

## Stockage

GazePlay-Eval n'utilise aucun serveur pour stocker les données des utilisateurs. La solution utilise un mélange de [Local Storage](https://developer.mozilla.org/fr/docs/Web/API/Window/localStorage) et d'[IndexedDB](https://developer.mozilla.org/fr/docs/Web/API/IndexedDB_API) (abrégé IDB):

- Le Local Storage contient :
  - 3 emplacements pour les évaluations, appelés `save1`, `save2`, `save3`.
  - 1 emplacement pour la sauvegarde automatique, appelé `saveAuto`.
  - `gazeplay-eval.preferences-cache` : un simple instantané (thème, contraste, taille du texte) lu avant le démarrage d'Angular pour éviter un « flash » visuel. La source de vérité des préférences reste l'IDB.
  - les anciennes clés `theme` et `options`, qui ne sont plus écrites mais sont conservées : elles sont reprises une fois lors de la première ouverture de la nouvelle version.
  - `saveAuto` est la copie de la **dernière** évaluation en cours modifiée, accompagnée de `gazeplay-eval.active-slot` (son emplacement lié) et de `gazeplay-eval.saveAuto-tab` (l'onglet qui l'a écrite). Un nouvel onglet la reprend si cet onglet est fermé.
  - `gazeplay-eval.tab-media.<onglet>` : les écrans de l'évaluation de chaque onglet, pour que le nettoyage des médias ne supprime jamais un média utilisé dans un autre onglet (conservé 7 jours après la fermeture de l'onglet).

- Le Session Storage (propre à chaque onglet, conservé au rechargement) contient l'évaluation en cours de l'onglet (`gazeplay-eval.tab-working`, même format que les sauvegardes), son emplacement lié (`gazeplay-eval.active-slot`) et l'identifiant de l'onglet (`gazeplay-eval.tab-id`). Deux onglets ne partagent donc jamais leur évaluation en cours. Des verrous [Web Locks](https://developer.mozilla.org/fr/docs/Web/API/Web_Locks_API) signalent les onglets ouverts et les emplacements en cours de modification (onglet dupliqué, emplacement ouvert ailleurs).

- L'IDB (base `GazePlayEvalDB`, **version 2**) contient :
  - le store `evalFiles` : toutes les pièces jointes utilisées dans une évaluation (images, sons, vidéos) ;
  - le store `userPreferences` (ajouté en version 2) : les préférences d'affichage (thème, contraste, police, taille du texte, espacements, interligne, animations, durée des notifications).

> [!IMPORTANT]
> La migration de la version 1 vers la version 2 est **additive** : elle crée le store `userPreferences` sans toucher à `evalFiles`. Elle est testée dans [app-database.spec.ts](src/app/core/storage/app-database.spec.ts) sur une base temporaire. Si un autre onglet ouvert sur l'ancienne version bloque la mise à jour, un bandeau invite à le fermer.

Le format d'une évaluation (complétée) est le suivant : 

```js
{
    "nomEval": "évaluationImportation",
    "format": "Csv&Xlsx",
    "infoParticipant": [
        "Nom",
        "Prénom",
        "Âge"
    ],
    "globalParamsTransitionScreen": [
        true,
        15,
        true,
        true,
        1.2
    ],
    "globalParamsInstructionScreen": [
        true,
        6.5,
        true,
        "Image",
        true,
        1.2
    ],
    "globalParamsStimuliScreen": [
        2,
        4,
        true,
        40,
        1.5,
        3,
        true,
        true
    ],
    "listScreens": [
        {
            "name": "Ecran 1",
            "type": "instruction",
            "values": [
                true,
                6.5,
                true,
                "Image",
                "gazeplay-mesange.png",
                null,
                true,
                1.2,
                "évaluationImportation/gazeplay-mesange.png"
            ]
        },
        {
            "name": "Ecran 2",
            "type": "stimuli",
            "values": [
                2,
                4,
                true,
                40,
                1.5,
                "Tout",
                3,
                true,
                true,
                false,
                "",
                null,
                {
                    "0": {
                        "imageId": "évaluationImportation/gazeplay-rouge-gorge.png",
                        "imageName": "gazeplay-rouge-gorge.png",
                        "soundId": "",
                        "soundName": "",
                        "goodAnswer": true
                    },
                    "1": {
                        "imageName": "",
                        "soundName": "",
                        "goodAnswer": false,
                        "hidden": false
                    },
                    "2": {
                        "imageName": "",
                        "soundName": "gazeplay-oiseau.mp3",
                        "goodAnswer": false,
                        "hidden": false,
                        "soundId": "évaluationImportation/gazeplay-oiseau.mp3"
                    },
                    "3": {
                        "imageName": "gazeplay-mesange.png",
                        "imageId": "évaluationImportation/gazeplay-mesange.png",
                        "soundName": "",
                        "soundId": "",
                        "goodAnswer": false,
                        "hidden": false
                    },
                    "4": {
                        "imageName": "",
                        "soundName": "",
                        "goodAnswer": false,
                        "hidden": false
                    },
                    "5": {
                        "imageName": "gazeplay-mesange.png",
                        "soundName": "",
                        "goodAnswer": false,
                        "hidden": false,
                        "imageId": "évaluationImportation/gazeplay-mesange.png"
                    },
                    "6": {
                        "imageName": "",
                        "soundName": "",
                        "goodAnswer": false,
                        "hidden": false
                    },
                    "7": {
                        "imageName": "gazeplay-rouge-gorge.png",
                        "imageId": "évaluationImportation/gazeplay-rouge-gorge.png",
                        "soundName": "",
                        "soundId": "",
                        "goodAnswer": true,
                        "hidden": false
                    }
                },
                ""
            ]
        },
        {
            "name": "Ecran 3",
            "type": "transition",
            "values": [
                true,
                15,
                true,
                true,
                1.2
            ]
        }
    ],
    "step": 4,
    "createdAt": "2026-07-09T08:51:58.638Z",
    "version": 1
}
```

Vous pouvez remarquer que chaque pièce jointe (dans le cas de l'exemple, des images et des sons) possède un attribut `imageID` ou `soundID`. Etant donné que le Local Storage ne peut pas stocker de gros fichiers, il stocke simplement un chemin vers ce fichier qui est stocké dans l'IDB. Ce chemin est construit de la façon suivante : `nomEval/nomFichier` (de cette façon, on s'assure du critère d'unicité et on évite d'avoir des doublons, ce qui optimise le stockage).

> [!NOTE]
> Vous pouvez retrouver toute la logique de gestion de fichier de l'IDB dans le service [indexed-db.service.ts](src/app/services/indexedDB/indexed-db.service.ts).

Un même média peut être utilisé par plusieurs cases (duplication) : un compteur `refCount` suit ces références. Comme ce compteur n'est pas toujours exact (une archive importée enregistre chaque fichier une seule fois), un média n'est **supprimé que s'il n'est plus référencé par aucune évaluation connue** (emplacements 0 à 3 et évaluation en cours). Voir [media-cleanup.service.ts](src/app/core/media/media-cleanup.service.ts) et [media-library.service.ts](src/app/core/media/media-library.service.ts).

## Tests

Commande utilisée par l'intégration continue (exécution unique, navigateur sans interface) :

```bash
npx ng test --watch=false --no-progress --browsers=ChromeHeadless
```

Les tests comprennent des contrôles d'accessibilité automatisés sur chaque page ([a11y-pages.spec.ts](src/app/testing/a11y-pages.spec.ts)). Ils ne remplacent pas un audit complet : voir [docs/ACCESSIBILITE.md](docs/ACCESSIBILITE.md).

Pour lancer les tests sous IntelliJ Idea, vous pouvez lancer les commandes suivantes : 

```bash
ng test
```
--> Lance *Karma* (outil permettant de simuler un navigateur web) et déroule l'ensemble des tests.

```bash
ng test --code-coverage GazePlay-Eval 
```
--> créé (ou recharge) un dossier `coverage` dans le projet. Lancer le fichier `index.html` pour obtenir le taux de couverture des tests, de façon globale et sur chaque fichier.

### Tests de bout en bout

```bash
npm run build
npm run e2e
```
--> Sert l'application construite en local et rejoue les parcours principaux (pages, thème, import d'un `.gpSave`, sauvegarde automatique, rechargement, onglets, fichier invalide) dans Chrome, Edge et Firefox s'ils sont installés, avec des profils temporaires : vos sauvegardes ne sont jamais touchées. Aucune dépendance à installer ([e2e/e2e-smoke.mjs](e2e/e2e-smoke.mjs)). Pour un seul navigateur : `node e2e/e2e-smoke.mjs firefox`. Safari n'est pas couvert : à vérifier manuellement.

## Tâches restantes

Les tâches restantes sont représentés par les Issues dans le projet. Des commentaires sont rajoutés pour apporter plus de contexte ou des propositions de solutions à mettre en place.

### Guide utilisateur : 
- [ ] [#56](https://github.com/Noars/GazePlay-Eval/issues/56)
- [ ] [#55](https://github.com/Noars/GazePlay-Eval/issues/55)
- [ ] [#51](https://github.com/Noars/GazePlay-Eval/issues/51)
- [ ] [#49](https://github.com/Noars/GazePlay-Eval/issues/49)

### Options : 
- [ ] [#50](https://github.com/Noars/GazePlay-Eval/issues/50)
- [ ] [#48](https://github.com/Noars/GazePlay-Eval/issues/48)

### Tests : 
- [ ] [#53](https://github.com/Noars/GazePlay-Eval/issues/53)
- [ ] [#52](https://github.com/Noars/GazePlay-Eval/issues/52)

### Autre : 
- [ ] [#54](https://github.com/Noars/GazePlay-Eval/issues/54)
- [X] [#47](https://github.com/Noars/GazePlay-Eval/issues/47) (techniquement déjà fait, mais une revérification serait bien)
- [ ] [#23](https://github.com/Noars/GazePlay-Eval/issues/23)
- [X] [#7](https://github.com/Noars/GazePlay-Eval/issues/7) (à faire au fur et à mesure de l'avancée du projet)

## Contact

En cas de besoin d'éclaircissement sur des parties spécifiques du code, vous pouvez envoyer un mail aux adresses suivantes : 
- *thomas.peterschmitt@gmail.com*
- *fyraxys2006@gmail.com*


## Auteurs 
- Simon F.
- Thomas P.
