import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  forwardRef,
  inject,
  Input,
  ViewChild
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {uniqueId} from '../unique-id';

/**
 * Ligne de réglage numérique (« Combien de temps ? [10] secondes »), compatible `ngModel`.
 *
 * - Le libellé est relié au champ (`<label for>`), l'unité et l'aide via `aria-describedby`.
 * - Une valeur hors bornes est signalée (texte + `aria-invalid`) sans être corrigée
 *   automatiquement : la valeur saisie est transmise telle quelle, comme auparavant.
 * - Un champ vidé émet `null` (comportement natif de `ngModel` sur `type="number"`).
 */
@Component({
  selector: 'app-number-setting',
  templateUrl: './number-setting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => NumberSettingComponent),
    multi: true,
  }],
})
export class NumberSettingComponent implements ControlValueAccessor, AfterViewInit {
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('input', {static: true}) private input!: ElementRef<HTMLInputElement>;

  @Input({required: true}) label = '';
  @Input() hint = '';
  /** Unité affichée après le champ (ex. « secondes »). */
  @Input() unit = '';
  @Input() min: number | null = null;
  @Input() max: number | null = null;
  @Input() step: number | string = 1;

  protected readonly inputId = uniqueId('number');
  protected readonly hintId = `${this.inputId}-hint`;
  protected readonly unitId = `${this.inputId}-unit`;
  protected readonly errorId = `${this.inputId}-error`;

  protected value: number | null = null;
  protected disabled = false;

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngAfterViewInit(): void {
    this.syncInput();
  }

  writeValue(value: unknown): void {
    this.value = value === null || value === undefined || value === '' ? null : Number(value);
    this.syncInput();
    this.cdr.markForCheck();
  }

  /**
   * Le champ est mis à jour impérativement (et non par liaison `[value]`) pour ne jamais
   * réécrire ce que l'utilisateur est en train de taper (ex. « 1, » transitoirement invalide).
   */
  private syncInput(): void {
    if (this.input) {
      this.input.nativeElement.value = this.value === null || Number.isNaN(this.value) ? '' : String(this.value);
    }
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  protected onInput(raw: string): void {
    this.value = raw === '' ? null : Number(raw);
    this.onChange(this.value);
  }

  protected touch(): void {
    this.onTouched();
  }

  /** Message d'erreur à afficher, ou chaîne vide si la valeur est acceptable. */
  protected get error(): string {
    if (this.value === null || Number.isNaN(this.value)) {
      return 'Veuillez saisir un nombre.';
    }
    if (this.min !== null && this.value < this.min) {
      return `La valeur minimale est ${this.min}.`;
    }
    if (this.max !== null && this.value > this.max) {
      return `La valeur maximale est ${this.max}.`;
    }
    return '';
  }

  protected get describedBy(): string | null {
    const ids = [
      this.unit ? this.unitId : '',
      this.hint ? this.hintId : '',
      this.error ? this.errorId : '',
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }
}
