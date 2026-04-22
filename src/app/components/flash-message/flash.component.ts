import {Component} from '@angular/core';
import { FlashService } from '../../services/flash-message/flash.service';

@Component({
  selector: 'app-flash',
  templateUrl: './flash.component.html',
  styleUrl: './flash.component.css'
})
export class FlashComponent {
  constructor(public flashService: FlashService) {
  }

  mapType(type: string): string {
    const map: Record<string, string> = {
      success: 'success',
      error:   'danger',
      info:    'info',
      warning: 'warning'
    };
    return map[type] ?? 'info';
  }

  mapIcon(type: string): string {
    const map: Record<string, string> = {
      success: 'bi-check-circle',
      error:   'bi-x-circle',
      info:    'bi-info-circle',
      warning: 'bi-exclamation-triangle'
    };
    return map[type] ?? 'bi-info-circle';
  }
}
