import {Routes} from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {InfoEvalComponent} from './pages/info-eval/info-eval.component';
import {InfoParticipantComponent} from './pages/info-participant/info-participant.component';
import {SetupEvalComponent} from './pages/setup-eval/setup-eval.component';
import {CreateEvalComponent} from './pages/create-eval/create-eval.component';
import {DownloadEvalComponent} from './pages/download-eval/download-eval.component';
import {SauvegardeComponent} from './pages/sauvegarde/sauvegarde.component';
import {LoadSaveComponent} from './pages/load-save/load-save.component';
import {NoPage} from './pages/no-page/no-page';
import {OptionComponent} from './pages/options/option.component';
import {GuideComponent} from './pages/guide/guide.component';
import {GuideHomeComponent} from './pages/guide/guide-home/guide-home.component';
import {GuideCreationComponent} from './pages/guide/guide-creation/guide-creation.component';
import {GuideImportComponent} from './pages/guide/guide-import/guide-import.component';
import {GuideSauvegardeComponent} from './pages/guide/guide-sauvegarde/guide-sauvegarde.component';

/**
 * Routes de l'application (routage par hash : `/#/home`).
 * Chaque route déclare un `title` utilisé pour le titre du document (voir AppTitleStrategy).
 */
export const routes: Routes = [
  {path: 'home', component: HomeComponent, title: 'Accueil'},
  {path: 'info-eval', component: InfoEvalComponent, title: 'Étape 1 · Informations de l\'évaluation'},
  {path: 'info-participant', component: InfoParticipantComponent, title: 'Étape 2 · Informations du participant'},
  {path: 'setup-eval', component: SetupEvalComponent, title: 'Étape 3 · Mode et paramètres'},
  {path: 'create-eval', component: CreateEvalComponent, title: 'Étape 4 · Création des écrans'},
  {path: 'download-eval', component: DownloadEvalComponent, title: 'Étape 5 · Téléchargement et export'},
  {path: 'sauvegarde', component: SauvegardeComponent, title: 'Mes sauvegardes'},
  {path: 'load-save', component: LoadSaveComponent, title: 'Charger une évaluation'},
  {path: 'option', component: OptionComponent, title: 'Options et accessibilité'},
  {
    path: 'guide',
    component: GuideComponent,
    children: [
      {path: '', component: GuideHomeComponent, title: 'Guide'},
      {path: 'creation', component: GuideCreationComponent, title: 'Guide · Création'},
      {path: 'sauvegardes', component: GuideSauvegardeComponent, title: 'Guide · Sauvegardes'},
      {path: 'imports', component: GuideImportComponent, title: 'Guide · Importation'},
    ]
  },
  {path: 'no-page', component: NoPage, title: 'Page introuvable'},
  {path: '', redirectTo: 'home', pathMatch: 'full'},
  // Toute adresse inconnue mène à la page « introuvable » plutôt qu'à une page blanche.
  {path: '**', component: NoPage, title: 'Page introuvable'},
];
