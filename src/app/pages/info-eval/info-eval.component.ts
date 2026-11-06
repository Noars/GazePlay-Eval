import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SaveService} from '../../services/save/save.service';
import {formatTypeModel, saveModelDefault} from '../../shared/saveModel';
import {Router} from '@angular/router';
import {HelpTipComponent} from '../../shared/ui/help-tip/help-tip.component';
import {I18nService, TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/** Caractères interdits dans un nom de fichier (le nom sert de dossier dans les archives exportées). */
const FORBIDDEN_NAME_CHARACTERS = /[\\/:*?"<>|]/;

/**
 * Étape 1 : nom de l'évaluation et format des résultats.
 *
 * Les valeurs de format (`Csv&Xlsx`, `Csv`, `Xlsx`) sont écrites telles quelles dans les
 * sauvegardes et l'export : elles ne doivent pas être modifiées (compatibilité Learning).
 */
@Component({
  selector: 'app-info-eval',
  imports: [FormsModule, HelpTipComponent, TranslatePipe],
  templateUrl: './info-eval.component.html',
  standalone: true,
  styleUrl: './info-eval.component.scss'
})
export class InfoEvalComponent implements OnInit{
  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  evaluationName: string = saveModelDefault.nomEval;
  resultType: formatTypeModel = saveModelDefault.format;

  /** Formats proposés ; `value` est la valeur enregistrée dans les fichiers (non traduite). */
  readonly formats: {value: formatTypeModel, label: TranslationKey, description: TranslationKey}[] = [
    {value: 'Csv&Xlsx', label: 'infoEval.format.both', description: 'infoEval.format.both.desc'},
    {value: 'Csv', label: 'infoEval.format.csv', description: 'infoEval.format.csv.desc'},
    {value: 'Xlsx', label: 'infoEval.format.xlsx', description: 'infoEval.format.xlsx.desc'},
  ];

  /** Vrai après une tentative de passage à l'étape suivante (affiche les erreurs). */
  submitted = false;

  constructor(private router: Router, private saveService: SaveService, private i18n: I18nService) {
  }

  ngOnInit(): void {
    this.loadData()
  }

  /** Message d'erreur du nom, ou chaîne vide s'il est valide. */
  get nameError(): string {
    if (FORBIDDEN_NAME_CHARACTERS.test(this.evaluationName ?? '')) {
      return this.i18n.t('infoEval.name.forbidden');
    }
    return '';
  }

  /** Répercute immédiatement la saisie dans l'évaluation de travail (sauvegardée à la navigation). */
  onNameChange(value: string): void {
    this.evaluationName = value;
    this.saveService.dataAuto.nomEval = value;
  }

  onFormatChange(value: formatTypeModel): void {
    this.resultType = value;
    this.saveService.dataAuto.format = value;
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.evaluationName,
      this.resultType,
      this.saveService.dataAuto.infoParticipant,
      this.saveService.dataAuto.globalParamsTransitionScreen,
      this.saveService.dataAuto.globalParamsInstructionScreen,
      this.saveService.dataAuto.globalParamsStimuliScreen,
      this.saveService.dataAuto.listScreens,
      this.saveService.dataAuto.step); // Ajout du step dans l'objet évaluation
  }

  loadData(){
    this.evaluationName = this.saveService.dataAuto.nomEval;
    this.resultType = this.saveService.dataAuto.format;
  }

  goToInfoParticipant() {
    this.submitted = true;
    if (this.nameError) {
      this.nameInput?.nativeElement.focus();
      return;
    }
    this.saveData();
    this.router.navigate(['/info-participant']);
  }
}
