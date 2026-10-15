import { Component } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-no-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './no-page.html',
  styleUrl: './no-page.css',
})
export class NoPage {

  constructor(
    protected router: Router
  ) {}


}
