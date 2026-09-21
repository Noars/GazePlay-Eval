import {RouterOutlet} from '@angular/router';
import {Component} from '@angular/core';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [RouterOutlet],
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
