import {Component} from '@angular/core';
import {ThemeService} from '../../services/theme/theme.service';
import {MenuComponent} from '../menu/menu.component';
import {Router} from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [MenuComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {

  constructor(private router: Router,
              private themeService: ThemeService) {
  }

  changeTheme(){
    this.themeService.toggleTheme();
  }

  getTheme(){
    return this.themeService.getTheme() === 'dark' ? '☀️' : '🌙';
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }
}
