import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SaveService} from '../../services/save/save.service';

@Component({
  selector: 'app-progress-bar',
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  standalone: true,
  styleUrl: './progress-bar.component.css'
})
export class ProgressBarComponent {
  @Input() steps: string[] = [];
  @Input() currentStepIndex = 0;

  constructor(
    private saveService : SaveService
  ) {}


  getEvalName(): string {
    return this.saveService.getEvalName()
  }

}

