import {ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, inject, Input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {uniqueId} from '../unique-id';
import {TranslationKey} from '../../../core/i18n/i18n.service';
import {TranslatePipe} from '../../../core/i18n/translate.pipe';

/**
 * Choix proposé : `labelKey` (clé de traduction) est prioritaire sur `label` (texte
 * affiché tel quel, par exemple « 115 % »). Seule `value` est émise et enregistrée.
 */
export interface ChoiceOption<T = unknown> {
  value: T;
  label?: string;
  labelKey?: TranslationKey;
  /** Langue du libellé lorsqu'elle diffère de celle de la page (ex. « English »). */
  lang?: string;
}

/** Options Oui / Non utilisées par défaut. */
export const YES_NO_OPTIONS: ChoiceOption<boolean>[] = [
  {value: true, labelKey: 'common.yes'},
  {value: false, labelKey: 'common.no'},
];

/**
 * Ligne de réglage « question → choix exclusif » (contrôle segmenté de boutons radio).
 *
 * Compatible `ngModel` : la valeur émise est exactement la `value` de l'option choisie
 * (booléen pour Oui/Non, chaîne pour les autres choix), ce qui préserve le contenu des
 * tableaux `values[]` des écrans.
 *
 * Accessibilité : groupe `role="radiogroup"` nommé par la question, vrais boutons radio
 * natifs (navigation aux flèches, annonce de l'état), aide reliée par `aria-describedby`.
 */
@Component({
  selector: 'app-choice-setting',
  templateUrl: './choice-setting.component.html',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ChoiceSettingComponent),
    multi: true,
  }],
})
export class ChoiceSettingComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);

  /** Question affichée (nom accessible du groupe). */
  @Input({required: true}) label = '';
  /** Texte d'aide facultatif affiché sous la question. */
  @Input() hint = '';
  @Input() options: ChoiceOption[] = YES_NO_OPTIONS;
  /** Affiche la question au-dessus des choix plutôt qu'à côté. */
  @Input() stacked = false;

  protected readonly groupName = uniqueId('choice');
  protected readonly labelId = `${this.groupName}-label`;
  protected readonly hintId = `${this.groupName}-hint`;

  protected value: unknown = null;
  protected disabled = false;

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: unknown): void {
    this.value = value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  protected select(option: ChoiceOption): void {
    this.value = option.value;
    this.onChange(option.value);
  }

  protected touch(): void {
    this.onTouched();
  }

  protected optionId(index: number): string {
    return `${this.groupName}-${index}`;
  }
}
