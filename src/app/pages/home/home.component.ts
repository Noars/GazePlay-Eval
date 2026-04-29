import { Component } from '@angular/core';
import {Router} from '@angular/router';
import {SaveService} from '../../services/save/save.service';
import {OverwriteGuardService} from '../../services/overwrite-guard/overwrite-guard.service';
import { AutoSaveService} from '../../services/auto-save/auto-save.service';
import { LoadService } from '../../services/load/load.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  standalone: true,
  styleUrl: './home.component.css'
})
export class HomeComponent {

  constructor(
    private router: Router,
    private saveService: SaveService,
    private autoSaveService: AutoSaveService,
    protected loadService: LoadService,
    private overwriteGuard: OverwriteGuardService
  ) {}

  async goToInfoEval(): Promise<void> {
    if (!await this.overwriteGuard.check(0)) return;
    this.saveService.newSaveDataAuto();
    this.router.navigate(['/info-eval']);
  }

  async goToLastStep(): Promise<void> {
    this.autoSaveService.tryResume();
  }
}
