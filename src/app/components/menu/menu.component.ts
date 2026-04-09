import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // Import Pour la redirection vers la page de la Date

@Component({
  selector: 'app-menu',
  imports: [
    RouterLink
  ],
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent {

}
