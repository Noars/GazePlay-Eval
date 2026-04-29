import { Component } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-no-page',
  imports: [],
  templateUrl: './no-page.html',
  styleUrl: './no-page.css',
})
export class NoPage {

  constructor(
    protected router: Router
  ) {}


}
