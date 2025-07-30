import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {saveModelDefault} from '../../shared/saveModel';

@Component({
  selector: 'app-eval-manual',
  imports: [CommonModule, FormsModule],
  templateUrl: './eval-manual.component.html',
  styleUrl: './eval-manual.component.css'
})
export class EvalManualComponent implements OnInit{

  @Output() selectedModeChange = new EventEmitter<null>();

  globalBlackScreenInfos: any[] = saveModelDefault.globalParamsBlackScreen;
  globalStimuliScreenInfos: string[] = saveModelDefault.globalParamsStimuliScreen;

  constructor(private router: Router,
              private saveService: SaveService,) {
  }

  ngOnInit(): void {
    this.loadData();
  }

  saveData(){
    this.saveService.saveDataAuto(
      this.saveService.dataAuto.nomEval,
      this.saveService.dataAuto.format,
      this.saveService.dataAuto.infoParticipant,
      this.globalBlackScreenInfos,
      this.globalStimuliScreenInfos,
      this.saveService.dataAuto.listScreens);

  }

  loadData(){
    this.globalStimuliScreenInfos = this.saveService.dataAuto.globalParamsStimuliScreen;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.globalBlackScreenInfos[3] = file;
      console.log('Image stockée :', this.globalBlackScreenInfos[3]);
    }
  }

  getNameImage(){
    if (this.globalBlackScreenInfos[3] === ''){
      return "Aucun fichier sélectionner !"
    }else {
      return this.globalBlackScreenInfos[3].name;
    }
  }

  startCreateEvalManual(){
    this.saveData();
    this.router.navigate(['/create-eval']);
  }

  backToEvalChoice(){
    this.saveData();
    this.selectedModeChange.emit(null);
  }

  protected readonly Number = Number;
}
