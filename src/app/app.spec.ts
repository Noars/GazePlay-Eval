import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Router, NavigationEnd, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';
import { CommonModule } from '@angular/common';

describe('App Component (Angular 20)', () => {
  let component: App;
  let fixture: any;
  let routerEvents$: Subject<any>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerEvents$ = new Subject();

    router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      events: routerEvents$.asObservable()
    });

    await TestBed.configureTestingModule({
      imports: [CommonModule, NavbarComponent, ProgressBarComponent],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: router }
      ],
      declarations: [App]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devrait être créé', () => {
    expect(component).toBeTruthy();
  });

  it('devrait avoir le titre "GazePlay-Eval"', () => {
    expect(component['title']).toBe('GazePlay-Eval');
  });

  it('devrait mettre à jour currentStepIndex selon l’URL', () => {
    const event = new NavigationEnd(1, '/setup-eval', '/setup-eval');
    routerEvents$.next(event);
    expect(component.currentStepIndex).toBe(2);
  });

  it('devrait retourner à /home en cas de rechargement hors /home', () => {
    spyOn(performance, 'getEntriesByType').and.returnValue([
      { type: 'reload' } as PerformanceNavigationTiming
    ]);
    spyOnProperty(router, 'url', 'get').and.returnValue('/create-eval');
    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('ne devrait pas afficher la barre de progression si currentStepIndex = -1', () => {
    component.currentStepIndex = -1;
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('app-progress-bar');
    expect(progressBar).toBeNull();
  });

  it('devrait afficher la barre de progression si currentStepIndex >= 0', () => {
    component.currentStepIndex = 3;
    fixture.detectChanges();

    const progressBar = fixture.nativeElement.querySelector('app-progress-bar');
    expect(progressBar).not.toBeNull();
  });
});
