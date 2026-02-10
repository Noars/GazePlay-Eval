import { Component } from '@angular/core';
import {SaveService} from '../../services/save/save.service';
import {DownloadService} from '../../services/download/download.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-download-eval',
  imports: [],
  templateUrl: './download-eval.component.html',
  standalone: true,
  styleUrl: './download-eval.component.css'
})
export class DownloadEvalComponent {

  constructor(private saveService: SaveService, private downloadService: DownloadService, private router: Router) {
  }

  goDownload(){
    this.downloadService.generateEvalZip(this.saveService);
  }

  backToCreateEval(){
    this.router.navigate(['/create-eval']);
  }
}
