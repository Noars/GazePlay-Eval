import {Component, Input} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'app-global-instruction-screen',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './global-instruction-screen.component.html',
  styleUrl: './global-instruction-screen.component.css'
})
export class GlobalInstructionScreenComponent {

  @Input() globalInstructionScreenInfos: any[] = [];

  onTypeChange(){
    this.globalInstructionScreenInfos[4] = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.globalInstructionScreenInfos[4] = file;
    }
  }

  getFileName(){
    if (this.globalInstructionScreenInfos[4] === ''){
      return "Aucun fichier sélectionner !"
    }else {
      return this.globalInstructionScreenInfos[4].name;
    }
  }

  onGetText(event: Event){
    const input = event.target as HTMLInputElement;
    this.globalInstructionScreenInfos[4] = input.value;
  }
}
