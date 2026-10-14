# Accessibilité de GazePlay Eval

**Cible : WCAG 2.2 niveau AA.** L'application **n'est pas déclarée conforme** : aucun audit complet
(outil spécialisé, lecteurs d'écran, panel d'utilisateurs) n'a encore été réalisé. Ce document
distingue ce qui a été **mis en place**, ce qui a été **vérifié** (et comment), et les **écarts connus**.

Dernière mise à jour : ajout du mode daltonisme (octobre 2026).

## 1. Mis en place

| Domaine | Mesures |
|---|---|
| Structure | Repères `header`, `nav`, `main`, `footer` ; un seul `h1` par page ; titre de document unique par page (`app.routes.ts`, `AppTitleStrategy`) ; `lang="fr"`. |
| Navigation clavier | Lien d'évitement « Aller au contenu principal » ; tous les contrôles sont des `button`/`a` natifs ; après chaque navigation, le focus va sur le `h1` de la page (`RouteFocusService`). |
| Focus | Anneau de 3 px + halo, visible sur toutes les surfaces (`src/styles/_a11y.scss`), couleur dédiée par thème. |
| Formulaires | Libellés associés (`label for`), groupes de boutons radio nommés (`role="radiogroup"`), aides reliées par `aria-describedby`, erreurs signalées par texte + `aria-invalid` (composants `shared/ui`). |
| Aides contextuelles | Les icônes « i » à survoler (inaccessibles au clavier et au tactile) sont remplacées par des boutons « toggletip » (`HelpTipComponent`). |
| Glisser-déposer | Toujours disponible, avec une alternative par boutons « monter / descendre » (WCAG 2.5.7) pour les champs participant et les écrans. |
| Grille de stimuli | Cases = boutons nommés (« Case 4, ligne 2, colonne 2 : image chat.png, bonne réponse ») ; navigation aux flèches, Début, Fin ; Échap quitte un mode ; ajout de cases adjacentes possible depuis le panneau (alternative aux boutons « + » au survol) ; consignes de mode et résultats annoncés (`aria-live`). |
| Dialogues | Fenêtres Material (focus piégé, Échap, retour du focus) ; menu mobile et aide en `<dialog>` natifs modaux ; confirmation avant toute action destructrice. |
| Messages | Notifications dans des régions `status` / `alert` présentes en permanence ; type annoncé en texte (« Erreur : … ») ; durée réglable (0–30 s) ; erreurs affichées au moins 8 s. |
| Couleurs | Jetons de couleur calculés pour viser 4,5:1 (texte) et 3:1 (bordures de champs, éléments d'interface) ; thèmes clair, sombre, contraste renforcé ; prise en charge de `forced-colors`. |
| Mode daltonisme | Préférence « Mode daltonisme » (Options › Apparence, attribut `data-color-blind` sur `<html>`). Palette des états remappée sur l'axe bleu / cramoisi / ambre (succès bleu-cyan, erreur cramoisi, avertissement ambre, information neutre), choisie par simulation protanopie / deutéranopie / tritanopie (Machado 2009) : écart succès ↔ erreur en thème clair porté de ΔE 14 / 31 à 40 / 64 (protan / deutan). Indices non colorimétriques (WCAG 1.4.1) : liens soulignés, encadrés à bande pleine / tirets / double trait selon la gravité, symboles ✓ ! ✕ sur les badges, coche sur les choix sélectionnés, type des notifications affiché en texte, éléments désactivés en bordure tiretée, champs en erreur à bordure épaissie ; dans l'éditeur, case source en double bordure, case cible déjà remplie marquée « ! », outil actif souligné ; étape en cours entourée d'un anneau. Combinable avec les thèmes clair / sombre et le contraste renforcé (`src/styles/_tokens.scss`, `src/styles/_color-vision.scss`). |
| Préférences | Thème, contraste, mode daltonisme, police (dont Atkinson Hyperlegible, Lexend, Verdana), taille du texte (90 → 200 %), interligne, espacement des lettres et des mots (valeurs de WCAG 1.4.12), soulignement des liens, réduction des animations. |
| Responsive | Aucune largeur minimale imposée ; navigation en tiroir sous 992 px ; éditeur réorganisé en colonnes puis en pile ; cibles tactiles ≥ 24 px (40–44 px pour les actions principales). |
| Mouvement | `prefers-reduced-motion` respecté, et préférence « Animations réduites » dans l'application. |

## 2. Vérifié (et comment)

| Vérification | Méthode | Résultat |
|---|---|---|
| Noms accessibles des boutons et liens, libellés des champs, `alt` des images, unicité des `id`, références `aria-*` valides, sauts de niveaux de titres, un seul `h1` | Tests automatisés `src/app/testing/a11y-pages.spec.ts` sur toutes les pages, l'éditeur (3 types d'écran, panneau de case ouvert) et la structure (en-tête, menu, étapes). Le vérificateur est lui-même testé (`a11y-checks.spec.ts`). | Aucun problème détecté. |
| Absence de défilement horizontal à 320 px (WCAG 1.4.10) | Chrome headless, pages Accueil, étapes 1, 2, 4, 5, Sauvegardes, Options. | 0 px de débordement après correction de l'en-tête. |
| Rendu en thème clair, sombre, contraste renforcé avec texte à 150 % | Captures Chrome headless (1440 px, 1280 px, 390 px). | Mise en page conservée, focus visible. |
| Mode daltonisme | Tests unitaires (préférence, page Options, notifications) ; Chrome headless sur le build : activation / désactivation depuis la page Options, conservation après rechargement et au relancement du navigateur (IndexedDB réelle), captures des états (encadrés, badges, boutons, champs, notifications, fenêtre modale, étapes, grille de l'éditeur) en clair, sombre et contraste renforcé ; 320 px sans débordement. Contrastes des nouveaux jetons calculés (texte ≥ 4,5:1, indicateurs ≥ 3:1). | OK. Pas encore évalué par des personnes daltoniennes. |
| Comportement des composants accessibles (radiogroup, champ numérique, toggletip, sélecteur de fichier, confirmation) | Tests unitaires `src/app/shared/ui/ui-components.spec.ts`. | OK. |

> Ces contrôles automatisés couvrent une partie seulement des critères WCAG. L'outil axe-core
> n'a pas pu être ajouté (installation de dépendance refusée lors de la refonte).

## 3. Écarts connus et vérifications restantes

1. **Audit outillé à faire** : axe-core / Lighthouse / WAVE sur chaque page, dans les trois thèmes.
2. **Contrastes** : valeurs choisies par calcul ; à mesurer avec un outil sur les états survol, désactivé
   (opacité 0,55 — les éléments désactivés sont exemptés par WCAG mais doivent rester identifiables),
   badges et notifications.
3. **Lecteurs d'écran** : tests manuels à faire avec NVDA (Windows), VoiceOver (macOS/iOS) et TalkBack,
   en particulier la grille de stimuli, les annonces `aria-live` et les fenêtres de dialogue.
4. **Recadrage d'image** : le composant tiers `ngx-image-cropper` se manipule à la souris ou au doigt ;
   les champs Largeur / Hauteur offrent une alternative partielle (pas de déplacement du cadre au clavier).
5. **Glisser-déposer de fichiers** dans la fenêtre d'import : alternative « Parcourir… » disponible.
6. **Vidéo du guide** (YouTube) : sous-titres et transcription à vérifier côté vidéo.
7. **Polices distantes** (Atkinson Hyperlegible, Lexend, Roboto) : chargées depuis Google Fonts uniquement si
   l'utilisateur les choisit ; hors connexion, la police système de repli s'applique.
8. **Contenu des guides** : textes et captures d'écran du guide antérieurs à la refonte (images montrant
   l'ancienne interface) ; à mettre à jour.
9. **Zoom navigateur à 400 %** : vérifié indirectement via 320 px de large ; à confirmer manuellement.
10. **Mode daltonisme** : palette validée par simulation et calcul uniquement ; retour de personnes
    daltoniennes (protan, deutan, tritan) à recueillir. Avertissement et erreur restent proches pour un
    deutéranope (ΔE ≈ 25) : leur distinction repose aussi sur les icônes (triangle / octogone / croix) et
    les motifs. Les médias des évaluations (images des stimuli) ne sont pas modifiés.
11. **Préférences « Taille du texte » + zoom** : combinées, elles peuvent dépasser 400 % ; comportement à observer.
