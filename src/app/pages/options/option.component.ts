import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OptionService } from '../../services/options/option-service';
import { optionsModel, optionsModelDefault } from '../../shared/optionsModel';
import { FlashService } from '../../services/flash-message/flash.service';

@Component({
  selector: 'app-option',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './option.component.html',
  styleUrl: './option.component.css'
})
export class OptionComponent implements OnInit {

  public options!: optionsModel;

  constructor(
    private router: Router,
    private optionService: OptionService,
    public flashService: FlashService
  ) {}

  ngOnInit(): void {
    // S'il n'y a pas d'option, on prend les valeurs par défaut
    this.options = this.optionService.getOptions() ?? { ...optionsModelDefault };
  }

  saveDuration(): void {
    try {
      this.optionService.setOptions(this.options);
      this.flashService.setDefaultDuration(this.options.flashDuration * 1000);
      this.flashService.show('success', 'Options sauvegardées !');
    } catch (e) {
      this.flashService.show('error', 'Une erreur est survenue lors de l\'enregistrement des options');
    }
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
