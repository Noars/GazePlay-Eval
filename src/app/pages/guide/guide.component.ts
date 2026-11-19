import {RouterOutlet} from '@angular/router';
import {Component} from '@angular/core';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.css',

})
export class GuideComponent {

  scrollToBottom(): void {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  }
}
