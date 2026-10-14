import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {signal, WritableSignal} from '@angular/core';
import {MenuComponent} from './menu.component';
import {ImportFlowService} from '../../services/import-flow/import-flow.service';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;
  let importFlowSpy: jasmine.SpyObj<ImportFlowService>;
  let importing: WritableSignal<boolean>;

  async function create(mode: 'sidebar' | 'drawer'): Promise<void> {
    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    component.mode = mode;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    importing = signal(false);
    importFlowSpy = jasmine.createSpyObj('ImportFlowService', ['start'], {importing});
    importFlowSpy.start.and.returnValue(Promise.resolve(false));

    await TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [
        provideRouter([]),
        {provide: ImportFlowService, useValue: importFlowSpy},
      ]
    }).compileComponents();
  });

  it('devrait être créé', async () => {
    await create('sidebar');
    expect(component).toBeTruthy();
  });

  it('mode barre latérale → navigation avec de vrais liens (atteignables au clavier)', async () => {
    await create('sidebar');
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');
    const links = Array.from(nav.querySelectorAll('a')) as HTMLAnchorElement[];

    expect(nav.getAttribute('aria-label')).toBe('Navigation principale');
    expect(links.map(a => a.textContent?.trim())).toEqual(['Accueil', 'Guide', 'Options', 'Mes sauvegardes', 'Charger']);
    links.forEach(link => expect(link.getAttribute('href')).toBeTruthy());
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();
  });

  it('bouton « Importer un fichier » → délègue au parcours d\'import', async () => {
    await create('sidebar');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.gp-nav__link');
    button.click();
    expect(importFlowSpy.start).toHaveBeenCalled();
  });

  it('pendant un import → bouton désactivé avec indication', async () => {
    importing.set(true);
    await create('sidebar');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.gp-nav__link');
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Import en cours');
  });

  it('mode tiroir → <dialog> fermé par défaut, ouvert par open(), fermé par close()', async () => {
    await create('drawer');
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog.open).toBeFalse();

    component.open();
    expect(dialog.open).toBeTrue();

    component.close();
    expect(dialog.open).toBeFalse();
  });

  it('mode tiroir → clic sur le fond ferme le menu', async () => {
    await create('drawer');
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    component.open();

    component.onDrawerClick({target: dialog} as unknown as MouseEvent);

    expect(dialog.open).toBeFalse();
  });

  it('openImportPopup → ferme le tiroir avant d\'ouvrir l\'import', async () => {
    await create('drawer');
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    component.open();

    await component.openImportPopup();

    expect(dialog.open).toBeFalse();
    expect(importFlowSpy.start).toHaveBeenCalled();
  });
});
