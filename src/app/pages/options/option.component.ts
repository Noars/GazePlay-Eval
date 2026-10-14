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
import {ChoiceSettingComponent} from '../../shared/ui/choice-setting/choice-setting.component';

/**
 * Page « Options et accessibilité ».
 *
 * Chaque modification est appliquée immédiatement et enregistrée dans IndexedDB par
 * `UserPreferencesService` (aucun bouton « Enregistrer » à ne pas oublier).
 */
@Component({
  selector: 'app-option',
  standalone: true,
  imports: [FormsModule, ChoiceSettingComponent],
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

  readonly prefs = this.preferencesService.preferences;
  readonly fonts = FONT_DEFINITIONS;
  readonly selectedFont = computed(() => this.fonts.find(font => font.id === this.prefs().font) ?? this.fonts[0]);

  readonly themeOptions = [
    {value: 'system' as ThemePreference, label: 'Système'},
    {value: 'light' as ThemePreference, label: 'Clair'},
    {value: 'dark' as ThemePreference, label: 'Sombre'},
  ];
  readonly contrastOptions = [
    {value: 'standard' as ContrastPreference, label: 'Standard'},
    {value: 'high' as ContrastPreference, label: 'Renforcé'},
  ];
  readonly motionOptions = [
    {value: 'system' as MotionPreference, label: 'Comme le système'},
    {value: 'reduce' as MotionPreference, label: 'Réduites'},
  ];
  readonly textScaleOptions = TEXT_SCALE_OPTIONS.map(value => ({value, label: `${value} %`}));
  readonly lineHeightOptions = LINE_HEIGHT_OPTIONS.map((value, i) => ({value, label: ['Normal', 'Aéré', 'Très aéré'][i]}));
  readonly letterSpacingOptions = LETTER_SPACING_OPTIONS.map((value, i) => ({value, label: ['Normal', 'Large', 'Très large'][i]}));
  readonly wordSpacingOptions = WORD_SPACING_OPTIONS.map((value, i) => ({value, label: ['Normal', 'Large', 'Très large'][i]}));

  /** Nettoyage ou suppression de médias en cours. */
  storageBusy = false;

  /** Applique et enregistre une préférence. */
  async set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): Promise<void> {
    await this.preferencesService.update({[key]: value} as Partial<UserPreferences>);
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
    this.flashService.show('info', 'Ceci est un message de test.');
  }

  async resetPreferences(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Rétablir l\'affichage par défaut ?',
      message: 'Le thème, le contraste, le mode daltonisme, la police, la taille du texte, les espacements et la durée des messages reprendront leurs valeurs par défaut.',
      confirmLabel: 'Rétablir',
    });
    if (!confirmed) return;
    const ok = await this.preferencesService.reset();
    this.flashService.show(ok ? 'success' : 'warning', ok
      ? 'Les préférences par défaut ont été rétablies.'
      : 'Les préférences par défaut sont appliquées mais n\'ont pas pu être enregistrées.', 4000);
  }

  /** Supprime uniquement les médias qui ne sont utilisés par aucune évaluation. */
  async cleanupUnusedMedia(): Promise<void> {
    this.storageBusy = true;
    try {
      const count = await this.mediaCleanup.cleanupAll();
      this.flashService.show('success', count === 0
        ? 'Aucun fichier inutilisé : rien à supprimer.'
        : `${count} fichier(s) inutilisé(s) supprimé(s).`, 4000);
    } catch (e) {
      this.flashService.show('error', 'Une erreur est survenue lors du nettoyage des fichiers.');
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
      title: 'Supprimer tous les fichiers médias ?',
      message: [
        'Toutes les images, tous les sons et toutes les vidéos enregistrés dans ce navigateur seront définitivement supprimés.',
        'Vos évaluations sauvegardées seront conservées mais n\'auront plus leurs médias : il faudra les ajouter à nouveau ou réimporter un fichier .gpSave.',
      ],
      confirmLabel: 'Tout supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;

    this.storageBusy = true;
    try {
      await this.indexedDBService.deleteAll();
      this.flashService.show('success', 'Les fichiers ont été supprimés avec succès.', 4000);
    } catch (e) {
      this.flashService.show('error', 'Une erreur est survenue lors de la suppression des fichiers.');
    } finally {
      this.storageBusy = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
