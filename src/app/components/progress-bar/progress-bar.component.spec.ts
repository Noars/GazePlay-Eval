import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {ProgressBarComponent} from './progress-bar.component';
import {SaveService} from '../../services/save/save.service';

describe('ProgressBarComponent', () => {
  let component: ProgressBarComponent;
  let fixture: ComponentFixture<ProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressBarComponent],
      providers: [provideRouter([]), {provide: SaveService, useValue: {getEvalName: () => 'Couleurs'}}]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressBarComponent);
    component = fixture.componentInstance;
    component.steps = ['Infos', 'Participant', 'Mode', 'Écrans', 'Export'];
    component.currentStepIndex = 2;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le nom de l\'évaluation', () => {
    expect(fixture.nativeElement.textContent).toContain('Couleurs');
  });

  it('étape courante signalée par aria-current="step"', () => {
    const current = fixture.nativeElement.querySelector('[aria-current="step"]');
    expect(current.textContent).toContain('Mode');
  });

  it('étapes terminées = liens vers leur page ; étapes à venir non cliquables', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('.stepper__list a') as NodeListOf<HTMLAnchorElement>);
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toContain('info-eval');
    expect(links[1].getAttribute('href')).toContain('info-participant');
  });

  it('progressPercent → proportion de l\'étape courante', () => {
    expect(component.progressPercent).toBe(50);
    component.currentStepIndex = 4;
    expect(component.progressPercent).toBe(100);
  });

  it('version compacte : « Étape 3 sur 5 »', () => {
    expect(fixture.nativeElement.querySelector('.stepper__compact').textContent).toContain('Étape 3 sur 5');
  });
});
