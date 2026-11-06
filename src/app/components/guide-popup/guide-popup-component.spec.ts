import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GuidePopupComponent } from './guide-popup-component';

describe('GuidePopupComponent', () => {
  let component: GuidePopupComponent;
  let fixture: ComponentFixture<GuidePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidePopupComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(GuidePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('close() → émet l\'événement closed', () => {
    const emitSpy = vi.spyOn(component.closed, 'emit').mockImplementation(() => undefined);
    component.close();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('startResize() → passe isResizing à true et appelle preventDefault', () => {
    const mockEvent = new MouseEvent('mousedown');
    vi.spyOn(mockEvent, 'preventDefault').mockImplementation(() => undefined);
    component.startResize(mockEvent);
    expect(component.isResizing).toBe(true);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('resize() → met à jour panelWidth si isResizing est true', () => {
    component.isResizing = true;
    const mockEvent = { clientX: window.innerWidth - 500 } as MouseEvent;
    component.resize(mockEvent);
    expect(component.panelWidth).toBe(500);
  });

  it('resize() → ne met pas à jour panelWidth si isResizing est false', () => {
    component.isResizing = false;
    const initialWidth = component.panelWidth;
    const mockEvent = { clientX: window.innerWidth - 999 } as MouseEvent;
    component.resize(mockEvent);
    expect(component.panelWidth).toBe(initialWidth);
  });

  it('resize() → respecte la largeur minimale', () => {
    component.isResizing = true;
    const mockEvent = { clientX: window.innerWidth - 1 } as MouseEvent; // newWidth = 1, sous le min
    component.resize(mockEvent);
    expect(component.panelWidth).toBe(280);
  });

  it('resize() → respecte la largeur maximale (90% de la fenêtre)', () => {
    component.isResizing = true;
    const mockEvent = { clientX: 0 } as MouseEvent; // newWidth = innerWidth, au dessus du max
    component.resize(mockEvent);
    expect(component.panelWidth).toBe(Math.round(window.innerWidth * 0.9));
  });

  it("onResizeKey() → flèche gauche élargit, flèche droite rétrécit (alternative clavier)", () => {
    component.panelWidth = 440;
    component.onResizeKey(new KeyboardEvent('keydown', {key: 'ArrowLeft'}));
    expect(component.panelWidth).toBe(480);
    component.onResizeKey(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    component.onResizeKey(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
    expect(component.panelWidth).toBe(400);
  });

  it("ouverture → <dialog> modal ouvert ; fermeture → événement closed", () => {
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    const closed = vi.spyOn(component.closed, 'emit').mockImplementation(() => undefined);

    component.isOpen = true;
    component.ngOnChanges({isOpen: {currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false}});
    expect(dialog.open).toBe(true);

    component.close();
    dialog.dispatchEvent(new Event('close'));
    expect(dialog.open).toBe(false);
    expect(closed).toHaveBeenCalled();
  });

  it('guide fermé pendant un redimensionnement → écouteurs du document retirés', () => {
    component.startResize(new MouseEvent('mousedown'));
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    fixture.destroy();

    expect(removeSpy).toHaveBeenCalledWith('pointermove', component.resize);
    expect(removeSpy).toHaveBeenCalledWith('pointerup', component.stopResize);
  });

  it('stopResize() → passe isResizing à false', () => {
    component.isResizing = true;
    component.stopResize();
    expect(component.isResizing).toBe(false);
  });

  it('currentGuideInputs() → retourne le segment courant comme sectionId', () => {
    vi.spyOn(component.router, 'url', 'get').mockReturnValue('/info-eval');
    expect(component.currentGuideInputs).toStrictEqual({ sectionId: 'info-eval' });
  });
});
