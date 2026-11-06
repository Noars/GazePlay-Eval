import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuideCreationComponent } from './guide-creation.component';
import { provideRouter } from '@angular/router';

describe('GuideCreationComponent', () => {
  let component: GuideCreationComponent;
  let fixture: ComponentFixture<GuideCreationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideCreationComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(GuideCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ne devrait pas scroller si sectionId est vide', () => {
    const scrollSpy = vi.spyOn(document, 'getElementById').mockReturnValue(null);
    component.sectionId = '';
    component.ngOnChanges();

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('ne devrait pas scroller si l\'élément cible n\'existe pas', async () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    component.sectionId = 'section-inexistante';
    component.ngOnChanges();

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(document.getElementById).toHaveBeenCalledWith('section-inexistante');
  });

  it('devrait scroller dans le conteneur guide-popup-body si présent', async () => {
    const mockContainer = document.createElement('div');
    mockContainer.classList.add('guide-popup-body');
    mockContainer.scrollTo = vi.fn().mockName('scrollTo');

    const mockTarget = document.createElement('div');
    mockTarget.id = 'info-eval';
    vi.spyOn(mockTarget, 'closest').mockReturnValue(mockContainer);
    document.body.appendChild(mockTarget);

    vi.spyOn(document, 'getElementById').mockReturnValue(mockTarget);

    component.sectionId = 'info-eval';
    component.ngOnChanges();

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(mockContainer.scrollTo).toHaveBeenCalled();
    document.body.removeChild(mockTarget);
  });

  it('devrait utiliser scrollIntoView si pas de conteneur guide-popup-body', async () => {
    const mockTarget = document.createElement('div');
    mockTarget.id = 'download-eval';
    mockTarget.scrollIntoView = vi.fn().mockName('scrollIntoView');
    vi.spyOn(mockTarget, 'closest').mockReturnValue(null);

    vi.spyOn(document, 'getElementById').mockReturnValue(mockTarget);

    component.sectionId = 'download-eval';
    component.ngOnChanges();

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(mockTarget.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );
  });
});
