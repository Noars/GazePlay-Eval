import {Component, computed, inject} from '@angular/core';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {FlashService} from '../../services/flash-message/flash.service';
import {IndexedDBService} from '../../services/indexedDB/indexed-db.service';
import {UserPreferencesService} from '../../core/preferences/user-preferences.service';
import {
  ContrastPreference,
  FONT_DEFINITIONS,
  FontPreference,
  LANGUAGES,
  LanguagePreference,
  LETTER_SPACING_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  MotionPreference,
  TEXT_SCALE_OPTIONS,
  ThemePreference,
  UserPreferences,
  WORD_SPACING_OPTIONS,
} from '../../core/preferences/user-preferences.model';
import {MediaCleanupService} from '../../core/media/media-cleanup.service';
import {ConfirmService} from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import {ChoiceOption, ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';
import {I18nService, TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Page « Options et accessibilité ».
 *
 * Chaque modification est appliquée immédiatement et enregistrée dans IndexedDB par
 * `UserPreferencesService` (aucun bouton « Enregistrer » à ne pas oublier).
 */
@Component({
  selector: 'app-option',
  standalone: true,
  imports: [FormsModule, ChoiceSettingComponent, TranslatePipe],
  templateUrl: './option.component.html',
  styleUrl: './option.component.css'
})
export class OptionComponent {
  private readonly router = inject(Router);
  protected readonly preferencesService = inject(UserPreferencesService);
  readonly flashService = inject(FlashService);
  private readonly indexedDBService = inject(IndexedDBService);
  private readonly mediaCleanup = inject(MediaCleanupService);
  private readonly confirmService = inject(ConfirmService);
  private readonly i18n = inject(I18nService);

  readonly prefs = this.preferencesService.preferences;
  readonly fonts = FONT_DEFINITIONS;
  readonly selectedFont = computed(() => this.fonts.find(font => font.id === this.prefs().font) ?? this.fonts[0]);

  /** Chaque langue est nommée dans sa propre langue. */
  readonly languageOptions: ChoiceOption<LanguagePreference>[] = LANGUAGES.map(value => ({
    value,
    labelKey: `language.${value}` as TranslationKey,
    lang: value,
  }));
  readonly themeOptions: ChoiceOption<ThemePreference>[] = [
    {value: 'system', labelKey: 'options.theme.system'},
    {value: 'light', labelKey: 'options.theme.light'},
    {value: 'dark', labelKey: 'options.theme.dark'},
  ];
  readonly contrastOptions: ChoiceOption<ContrastPreference>[] = [
    {value: 'standard', labelKey: 'options.contrast.standard'},
    {value: 'high', labelKey: 'options.contrast.high'},
  ];
  readonly motionOptions: ChoiceOption<MotionPreference>[] = [
    {value: 'system', labelKey: 'options.motion.system'},
    {value: 'reduce', labelKey: 'options.motion.reduce'},
  ];
  readonly textScaleOptions = TEXT_SCALE_OPTIONS.map(value => ({value, label: `${value} %`}));
  readonly lineHeightOptions: ChoiceOption<number>[] = LINE_HEIGHT_OPTIONS.map((value, i) => ({
    value,
    labelKey: (['options.spacing.normal', 'options.lineHeight.airy', 'options.lineHeight.veryAiry'] as const)[i],
  }));
  readonly letterSpacingOptions: ChoiceOption<number>[] = LETTER_SPACING_OPTIONS.map((value, i) => ({
    value,
    labelKey: (['options.spacing.normal', 'options.spacing.wide', 'options.spacing.veryWide'] as const)[i],
  }));
  readonly wordSpacingOptions: ChoiceOption<number>[] = WORD_SPACING_OPTIONS.map((value, i) => ({
    value,
    labelKey: (['options.spacing.normal', 'options.spacing.wide', 'options.spacing.veryWide'] as const)[i],
  }));

  /** Nettoyage ou suppression de médias en cours. */
  storageBusy = false;

  /** Applique et enregistre une préférence. */
  async set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void> {
    await this.preferencesService.update({[key]: value} as Partial<UserPreferences>);
  }

  /** Clé de traduction de la description d'une police. */
  fontDescriptionKey(id: FontPreference): TranslationKey {
    return `options.font.${id}.desc` as TranslationKey;
  }

  setFont(value: string): void {
    void this.set('font', value as FontPreference);
  }

  setMessageDuration(raw: string | number): void {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    void this.set('messageDuration', Math.min(30, Math.max(0, value)));
  }

  testMessage(): void {
    this.flashService.show('info', this.i18n.t('options.duration.testMessage'));
  }

  async resetPreferences(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: this.i18n.t('options.reset.confirmTitle'),
      message: this.i18n.t('options.reset.confirmMessage'),
      confirmLabel: this.i18n.t('options.reset.confirmLabel'),
    });
    if (!confirmed) return;
    const ok = await this.preferencesService.reset();
    this.flashService.show(ok ? 'success' : 'warning', ok
      ? this.i18n.t('options.reset.done')
      : this.i18n.t('options.reset.notSaved'), 4000);
  }

  /** Supprime uniquement les médias qui ne sont utilisés par aucune évaluation. */
  async cleanupUnusedMedia(): Promise<void> {
    this.storageBusy = true;
    try {
      const count = await this.mediaCleanup.cleanupAll();
      this.flashService.show('success', count === 0
        ? this.i18n.t('options.cleanup.none')
        : this.i18n.t('options.cleanup.done', {count}), 4000);
    } catch (e) {
      this.flashService.show('error', this.i18n.t('options.cleanup.error'));
    } finally {
      this.storageBusy = false;
    }
  }

  /**
   * Supprime **tous** les médias enregistrés, après confirmation explicite : les évaluations
   * sauvegardées perdent alors leurs images, sons et vidéos.
   */
  async emptyDB(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: this.i18n.t('options.deleteAll.confirmTitle'),
      message: [
        this.i18n.t('options.deleteAll.confirm1'),
        this.i18n.t('options.deleteAll.confirm2'),
      ],
      confirmLabel: this.i18n.t('options.deleteAll.button'),
      tone: 'danger',
    });
    if (!confirmed) return;

    this.storageBusy = true;
    try {
      await this.indexedDBService.deleteAll();
      this.flashService.show('success', this.i18n.t('options.deleteAll.done'), 4000);
    } catch (e) {
      this.flashService.show('error', this.i18n.t('options.deleteAll.error'));
    } finally {
      this.storageBusy = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
