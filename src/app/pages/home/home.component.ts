import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  standalone: true,
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(private router: Router,
              private saveService: SaveService) {
  }

  goToInfoEval() {
    this.saveService.newSaveDataAuto();
    this.router.navigate(['/info-eval']);
  }
}
