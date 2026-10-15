# CLAUDE.md — GazePlay-Eval

Guide de travail pour Claude Code. Légende : **[actuel]** = fonctionnement en place · **[risque]** = point de vigilance connu · **[futur]** = objectif non réalisé.

## Projet
SPA Angular 21 100 % côté client (aucun serveur) pour créer des évaluations — suites d'écrans **transition**, **instruction**, **stimuli** — exportées pour **GazePlay-Learning**. Interface, commentaires et tests en français.
Pile : Angular 21 (standalone, `@if`/`@for`, signals, zone.js, routage par hash), Bootstrap 5.3 (CSS seulement : grille, utilitaires, champs) + Bootstrap Icons, système de design SCSS maison, Angular Material (seulement `MatDialog`, `MatTooltip`), CDK drag-drop, ngx-image-cropper, JSZip, file-saver. Tests Karma + Jasmine.

## Architecture [actuel]
- Entrée : `src/main.ts` → `src/app/app.ts` (lien d'évitement, en-tête, navigation latérale/tiroir, étapes, `main#main-content`). Un initialiseur charge les préférences (IndexedDB) avant le premier rendu. Au rechargement : `/home` puis `AutoSaveService.tryResume()`.
- Routes : `src/app/app.routes.ts` (chaque route a un `title` ; `**` → page introuvable). Parcours `info-eval → info-participant → setup-eval → create-eval → download-eval` (`shared/stepRoute.model.ts`).
- `core/` : `storage/app-database.ts` (ouverture + migrations IDB), `preferences/` (modèle, store, service, application au DOM), `i18n/` (`I18nService` + pipe `t`, dictionnaires `locales/fr.ts` (référence) et `locales/en.ts`), `media/` (`MediaLibraryService` : résolution/ajout/libération ; `MediaCleanupService` : nettoyage sûr ; `media-references.ts`), `a11y/` (titre, focus après navigation).
- `pages/`, `components/` (dont `modify-screen` = éditeur, `config-stimuli` = panneau de case), `services/` (save, load, auto-save, download, load-zip, import-flow, overwrite-guard, update-screens, flash), `shared/` (modèles), `shared/ui/` (composants de formulaire accessibles : `choice-setting`, `number-setting`, `help-tip`, `file-picker`, `confirm-dialog`).
- Styles : `src/styles.scss` + `src/styles/` (jetons `--gp-*`, pont Bootstrap, base, structure, composants `.gp-*`, Material, accessibilité, mode daltonisme `_color-vision.scss`). Couleurs uniquement via les jetons (thèmes clair/sombre/contraste renforcé).
- État : `SaveService.dataAuto` (mutable) ; `AutoSaveService` sauvegarde à chaque étape du parcours.

## Conventions
- Interface bilingue (français par défaut, anglais) : aucun texte affiché en dur, passer par le pipe `t` ou `I18nService.t` et ajouter la clé dans `fr.ts` **et** `en.ts` (le compilateur et `i18n.spec.ts` vérifient la parité). Les guides ont un bloc par langue. Ne jamais traduire les valeurs enregistrées/exportées.
- Composants standalone ; nouveaux fichiers de style en `.scss`. Certains composants gardent un `.css` (contenu réécrit) : n'y utiliser **que du CSS plat** (pas d'imbrication Sass).
- Réutiliser les classes `.gp-*` et les composants `shared/ui` plutôt que de nouveaux styles locaux.
- `.editorconfig` : 2 espaces, quotes simples en TS. Pas de linter/formateur.
- Toute modification de comportement met à jour ou ajoute son `.spec.ts` ; descriptions de tests en français.
- Accessibilité : vrais `button`/`a`, libellés associés, nom accessible pour les boutons icônes, alternative clavier à tout geste souris (glisser, survol). `src/app/testing/a11y-pages.spec.ts` doit rester vert.
- JSDoc sur les fonctions complexes, pas de commentaires paraphrasant le code.

