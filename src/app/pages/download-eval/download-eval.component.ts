import { Component } from '@angular/core';
import {SaveService} from '../../services/save/save.service';
import {DownloadService} from '../../services/download/download.service';

@Component({
  selector: 'app-download-eval',
  imports: [],
  templateUrl: './download-eval.component.html',
  styleUrl: './download-eval.component.css'
})
export class DownloadEvalComponent {

  constructor(private saveService: SaveService, private downloadService: DownloadService) {
  }

  goDownload(){
    this.downloadService.generateEvalZip(this.saveService);
  }
}
