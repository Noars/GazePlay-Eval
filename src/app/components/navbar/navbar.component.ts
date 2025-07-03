import { Component } from '@angular/core';
import {ThemeService} from '../../services/theme/theme.service';
import {MenuComponent} from '../menu/menu.component';

@Component({
  selector: 'app-navbar',
  imports: [MenuComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

  constructor(private themeService: ThemeService ) {
  }

  changeTheme(){
    this.themeService.toggleTheme();
  }

  getTheme(){
    return this.themeService.getTheme() === 'dark' ? '☀️' : '🌙';
  }
}
