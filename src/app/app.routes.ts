import { Routes } from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {InfoEvalComponent} from './pages/info-eval/info-eval.component';
import {InfoParticipantComponent} from './pages/info-participant/info-participant.component';
import {SetupEvalComponent} from './pages/setup-eval/setup-eval.component';
import {CreateEvalComponent} from './pages/create-eval/create-eval.component';
import {DownloadEvalComponent} from './pages/download-eval/download-eval.component';
import {NewpageComponent} from './pages/newpage/newpage.component';

export const routes: Routes = [
  {path: 'home', component: HomeComponent},
  {path: 'info-eval', component: InfoEvalComponent},
  {path: 'new-page', component: NewpageComponent}, // Ajout du chemin pour la nouvelle page
  {path: 'info-participant', component: InfoParticipantComponent},
  {path: 'setup-eval', component: SetupEvalComponent},
  {path: 'create-eval', component: CreateEvalComponent},
  {path: 'download-eval', component: DownloadEvalComponent},
  {path: '', redirectTo: 'home', pathMatch: 'full',}
];
