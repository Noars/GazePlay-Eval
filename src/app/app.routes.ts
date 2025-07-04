import { Routes } from '@angular/router';
import {HomeComponent} from './pages/home/home.component';
import {InfoEvalComponent} from './pages/info-eval/info-eval.component';

export const routes: Routes = [
  {path: '', component: HomeComponent},
  {path: 'info-eval', component: InfoEvalComponent}
];
