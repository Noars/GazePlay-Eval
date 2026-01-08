import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {Router} from '@angular/router';
import {MatTooltip} from '@angular/material/tooltip';
import {SaveService} from '../../services/save/save.service';
import {saveModelDefault} from '../../shared/saveModel';

@Component({
  selector: 'app-info-participant',

  templateUrl: './page-Thomas.component.html',
  styleUrl: './page-Thomas.component.css'
})
export class PageThomas implements OnInit{
  heureAffichee: string | null = null;



  constructor(private router: Router,
              private saveService: SaveService) {
  }

  ngOnInit(): void {

  }



  capturerHeure() {
    const maintenant = new Date();

    this.heureAffichee = maintenant.toLocaleTimeString() + " le " + maintenant.toLocaleDateString();

  }

  backToInfoEval() {
    ;
    this.router.navigate(['/info-eval']);
  }

  goToCreateEval() {

    this.router.navigate(['/info-participant']);
  }
}
