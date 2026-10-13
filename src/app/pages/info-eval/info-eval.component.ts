import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SaveService} from '../../services/save/save.service';
import {formatTypeModel, saveModelDefault} from '../../shared/saveModel';
import {Router} from '@angular/router';
import {HelpTipComponent} from '../../shared/ui/help-tip/help-tip.component';

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
  imports: [FormsModule, HelpTipComponent],
  templateUrl: './info-eval.component.html',
  standalone: true,
  styleUrl: './info-eval.component.scss'
})
export class InfoEvalComponent implements OnInit{
  @ViewChild('nameInput') private nameInput?: ElementRef<HTMLInputElement>;

  evaluationName: string = saveModelDefault.nomEval;
  resultType: formatTypeModel = saveModelDefault.format;
  tooltipEvalName: string = 'Ce nom apparaîtra dans le nom des fichiers de résultats, ainsi que dans GazePlay afin que vous puissiez sélectionner cette évaluation parmi celles que vous aurez déjà créées.';
  tooltipEvalType: string = 'Les résultats enregistrés en XLSX et CSV seront lisibles dans un tableur.';

  /** Formats proposés ; `value` est la valeur enregistrée dans les fichiers. */
  readonly formats: {value: formatTypeModel, label: string, description: string}[] = [
    {value: 'Csv&Xlsx', label: 'CSV et XLSX', description: 'Recommandé : les deux formats, lisibles par tous les tableurs.'},
    {value: 'Csv', label: 'CSV', description: 'Fichier texte universel, léger.'},
    {value: 'Xlsx', label: 'XLSX', description: 'Classeur Excel / LibreOffice.'},
  ];

  /** Vrai après une tentative de passage à l'étape suivante (affiche les erreurs). */
  submitted = false;

  constructor(private router: Router, private saveService: SaveService) {
  }

  ngOnInit(): void {
    this.loadData()
  }

  /** Message d'erreur du nom, ou chaîne vide s'il est valide. */
  get nameError(): string {
    if (FORBIDDEN_NAME_CHARACTERS.test(this.evaluationName ?? '')) {
      return 'Le nom ne peut pas contenir les caractères \\ / : * ? " < > |';
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
