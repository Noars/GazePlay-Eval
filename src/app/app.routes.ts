import { Routes } from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {InfoEvalComponent} from './pages/info-eval/info-eval.component';
import {InfoPatientComponent} from './pages/info-patient/info-patient.component';

export const routes: Routes = [
  {path: 'home', component: HomeComponent},
  {path: 'info-eval', component: InfoEvalComponent},
  {path: 'info-patient', component: InfoPatientComponent},
  {path: '', redirectTo: 'home', pathMatch: 'full',}
];
