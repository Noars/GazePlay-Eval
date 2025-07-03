import { Component } from '@angular/core';
import {ThemeService} from '../../services/theme/theme.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(public themeService: ThemeService) {
  }
  changeTheme(){
    this.themeService.toggleTheme();
  }
}
