import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // Import Pour la redirection vers la page de la Date

@Component({
  selector: 'app-menu',
  imports: [
    RouterLink
  ],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {

}
