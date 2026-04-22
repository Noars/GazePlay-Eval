// menu.component.ts
import { Component } from '@angular/core';
import { LoadService } from '../../services/load/load.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  constructor(
    private loadService: LoadService,
    private router: Router
  ) {}

  async onZipSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    await this.loadService.loadZip(input.files[0]);

    await this.router.navigate(['/create-eval']);
  }

  goToSauvegarde() {
    this.router.navigate(['/sauvegarde']);
  }
}
