import { Injectable, signal } from '@angular/core';
import { Flash } from '../../shared/flash.model';

@Injectable({ providedIn: 'root' })
export class FlashService {
  flashs = signal<Flash[]>([]);
  private counter = 0;

  show(type: Flash['type'] = 'info',message: string, duration = 5000): void { // Reste affiché pendant 5s

    const id = this.counter = this.counter + 1;
    this.flashs.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number): void {
    this.flashs.update(f =>
      f.map(flash => flash.id === id ? { ...flash, fadingOut: true } : flash)
    );
    setTimeout(() => {
      this.flashs.update(f => f.filter(flash => flash.id !== id));
    }, 300);
  }
}
