// menu.component.ts
import { Component } from '@angular/core';
import { LoadService } from '../../services/load/load.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  constructor(private router: Router) {}


  goToSauvegarde() {
    this.router.navigate(['/sauvegarde']);
  }

  goToLoadSave() {
    this.router.navigate(['/load-save']);
  }


}