## Commandes
**Vérification ordinaire** (n'écrivent que des artefacts : `dist/`, `.angular/`, `coverage/`) :
- `npx ng test --watch=false --no-progress --browsers=ChromeHeadless` — exécutée le 15/10/2026 : 799/799 tests réussis (651 au commit 596468c, 659 après aef1194, 682 après #62, 731 avec la refonte du guide, 761 avec la protection avant remplacement, 799 avec les évaluations sans nom et l’isolation des onglets). Les journaux « Error: not found » et l'erreur `appendChild` du rapporteur HTML affichés en fin de suite existent déjà sur ces commits et ne font pas échouer la commande (code 0). La CI `.github/workflows/karmaTests.yml` (PR, push sur `master`) enchaîne `npm ci`, `npm run build`, cette commande de test et `npm audit --omit=dev --audit-level=critical`.
- `npm run build` — exécutée : build de production réussi, sans avertissement de budget.
- `npm start` (`ng serve`, http://localhost:4200/#/…) ; `npm test` = mode watch ; `git status` / `git diff` / `git log`.

**Opérations sensibles — accord explicite de l'utilisateur requis** : installation ou mise à jour de dépendances, suppression de fichiers, commandes destructrices, manipulation des données du navigateur, migration IndexedDB, changement de branche, commit, push, toute commande touchant l'index Git.

## Stockage local — données utilisateur
**[actuel] localStorage** : `saveAuto` (voir ci-dessous), `save1`–`save3` (JSON `shared/saveModel.ts`, format inchangé) ; `gazeplay-eval.preferences-cache` (instantané pour le premier affichage, jamais relu par l'app) ; anciennes clés `theme` et `options` conservées (lues une fois pour la migration, plus écrites). `saveAuto` = copie de la **dernière** évaluation en cours (avec `gazeplay-eval.active-slot` et `gazeplay-eval.saveAuto-tab`, l'onglet auteur), reprise par un nouvel onglet si son auteur est fermé ; `gazeplay-eval.tab-media.<onglet>` = écrans publiés par chaque onglet pour l'inventaire des médias (expirent 7 jours après la fermeture de l'onglet).
**[actuel] sessionStorage (par onglet)** : `gazeplay-eval.tab-working` (évaluation en cours de l'onglet, format `saveModel`), `gazeplay-eval.active-slot` (lien), `gazeplay-eval.tab-id`. **Slot 0 = évaluation de l'onglet** : `LoadService.getSlot(0)`, `SaveService.saveToSlot(0)` / `clearSlot(0)` passent par `core/tab/tab-session.service.ts` (initialisé avant le premier rendu). Verrous Web Locks `gazeplay-eval.tab.<id>` (onglet vivant, doublon détecté) et `gazeplay-eval.slot.<n>` (emplacement en cours de modification) : avant de lier un emplacement, le réserver (`reserveForOpening` / `reserveForImport` / `reserveForWriting` du `OverwriteGuardService`) et libérer la réservation si l'action est annulée. Sans Web Locks : isolation conservée, doublons et emplacements ouverts ailleurs non détectés.

**[actuel] IndexedDB `GazePlayEvalDB` v2** (`core/storage/app-database.ts`) :
- `evalFiles` : médias `{id: "<nomEval>/<nomFichier>", file, type, lastEdit, refCount}` (accès : `services/indexedDB/indexed-db.service.ts`).
- `userPreferences` : enregistrement unique `{id: 'current', schemaVersion, data, updatedAt}` (`core/preferences/`). Données normalisées à la lecture (`normalizePreferences`).
- Migrations **additives uniquement** dans `upgradeAppDatabase` ; ne jamais supprimer/vider `evalFiles` ; tester toute migration sur une base temporaire (voir `app-database.spec.ts`).

**Médias** : les sauvegardes référencent les médias par id (instruction `values[8]`, stimuli `values[13]`, `imageId`/`soundId` des cases) et par nom ; les `File` deviennent `{}` en localStorage → toujours résoudre via `MediaLibraryService.resolve`. Ne jamais supprimer un média directement : `MediaLibraryService.release` (dernière référence → suppression seulement si plus référencé nulle part) ou `MediaCleanupService`. Dans l'éditeur, les libérations sont différées jusqu'à la sortie (pour l'annulation).
**[risque]** les `refCount` des médias importés sont sous-estimés (d'où la vérification des références) ; un renommage d'évaluation ne renomme pas les ids des médias (ils restent valides) ; `deleteFileByProject`/`deleteAll` suppriment sans vérification — réservés à des actions confirmées.
**[actuel] Protection avant remplacement** (`OverwriteGuardService.check`) : une évaluation n'est « vide » que d'après son contenu (`isEmptyEvaluation` dans `shared/evaluation-content.ts` : ni nom, ni champ, ni écran, format et paramètres par défaut) — une évaluation sans nom avec du contenu est protégée. L'évaluation en cours n'est reportée sans question que dans l'emplacement **réellement lié** (`activeSlotIndex`), jamais d'après le nom ; sinon la fenêtre de remplacement s'affiche, sauf si un emplacement contient exactement le même contenu (`sameEvaluation`, date et étape ignorées). Le report utilise `dataAuto` seulement si `SaveService.hasLoadedWorkspace` (sinon le slot 0 enregistré) : le modèle vide du démarrage n'est jamais recopié, ni par la protection ni par `AutoSaveService`. Enregistrer l'évaluation en cours dans un emplacement l'y lie. Scénarios de perte corrigés le 15/10/2026 (homonymes, nouvel onglet sans reprise, remplacement sans confirmation, lien perdu) : `overwrite-guard.scenarios.spec.ts`.
**[risque]** après fermeture du navigateur, seule la dernière évaluation en cours modifiée est reprise (`saveAuto`) : celle d'un autre onglet non enregistrée dans un emplacement n'est plus proposée (ses médias restent protégés 7 jours). Deux onglets ouverts sur des copies d'une même évaluation non liée ne sont pas fusionnés.

## Formats d'échange — compatibilité GazePlay-Learning
- Export : `services/download/download.service.ts` ; import : `services/load-zip/load-zip.service.ts` ; libellés : `*ScreenConstKey` dans `shared/screenModel.ts`.
- **`.zip`** (Learning) : `<nom>/evalData.json`, `<nom>/evalInfo.json`, `images/`, `audio/`, `videos/` — sans paramètres globaux, `Name`, `hidden` ni ids IDB.
- **`.gpSave`** : même structure + `Name`, `hidden` et paramètres globaux (`buildGlobalParamsInfo` ↔ `parseGlobal*`).
- **`values[]` est positionnel** (index documentés en commentaire dans les templates de `modify-screen` et `global-*-screen`) ; l'export retire le `File` par `splice` (index 5 instruction, 11 stimuli).
- Valeurs exportées à conserver telles quelles : formats `Csv&Xlsx` / `Csv` / `Xlsx`, types de média `Image` / `Video` / `Texte` / `Son`, choix `Tout` / `BonneReponse`.
- **Interdit sans analyse de compatibilité préalable et tests d'aller-retour** : modifier libellés, clés JSON, index de `values[]` ou structure des archives.

## Préférences, responsive, accessibilité
- Préférences : locales (aucun serveur ni synchronisation), défauts si rien n'est enregistré, enregistrées à chaque modification, erreurs affichées (`UserPreferencesService.saveError`). Polices distantes chargées seulement si choisies. La langue (`language`) en fait partie ; « Rétablir l'affichage par défaut » la conserve.
- Responsive : aucune largeur minimale ; vérifié sans débordement à 320 px.
- Accessibilité : **cible** WCAG 2.2 AA, non déclarée conforme. État, vérifications faites et écarts : `docs/ACCESSIBILITE.md` (à tenir à jour).

## Règles
- Ne jamais supprimer, vider ou migrer de façon destructive des données utilisateur sans accord explicite.
- Ne pas affirmer qu'une commande, un test ou un comportement fonctionne sans l'avoir vérifié ; distinguer vérifié / déduit / à confirmer.
- Les consignes de l'utilisateur pour la session priment sur ce fichier.
