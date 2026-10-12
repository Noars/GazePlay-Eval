import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OptionService } from '../../services/options/option-service';
import { optionsModel, optionsModelDefault } from '../../shared/optionsModel';
import { FlashService } from '../../services/flash-message/flash.service';
import { IndexedDBService } from '../../services/indexedDB/indexed-db.service';

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
    public flashService: FlashService,
    private indexedDBService: IndexedDBService
  ) {}

  ngOnInit(): void {
    // S'il n'y a pas d'option, on prend les valeurs par défaut
    this.options = this.optionService.getOptions() ?? { ...optionsModelDefault };
  }

  saveDuration(): void {
    try {
      this.optionService.setOptions(this.options);
      this.flashService.setDefaultDuration(this.options.flashDuration * 1000);

      // La durée des flash-message est hardcoded, car si l'utilisateur met un temps de 0 il n'aura pas de confirmation.
      this.flashService.show('success', 'Options sauvegardées !', 1000);
    } catch (e) {
      this.flashService.show('error', 'Une erreur est survenue lors de l\'enregistrement des options', 1000);
    }
  }

  async emptyDB(): Promise<void> {
    try {
      await this.indexedDBService.deleteAll()
      this.flashService.show('success', 'Les fichiers ont été supprimés avec succès.');
    } catch (e) {
      this.flashService.show('error', 'Une erreur est survenue lors de la suppression des fichiers.');
    }

  }

  changeFont(font: string): void {
    document.documentElement.style.setProperty(
      '--accessibility-font',
      font
    );
  }

  changeSize(size: string): void {
    document.documentElement.style.setProperty(
      '--accessibility-font-size',
      size
    );
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
