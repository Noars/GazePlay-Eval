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
import {GuideOptionsComponent} from './pages/guide/guide-options/guide-options.component';
import {GuideDepannageComponent} from './pages/guide/guide-depannage/guide-depannage.component';

/**
 * Routes de l'application (routage par hash : `/#/home`).
 * Chaque route déclare un `title` : clé de traduction du titre du document (voir AppTitleStrategy).
 */
export const routes: Routes = [
  {path: 'home', component: HomeComponent, title: 'title.home'},
  {path: 'info-eval', component: InfoEvalComponent, title: 'title.infoEval'},
  {path: 'info-participant', component: InfoParticipantComponent, title: 'title.infoParticipant'},
  {path: 'setup-eval', component: SetupEvalComponent, title: 'title.setupEval'},
  {path: 'create-eval', component: CreateEvalComponent, title: 'title.createEval'},
  {path: 'download-eval', component: DownloadEvalComponent, title: 'title.downloadEval'},
  {path: 'sauvegarde', component: SauvegardeComponent, title: 'title.saves'},
  {path: 'load-save', component: LoadSaveComponent, title: 'title.load'},
  {path: 'option', component: OptionComponent, title: 'title.options'},
  {
    path: 'guide',
    component: GuideComponent,
    children: [
      {path: '', component: GuideHomeComponent, title: 'title.guide'},
      {path: 'creation', component: GuideCreationComponent, title: 'title.guideCreation'},
      {path: 'sauvegardes', component: GuideSauvegardeComponent, title: 'title.guideSaves'},
      {path: 'imports', component: GuideImportComponent, title: 'title.guideImport'},
      {path: 'options', component: GuideOptionsComponent, title: 'title.guideOptions'},
      {path: 'depannage', component: GuideDepannageComponent, title: 'title.guideHelp'},
    ]
  },
  {path: 'no-page', component: NoPage, title: 'title.notFound'},
  {path: '', redirectTo: 'home', pathMatch: 'full'},
  // Toute adresse inconnue mène à la page « introuvable » plutôt qu'à une page blanche.
  {path: '**', component: NoPage, title: 'title.notFound'},
];
