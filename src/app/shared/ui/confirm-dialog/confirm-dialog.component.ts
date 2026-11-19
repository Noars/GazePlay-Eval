import {ChangeDetectionStrategy, Component, inject, Injectable} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {firstValueFrom} from 'rxjs';
import {TranslatePipe} from '../../../core/i18n/translate.pipe';

export interface ConfirmDialogData {
  title: string;
  /** Paragraphes du message (un élément = un paragraphe). */
  message: string | string[];
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` pour les actions destructives (suppression définitive). */
  tone?: 'default' | 'danger' | 'warning';
}

/**
 * Boîte de confirmation générique (MatDialog : focus piégé, Échap = annuler,
 * retour du focus sur l'élément déclencheur à la fermeture).
 * Le bouton par défaut au clavier est « Annuler » pour les actions destructives.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  protected get paragraphs(): string[] {
    return Array.isArray(this.data.message) ? this.data.message : [this.data.message];
  }

  protected get icon(): string {
    switch (this.data.tone) {
      case 'danger': return 'bi-trash3';
      case 'warning': return 'bi-exclamation-triangle';
      default: return 'bi-question-circle';
    }
  }

  protected close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}

/** Ouvre une confirmation et renvoie `true` si l'utilisateur confirme. */
@Injectable({providedIn: 'root'})
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  async confirm(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
      data,
      panelClass: 'gp-dialog-panel',
      autoFocus: data.tone === 'danger' ? '.js-cancel' : '.js-confirm',
      restoreFocus: true,
      ariaLabelledBy: 'confirm-dialog-title',
      ariaDescribedBy: 'confirm-dialog-message',
    });
    return (await firstValueFrom(ref.afterClosed())) === true;
  }
}
