import {Component, ElementRef, OnInit, QueryList, ViewChildren} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CdkDragDrop, DragDropModule, moveItemInArray} from '@angular/cdk/drag-drop';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {saveModelDefault} from '../../shared/saveModel';
import {HelpTipComponent} from '../../shared/ui/help-tip/help-tip.component';
import {I18nService, TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/**
 * Étape 2 : champs d'information sur la personne évaluée (nom, âge…), dans l'ordre où ils
 * seront demandés dans GazePlay-Learning.
 *
 * Le réordonnancement est possible par glisser-déposer ou par les boutons « monter » /
 * « descendre » (alternative clavier et tactile au glisser-déposer).
 */
@Component({
  selector: 'app-info-participant',
  imports: [FormsModule, DragDropModule, HelpTipComponent, TranslatePipe],
  templateUrl: './info-participant.component.html',
  standalone: true,
  styleUrl: './info-participant.component.scss'
})
export class InfoParticipantComponent implements OnInit{
  @ViewChildren('fieldInput') private fieldInputs!: QueryList<ElementRef<HTMLInputElement>>;

  infoParticipantList: string[] = saveModelDefault.infoParticipant;

  /** Message annoncé aux lecteurs d'écran après un déplacement ou une suppression. */
  announcement = '';

  /**
   * Suggestions de champs, dans la langue de l'interface : le texte choisi est inséré tel
   * quel dans l'évaluation (c'est une donnée, il n'est plus traduit ensuite).
   */
  private readonly suggestionKeys: TranslationKey[] = [
    'infoParticipant.suggestion.lastName',
    'infoParticipant.suggestion.firstName',
    'infoParticipant.suggestion.age',
    'infoParticipant.suggestion.class',
    'infoParticipant.suggestion.birthDate',
  ];

  constructor(private router: Router,
              private saveService: SaveService,
              private i18n: I18nService) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.infoParticipantList,
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.saveService.dataAuto.listScreens,
      this.saveService.dataAuto.step);
  }

  loadData(){
    this.infoParticipantList = this.saveService.dataAuto.infoParticipant;
  }

  /** Ajoute un champ (vide ou pré-rempli) et place le focus dessus. */
  addField(value: string = '') {
    this.infoParticipantList.push(value);
    this.focusField(this.infoParticipantList.length - 1);
  }

  /** Suggestions non encore présentes dans la liste. */
  availableSuggestions(): string[] {
    const existing = new Set(this.infoParticipantList.map(field => field.trim().toLowerCase()));
    return this.suggestionKeys
      .map(key => this.i18n.t(key))
      .filter(s => !existing.has(s.toLowerCase()));
  }

  removeField(index: number) {
    const label = this.infoParticipantList[index] || this.i18n.t('infoParticipant.field.fallback', {n: index + 1});
    this.infoParticipantList.splice(index, 1);
    this.announcement = this.i18n.t('infoParticipant.removed', {label});
    if (this.infoParticipantList.length > 0) {
      this.focusField(Math.min(index, this.infoParticipantList.length - 1));
    }
  }

  drop(event: CdkDragDrop<string[]> | {previousIndex: number, currentIndex: number}) {
    moveItemInArray(this.infoParticipantList, event.previousIndex, event.currentIndex);
  }

  /**
   * Déplace un champ d'une position vers le haut (-1) ou le bas (+1).
   * Le focus reste sur le bouton utilisé, au nouvel emplacement du champ.
   */
  moveField(index: number, delta: -1 | 1, buttonClass: 'up' | 'down') {
    const target = index + delta;
    if (target < 0 || target >= this.infoParticipantList.length) return;
    moveItemInArray(this.infoParticipantList, index, target);
    const label = this.infoParticipantList[target] || this.i18n.t('infoParticipant.field.fallback', {n: index + 1});
    this.announcement = this.i18n.t('infoParticipant.moved', {label, position: target + 1, total: this.infoParticipantList.length});
    setTimeout(() => {
      const button = document.querySelector<HTMLButtonElement>(`[data-move="${buttonClass}-${target}"]`);
      (button && !button.disabled ? button : this.fieldInputs.get(target)?.nativeElement)?.focus();
    });
  }

  backToInfoEval() {
    this.saveData();
    this.router.navigate(['/info-eval']);
  }

  goToCreateEval() {
    this.saveData();
    this.router.navigate(['/setup-eval']);
  }

  private focusField(index: number): void {
    setTimeout(() => this.fieldInputs.get(index)?.nativeElement.focus());
  }
}
