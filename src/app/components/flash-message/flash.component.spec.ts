import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlashComponent} from './flash.component';
import { FlashService } from '../../services/flash-message/flash.service';

describe('FlashComponent', () => {
  let component: FlashComponent;
  let fixture: ComponentFixture<FlashComponent>;


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlashComponent],
      providers: []
    })
      .compileComponents();

    fixture = TestBed.createComponent(FlashComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mapType(\'success\') → \'success\'', () => {
    expect(component.mapType('success')).toEqual('success');
  });

  it('mapType(\'error\') → \'danger\'', () => {
    expect(component.mapType('error')).toEqual('danger');
  });

  it('mapType(\'unknown\') → \'info\'', () => {
    expect(component.mapType('unknown')).toEqual('info');
  });

  it('mapIcon(\'success\') → \'bi-check-circle\'', () => {
    expect(component.mapIcon('success')).toEqual('bi-check-circle');
  });

  it('mapIcon(\'error\') → \'bi-x-circle\'', () => {
    expect(component.mapIcon('error')).toEqual('bi-x-circle');
  });

  it('mapIcon(\'unknown\') → \'bi-info-circle\'', () => {
    expect(component.mapIcon('unknown')).toEqual('bi-info-circle');
  });

  describe('type du message (« Erreur : »…)', () => {
    const root = document.documentElement;
    let previous: string | null;

    beforeEach(() => {
      previous = root.getAttribute('data-color-blind');
      TestBed.inject(FlashService).flashs.set([{id: 1, message: "Échec de l'import", type: 'error'}]);
      fixture.detectChanges();
    });

    afterEach(() => {
      if (previous === null) root.removeAttribute('data-color-blind');
      else root.setAttribute('data-color-blind', previous);
    });

    function typeLabel(): HTMLElement {
      return fixture.nativeElement.querySelector('.flash__type');
    }

    it("toujours présent pour les lecteurs d'écran", () => {
      expect(typeLabel().textContent).toContain('Erreur');
    });

    it('masqué visuellement hors mode daltonisme', () => {
      root.setAttribute('data-color-blind', 'false');
      expect(getComputedStyle(typeLabel()).position).toBe('absolute');
      expect(typeLabel().getBoundingClientRect().width).toBeLessThanOrEqual(1);
    });

    it('affiché en mode daltonisme, pour ne pas dépendre de la couleur', () => {
      root.setAttribute('data-color-blind', 'true');
      expect(getComputedStyle(typeLabel()).position).toBe('static');
      expect(typeLabel().getBoundingClientRect().width).toBeGreaterThan(1);
    });
  });
});
