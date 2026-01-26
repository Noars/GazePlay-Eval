import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {NavbarComponent} from './components/navbar/navbar.component';
import {filter} from 'rxjs';
import {CommonModule} from '@angular/common';
import {ProgressBarComponent} from './components/progress-bar/progress-bar.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, NavbarComponent, ProgressBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit{
  protected title = 'GazePlay-Eval';

  steps = ['Informations Evaluation','Date et heure', 'Informations Participant', 'Modes et Paramètres', 'Création et Modifications', 'Téléchargement et avis'];
  currentStepIndex = -1;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(event => {
      const url = (event as NavigationEnd).urlAfterRedirects;

      if (url.includes('/info-eval')) {
        this.currentStepIndex = 0;
      } else if (url.includes('/page-Thomas')) {
        this.currentStepIndex = 1;
      } else if (url.includes('/info-participant')) {
        this.currentStepIndex = 2;
      } else if (url.includes('/setup-eval')) {
        this.currentStepIndex = 3;
      } else if (url.includes('/create-eval')) {
        this.currentStepIndex = 4;
      } else if (url.includes('/download-eval')) {
        this.currentStepIndex = 5;
      } else {
        this.currentStepIndex = -1;
      }
    });
  }

  ngOnInit(): void {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const isReload = nav?.type === 'reload';

    if (isReload && this.router.url !== '/home') {
      this.router.navigate(['/home']);
    }
  }
}
