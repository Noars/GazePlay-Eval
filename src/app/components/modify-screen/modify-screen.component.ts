import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {
  transitionScreenConstModel,
  transitionScreenModel,
  defaultTransitionScreenModel, defaultEndScreenModel,
  defaultInstructionScreenModel,
  defaultStimuliScreenModel, endScreenConstModel, endScreenModel,
  instructionScreenConstModel,
  instructionScreenModel,
  screenTypeModel,
  stimuliScreenConstModel,
  stimuliScreenModel
} from '../../shared/screenModel';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-modify-screen',
  imports: [
    FormsModule
  ],
  templateUrl: './modify-screen.component.html',
  styleUrl: './modify-screen.component.css'
})
export class ModifyScreenComponent implements AfterViewInit{

  @Input() screenToModify!: screenTypeModel;
  @Output() selectedScreenChange = new EventEmitter<boolean>();

  ajoutCroix: string = ''; // "oui" ou "non"
  tempsFixation: number | null = null;

  arrowOffset: number = 0;
  @ViewChild('labelQ1') labelQuestion1!: ElementRef;

  ngAfterViewInit() {
    this.updateArrowPosition();
  }

  updateArrowPosition() {
    if (this.labelQuestion1) {
      const rect = this.labelQuestion1.nativeElement.getBoundingClientRect();
      // Calculer la position pour centrer la flèche sous le label
      this.arrowOffset = rect.left + rect.width / 2 - this.getCardLeftOffset();
    }
  }

  getCardLeftOffset(): number {
    // Trouver la position left du conteneur card pour un calcul relatif
    const card = this.labelQuestion1.nativeElement.closest('.card');
    if (card) {
      return card.getBoundingClientRect().left;
    }
    return 0;
  }

  changeTypeScreen(type: string) {
    switch (type){
      case transitionScreenConstModel :
        const newTransitionScreen: transitionScreenModel = defaultTransitionScreenModel;
        newTransitionScreen.name = this.screenToModify.name
        this.screenToModify = newTransitionScreen;
        break;

      case instructionScreenConstModel :
        const newInstructionScreen: instructionScreenModel = defaultInstructionScreenModel;
        newInstructionScreen.name = this.screenToModify.name;
        this.screenToModify = newInstructionScreen;
        break;

      case stimuliScreenConstModel :
        const newStimuliScreen: stimuliScreenModel = defaultStimuliScreenModel;
        newStimuliScreen.name = this.screenToModify.name;
        this.screenToModify = newStimuliScreen;
        break;

      case endScreenConstModel :
        const newEndScreen: endScreenModel = defaultEndScreenModel;
        newEndScreen.name = this.screenToModify.name;
        this.screenToModify = newEndScreen;
        break;

      default :
        break;
    }
  }

  backToScreenList(){
    this.selectedScreenChange.emit(false);
  }

  protected readonly instructionScreenConstModel = instructionScreenConstModel;
  protected readonly stimuliScreenConstModel = stimuliScreenConstModel;
  protected readonly endScreenConstModel = endScreenConstModel;
  protected readonly transitionScreenConstModel = transitionScreenConstModel;
}
