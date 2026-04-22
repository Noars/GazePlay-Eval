// load-save.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';


@Component({
  selector: 'app-load-save',

  templateUrl: './load-save.component.html',
  styleUrl: './load-save.component.css',
  standalone: true,
})
export class LoadSaveComponent {

  constructor(private router: Router) {}

  loadSlot(slotIndex: number) {
    // TODO : charger le slot depuis SaveService
    console.log('Chargement du slot', slotIndex);
    this.router.navigate(['/create-eval']);
  }

  goBack() {
    this.router.navigate(['/sauvegarde']);
  }
}
