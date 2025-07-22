import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {blackScreenConstModel, blackScreenModel, defaultBlackScreenModel} from '../../shared/screenModel';

interface Cell {
  row: number;
  col: number;
  label: string;
  image?: string;
}

@Component({
  selector: 'app-stimuli-screen',
  imports: [FormsModule],
  templateUrl: './stimuli-screen.component.html',
  styleUrl: './stimuli-screen.component.css'
})
export class StimuliScreenComponent {

  nbLignes = 5;
  nbColonnes = 5;
  selectedCell: Cell | null = null;

  get totalCells(): number {
    return this.nbLignes * this.nbColonnes;
  }

  get zoomClass(): string {
    if (this.totalCells <= 20) return 'zoom-100';
    if (this.totalCells <= 50) return 'zoom-75';
    return 'zoom-50';
  }

  get grid(): Cell[][] {
    return Array.from({ length: this.nbLignes }, (_, row) =>
      Array.from({ length: this.nbColonnes }, (_, col) => ({
        row,
        col,
        label: `Cell ${row + 1}-${col + 1}`
      }))
    );
  }

  onCellClick(cell: Cell) {
    this.selectedCell = { ...cell };
  }

  closeModal() {
    this.selectedCell = null;
  }

  /*changeTypeScreen(type: string) {
    switch (type){
      case blackScreenConstModel :
        const newBlackScreen: blackScreenModel = defaultBlackScreenModel;
        newBlackScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newBlackScreen;
        break;

      case instructionScreenConstModel :
        const newInstructionScreen: instructionScreenModel = defaultInstructionScreenModel;
        newInstructionScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newInstructionScreen;
        break;

      case stimuliScreenConstModel :
        const newStimuliScreen: stimuliScreenModel = defaultStimuliScreenModel;
        newStimuliScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newStimuliScreen;
        break;

      case endScreenConstModel :
        const newEndScreen: endScreenModel = defaultEndScreenModel;
        newEndScreen.name = this.selectedScreen?.name ?? 'Ecran ' + this.idScreen++;
        this.selectedScreen = newEndScreen;
        break;

      default :
        this.selectedScreen = null;
        break;
    }
  }*/
}
