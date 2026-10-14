# CLAUDE.md — GazePlay-Eval

Guide de travail pour Claude Code. Légende : **[actuel]** = fonctionnement en place · **[risque]** = point de vigilance connu · **[futur]** = objectif non réalisé.

## Projet
SPA Angular 21 100 % côté client (aucun serveur) pour créer des évaluations — suites d'écrans **transition**, **instruction**, **stimuli** — exportées pour **GazePlay-Learning**. Interface, commentaires et tests en français.
Pile : Angular 21 (standalone, `@if`/`@for`, signals, zone.js, routage par hash), Bootstrap 5.3 (CSS seulement : grille, utilitaires, champs) + Bootstrap Icons, système de design SCSS maison, Angular Material (seulement `MatDialog`, `MatTooltip`), CDK drag-drop, ngx-image-cropper, JSZip, file-saver. Tests Karma + Jasmine.

## Architecture [actuel]
- Entrée : `src/main.ts` → `src/app/app.ts` (lien d'évitement, en-tête, navigation latérale/tiroir, étapes, `main#main-content`). Un initialiseur charge les préférences (IndexedDB) avant le premier rendu. Au rechargement : `/home` puis `AutoSaveService.tryResume()`.
- Routes : `src/app/app.routes.ts` (chaque route a un `title` ; `**` → page introuvable). Parcours `info-eval → info-participant → setup-eval → create-eval → download-eval` (`shared/stepRoute.model.ts`).
- `core/` : `storage/app-database.ts` (ouverture + migrations IDB), `preferences/` (modèle, store, service, application au DOM), `media/` (`MediaLibraryService` : résolution/ajout/libération ; `MediaCleanupService` : nettoyage sûr ; `media-references.ts`), `a11y/` (titre, focus après navigation).
- `pages/`, `components/` (dont `modify-screen` = éditeur, `config-stimuli` = panneau de case), `services/` (save, load, auto-save, download, load-zip, import-flow, overwrite-guard, update-screens, flash), `shared/` (modèles), `shared/ui/` (composants de formulaire accessibles : `choice-setting`, `number-setting`, `help-tip`, `file-picker`, `confirm-dialog`).
- Styles : `src/styles.scss` + `src/styles/` (jetons `--gp-*`, pont Bootstrap, base, structure, composants `.gp-*`, Material, accessibilité, mode daltonisme `_color-vision.scss`). Couleurs uniquement via les jetons (thèmes clair/sombre/contraste renforcé).
- État : `SaveService.dataAuto` (mutable) ; `AutoSaveService` sauvegarde à chaque étape du parcours.

## Conventions
- Composants standalone ; nouveaux fichiers de style en `.scss`. Certains composants gardent un `.css` (contenu réécrit) : n'y utiliser **que du CSS plat** (pas d'imbrication Sass).
- Réutiliser les classes `.gp-*` et les composants `shared/ui` plutôt que de nouveaux styles locaux.
- `.editorconfig` : 2 espaces, quotes simples en TS. Pas de linter/formateur.
- Toute modification de comportement met à jour ou ajoute son `.spec.ts` ; descriptions de tests en français.
- Accessibilité : vrais `button`/`a`, libellés associés, nom accessible pour les boutons icônes, alternative clavier à tout geste souris (glisser, survol). `src/app/testing/a11y-pages.spec.ts` doit rester vert.
- JSDoc sur les fonctions complexes, pas de commentaires paraphrasant le code.

