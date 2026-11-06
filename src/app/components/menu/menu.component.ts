import {Component, DestroyRef, ElementRef, inject, Input, ViewChild} from '@angular/core';
import {NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {NgTemplateOutlet} from '@angular/common';
import {filter} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ImportFlowService} from '../../services/import-flow/import-flow.service';
import {TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

interface NavItem {
  label: TranslationKey;
  icon: string;
  route: string;
  exact?: boolean;
}

/**
 * Navigation principale.
 *
 * - `mode="sidebar"` : liste affichée en permanence dans la colonne de gauche (grands écrans) ;
 * - `mode="drawer"`  : même liste dans un tiroir `<dialog>` modal (petits écrans), ouvert
 *   depuis l'en-tête. Le tiroir se ferme après une navigation, avec Échap ou un clic sur le fond.
 */
@Component({
  selector: 'app-menu',
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet, TranslatePipe],
  templateUrl: './menu.component.html',
  standalone: true,
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
  private readonly router = inject(Router);
  private readonly importFlow = inject(ImportFlowService);

  @Input() mode: 'sidebar' | 'drawer' = 'sidebar';

  @ViewChild('drawer') private drawer?: ElementRef<HTMLDialogElement>;

  readonly navigationItems: NavItem[] = [
    {label: 'nav.home', icon: 'bi-house', route: '/home', exact: true},
    {label: 'nav.guide', icon: 'bi-book', route: '/guide'},
    {label: 'nav.options', icon: 'bi-sliders', route: '/option'},
  ];

  readonly projectItems: NavItem[] = [
    {label: 'nav.saves', icon: 'bi-floppy', route: '/sauvegarde'},
    {label: 'nav.load', icon: 'bi-folder2-open', route: '/load-save'},
  ];

  readonly importing = this.importFlow.importing;

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(inject(DestroyRef)),
    ).subscribe(() => this.close());
  }

  open(): void {
    const dialog = this.drawer?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  close(): void {
    const dialog = this.drawer?.nativeElement;
    if (dialog?.open) {
      dialog.close();
    }
  }

  /** Clic sur le fond du tiroir : fermeture. */
  onDrawerClick(event: MouseEvent): void {
    if (event.target === this.drawer?.nativeElement) {
      this.close();
    }
  }

  /** Ouvre la fenêtre d'import d'une archive `.gpSave` / `.zip`. */
  async openImportPopup(): Promise<void> {
    this.close();
    await this.importFlow.start();
  }
}
