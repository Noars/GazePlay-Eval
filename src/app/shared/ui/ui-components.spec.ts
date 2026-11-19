import {Component} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ChoiceSettingComponent} from './choice-setting/choice-setting.component';
import {NumberSettingComponent} from './number-setting/number-setting.component';
import {HelpTipComponent} from './help-tip/help-tip.component';
import {FilePickerComponent} from './file-picker/file-picker.component';
import {ConfirmDialogComponent} from './confirm-dialog/confirm-dialog.component';
import type {Mocked} from 'vitest';
import {createSpyObj} from '../../testing/spy-obj';

@Component({
  imports: [FormsModule, ChoiceSettingComponent, NumberSettingComponent, HelpTipComponent, FilePickerComponent],
  template: `
    <app-choice-setting label="Afficher une croix ?" hint="Aide" [(ngModel)]="values[0]"></app-choice-setting>
    <app-choice-setting label="Choix" [options]="options" [(ngModel)]="values[1]"></app-choice-setting>
    <app-number-setting label="Durée" unit="secondes" [min]="1" [max]="10" [(ngModel)]="values[2]"></app-number-setting>
    <app-help-tip topic="durée" text="Texte d'aide"></app-help-tip>
    <app-file-picker label="Choisir une image" accept="image/*" [fileName]="fileName" (fileSelected)="selected = $event"></app-file-picker>
  `,
})
class HostComponent {
  values: any[] = [true, 'Tout', 5];
  options = [{value: 'Tout', label: 'Tout'}, {value: 'BonneReponse', label: 'Bonnes réponses'}];
  fileName = '';
  selected: File | null = null;
}

describe('Composants de formulaire partagés', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [HostComponent]}).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  // ─── Choix ─────────────────────────────────────────────────────────────────

  it('choice-setting → groupe radio nommé par la question et décrit par l\'aide', () => {
    const group = el.querySelector('[role="radiogroup"]')!;
    const labelId = group.getAttribute('aria-labelledby')!;
    expect(el.querySelector('#' + labelId)?.textContent).toContain('Afficher une croix ?');
    expect(el.querySelector('#' + group.getAttribute('aria-describedby'))?.textContent).toContain('Aide');
  });

  it('choice-setting → reflète la valeur et émet exactement la valeur de l\'option (booléen)', () => {
    const radios = el.querySelectorAll('app-choice-setting')[0].querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    expect(radios[0].checked).toBe(true);

    radios[1].click();
    fixture.detectChanges();

    expect(host.values[0]).toBe(false);
  });

  it('choice-setting → options personnalisées (chaînes) conservées telles quelles', () => {
    const radios = el.querySelectorAll('app-choice-setting')[1].querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    radios[1].click();
    expect(host.values[1]).toBe('BonneReponse');
  });

  it('choice-setting → chaque bouton radio a un libellé associé, noms de groupe uniques', () => {
    const radios = Array.from(el.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>);
    radios.forEach(radio => expect(el.querySelector(`label[for="${radio.id}"]`)).not.toBeNull());
    const groupNames = new Set(radios.map(r => r.name));
    expect(groupNames.size).toBe(2);
  });

  // ─── Nombre ────────────────────────────────────────────────────────────────

  it('number-setting → libellé associé, unité décrite, valeur affichée', () => {
    const input = el.querySelector('app-number-setting input') as HTMLInputElement;
    expect(el.querySelector(`label[for="${input.id}"]`)?.textContent).toContain('Durée');
    expect(input.getAttribute('aria-describedby')).toContain('unit');
    expect(input.value).toBe('5');
  });

  it('number-setting → saisie émise en nombre', () => {
    const input = el.querySelector('app-number-setting input') as HTMLInputElement;
    input.value = '7.5';
    input.dispatchEvent(new Event('input'));
    expect(host.values[2]).toBe(7.5);
  });

  it('number-setting → valeur hors bornes signalée (aria-invalid + message), valeur transmise inchangée', () => {
    const input = el.querySelector('app-number-setting input') as HTMLInputElement;
    input.value = '42';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.values[2]).toBe(42);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('app-number-setting .gp-field__error')?.textContent).toContain('10');
  });

  it('number-setting → champ vidé émet null', () => {
    const input = el.querySelector('app-number-setting input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(host.values[2]).toBeNull();
  });

  // ─── Aide contextuelle ─────────────────────────────────────────────────────

  it('help-tip → bouton nommé, ouvre et ferme la bulle (clic, Échap)', () => {
    const button = el.querySelector('app-help-tip button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Aide : durée');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('app-help-tip [role="status"]')?.textContent).toContain("Texte d'aide");

    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  // ─── Sélection de fichier ──────────────────────────────────────────────────

  it('file-picker → champ fichier natif focalisable et nommé, nom du fichier actuel annoncé', () => {
    const input = el.querySelector('app-file-picker input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('aria-label')).toBe('Choisir une image');
    expect(input.accept).toBe('image/*');

    host.fileName = 'chat.png';
    fixture.detectChanges();
    expect(input.getAttribute('aria-label')).toBe('Choisir une image (fichier actuel : chat.png)');
  });

  it('file-picker → émet le fichier choisi', () => {
    const input = el.querySelector('app-file-picker input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'chat.png');
    Object.defineProperty(input, 'files', {value: [file], configurable: true});
    input.dispatchEvent(new Event('change'));
    expect(host.selected).toBe(file);
  });
});

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRef: Mocked<MatDialogRef<ConfirmDialogComponent>>;

  beforeEach(async () => {
    dialogRef = createSpyObj('MatDialogRef', ['close']);
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        {provide: MatDialogRef, useValue: dialogRef},
        {provide: MAT_DIALOG_DATA, useValue: {title: 'Supprimer ?', message: ['Ligne 1', 'Ligne 2'], confirmLabel: 'Supprimer', tone: 'danger'}},
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
  });

  it('affiche le titre, chaque paragraphe et un bouton de confirmation « danger »', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#confirm-dialog-title')?.textContent).toContain('Supprimer ?');
    expect(el.querySelectorAll('#confirm-dialog-message p').length).toBe(2);
    expect(el.querySelector('.js-confirm')?.classList).toContain('gp-btn--danger');
  });

  it('Annuler → false, Confirmer → true', () => {
    (fixture.nativeElement.querySelector('.js-cancel') as HTMLButtonElement).click();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
    (fixture.nativeElement.querySelector('.js-confirm') as HTMLButtonElement).click();
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });
});