## Commandes
**Vérification ordinaire** (n'écrivent que des artefacts : `dist/`, `.angular/`, `coverage/`) :
- `npx ng test --watch=false --no-progress --browsers=ChromeHeadless` — exécutée après le nettoyage technique d'octobre 2026 : 651/651 tests réussis (commande de la CI `.github/workflows/karmaTests.yml`).
- `npm run build` — exécutée : build de production réussi, sans avertissement de budget.
- `npm start` (`ng serve`, http://localhost:4200/#/…) ; `npm test` = mode watch ; `git status` / `git diff` / `git log`.

**Opérations sensibles — accord explicite de l'utilisateur requis** : installation ou mise à jour de dépendances, suppression de fichiers, commandes destructrices, manipulation des données du navigateur, migration IndexedDB, changement de branche, commit, push, toute commande touchant l'index Git.

## Stockage local — données utilisateur
**[actuel] localStorage** : `saveAuto` (slot 0), `save1`–`save3` (JSON `shared/saveModel.ts`, format inchangé) ; `gazeplay-eval.preferences-cache` (instantané pour le premier affichage, jamais relu par l'app) ; anciennes clés `theme` et `options` conservées (lues une fois pour la migration, plus écrites). **sessionStorage** : `gazeplay-eval.active-slot`.

**[actuel] IndexedDB `GazePlayEvalDB` v2** (`core/storage/app-database.ts`) :
- `evalFiles` : médias `{id: "<nomEval>/<nomFichier>", file, type, lastEdit, refCount}` (accès : `services/indexedDB/indexed-db.service.ts`).
- `userPreferences` : enregistrement unique `{id: 'current', schemaVersion, data, updatedAt}` (`core/preferences/`). Données normalisées à la lecture (`normalizePreferences`).
- Migrations **additives uniquement** dans `upgradeAppDatabase` ; ne jamais supprimer/vider `evalFiles` ; tester toute migration sur une base temporaire (voir `app-database.spec.ts`).

**Médias** : les sauvegardes référencent les médias par id (instruction `values[8]`, stimuli `values[13]`, `imageId`/`soundId` des cases) et par nom ; les `File` deviennent `{}` en localStorage → toujours résoudre via `MediaLibraryService.resolve`. Ne jamais supprimer un média directement : `MediaLibraryService.release` (dernière référence → suppression seulement si plus référencé nulle part) ou `MediaCleanupService`. Dans l'éditeur, les libérations sont différées jusqu'à la sortie (pour l'annulation).
**[risque]** les `refCount` des médias importés sont sous-estimés (d'où la vérification des références) ; un renommage d'évaluation ne renomme pas les ids des médias (ils restent valides) ; `deleteFileByProject`/`deleteAll` suppriment sans vérification — réservés à des actions confirmées.

## Formats d'échange — compatibilité GazePlay-Learning
- Export : `services/download/download.service.ts` ; import : `services/load-zip/load-zip.service.ts` ; libellés : `*ScreenConstKey` dans `shared/screenModel.ts`.
- **`.zip`** (Learning) : `<nom>/evalData.json`, `<nom>/evalInfo.json`, `images/`, `audio/`, `videos/` — sans paramètres globaux, `Name`, `hidden` ni ids IDB.
- **`.gpSave`** : même structure + `Name`, `hidden` et paramètres globaux (`buildGlobalParamsInfo` ↔ `parseGlobal*`).
- **`values[]` est positionnel** (index documentés en commentaire dans les templates de `modify-screen` et `global-*-screen`) ; l'export retire le `File` par `splice` (index 5 instruction, 11 stimuli).
- Valeurs exportées à conserver telles quelles : formats `Csv&Xlsx` / `Csv` / `Xlsx`, types de média `Image` / `Video` / `Texte` / `Son`, choix `Tout` / `BonneReponse`.
- **Interdit sans analyse de compatibilité préalable et tests d'aller-retour** : modifier libellés, clés JSON, index de `values[]` ou structure des archives.

## Préférences, responsive, accessibilité
- Préférences : locales (aucun serveur ni synchronisation), défauts si rien n'est enregistré, enregistrées à chaque modification, erreurs affichées (`UserPreferencesService.saveError`). Polices distantes chargées seulement si choisies.
- Responsive : aucune largeur minimale ; vérifié sans débordement à 320 px.
- Accessibilité : **cible** WCAG 2.2 AA, non déclarée conforme. État, vérifications faites et écarts : `docs/ACCESSIBILITE.md` (à tenir à jour).

## Règles
- Ne jamais supprimer, vider ou migrer de façon destructive des données utilisateur sans accord explicite.
- Ne pas affirmer qu'une commande, un test ou un comportement fonctionne sans l'avoir vérifié ; distinguer vérifié / déduit / à confirmer.
- Les consignes de l'utilisateur pour la session priment sur ce fichier.
