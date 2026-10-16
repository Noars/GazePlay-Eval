import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  Type,
  ViewChild
} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {Router} from '@angular/router';
import {GuideSauvegardeComponent} from '../../pages/guide/guide-sauvegarde/guide-sauvegarde.component';
import {GuideCreationComponent} from '../../pages/guide/guide-creation/guide-creation.component';
import {TranslationKey} from '../../core/i18n/i18n.service';
import {TranslatePipe} from '../../core/i18n/translate.pipe';

/** Textes du panneau, sous forme de clés de traduction. */
interface GuideSection {
  title: TranslationKey;
  body: TranslationKey;
}

interface PageGuide {
  title: TranslationKey;
  intro?: TranslationKey;
  sections?: GuideSection[];
}

/**
 * Panneau d'aide contextuelle, ouvert depuis le bouton « Aide » de l'en-tête.
 *
 * Implémenté avec un élément `<dialog>` natif ouvert en modal : le focus y est confiné,
 * Échap le ferme et le navigateur rend le focus au bouton d'origine. La largeur est
 * réglable à la souris (poignée) ou au clavier (flèches sur la poignée).
 */
@Component({
  selector: 'app-guide-popup',
  standalone: true,
  imports: [NgComponentOutlet, TranslatePipe],
  templateUrl: './guide-popup-component.html',
  styleUrl: './guide-popup-component.scss',
})
export class GuidePopupComponent implements OnChanges, OnDestroy {

  router = inject(Router);

  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('dialog', {static: true}) private dialog?: ElementRef<HTMLDialogElement>;

  panelWidth = 440;
  isResizing = false;

  private readonly minWidth = 280;
  private readonly keyboardStep = 40;

  // Guide affiché par défaut (pas de page dédiée)
  private readonly defaultGuide: PageGuide = {
    title: 'helpPanel.default.title',
    intro: 'helpPanel.default.intro',
    sections: [],
  };

  // Titre des différentes parties + contenu (clés de traduction)
  private readonly guides: Record<string, PageGuide> = {
    home: {
      title: 'helpPanel.home.title',
      intro: 'helpPanel.home.intro',
      sections: [
        {title: 'helpPanel.home.new.title', body: 'helpPanel.home.new.body'},
        {title: 'helpPanel.home.resume.title', body: 'helpPanel.home.resume.body'},
      ],
    },
    'info-eval': {
      title: 'helpPanel.infoEval.title',
      intro: 'helpPanel.infoEval.intro',
      sections: [
        {title: 'helpPanel.infoEval.name.title', body: 'helpPanel.infoEval.name.body'},
      ],
    },
    'info-participant': {
      title: 'helpPanel.infoParticipant.title',
      intro: 'helpPanel.infoParticipant.intro',
      sections: [
        {title: 'helpPanel.infoParticipant.fields.title', body: 'helpPanel.infoParticipant.fields.body'},
      ],
    },
    'setup-eval': {
      title: 'helpPanel.setupEval.title',
      intro: 'helpPanel.setupEval.intro',
      sections: [
        {title: 'helpPanel.setupEval.screens.title', body: 'helpPanel.setupEval.screens.body'},
      ],
    },
    'create-eval': {
      title: 'helpPanel.createEval.title',
      intro: 'helpPanel.createEval.intro',
      sections: [
        {title: 'helpPanel.createEval.media.title', body: 'helpPanel.createEval.media.body'},
        {title: 'helpPanel.createEval.answer.title', body: 'helpPanel.createEval.answer.body'},
      ],
    },
    'download-eval': {
      title: 'helpPanel.downloadEval.title',
      intro: 'helpPanel.downloadEval.intro',
      sections: [
        {title: 'helpPanel.downloadEval.export.title', body: 'helpPanel.downloadEval.export.body'},
      ],
    },
    sauvegarde: {
      title: 'helpPanel.saves.title',
    },
    'load-save': {
      title: 'helpPanel.load.title',
      intro: 'helpPanel.load.intro',
      sections: [
        {title: 'helpPanel.load.slot.title', body: 'helpPanel.load.slot.body'},
      ],
    },
    option: {
      title: 'helpPanel.options.title',
      intro: 'helpPanel.options.intro',
      sections: [
        {title: 'helpPanel.options.appearance.title', body: 'helpPanel.options.appearance.body'},
        {title: 'helpPanel.options.reading.title', body: 'helpPanel.options.reading.body'},
        {title: 'helpPanel.options.language.title', body: 'helpPanel.options.language.body'},
      ],
    },
  };

  // Pages pour lesquelles on réutilise directement le composant du guide statique
  // (rendu via NgComponentOutlet), au lieu de dupliquer son contenu.
  private readonly guideComponents: Record<string, Type<unknown>> = {
    sauvegarde: GuideSauvegardeComponent,
    'load-save': GuideSauvegardeComponent,

    'info-eval': GuideCreationComponent,
    'info-participant': GuideCreationComponent,
    'setup-eval': GuideCreationComponent,
    'create-eval': GuideCreationComponent,
    'download-eval': GuideCreationComponent,
  };

  private get currentSegment(): string {
    return (this.router.url ?? '')
      .split('?')[0]
      .split('#')[0]
      .split('/')
      .filter(Boolean)[0] ?? 'home';
  }

  // Guide correspondant à la page actuellement affichée
  get currentGuide(): PageGuide {
    return this.guides[this.currentSegment] ?? this.defaultGuide;
  }

  // Composant de guide à charger pour la page courante
  get currentGuideComponent(): Type<unknown> | null {
    return this.guideComponents[this.currentSegment] ?? null;
  }

  // Sous-partie du guide à afficher en premier
  get currentGuideInputs(): Record<string, unknown> | undefined {
    return {sectionId: this.currentSegment};
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['isOpen']) return;
    const dialog = this.dialog?.nativeElement;
    if (!dialog) return;

    if (this.isOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    } else if (!this.isOpen && dialog.open) {
      dialog.close();
    }
  }

  close(): void {
    const dialog = this.dialog?.nativeElement;
    if (dialog?.open) {
      dialog.close(); // déclenche l'événement `close`, géré par onDialogClosed()
    } else {
      this.closed.emit();
    }
  }

  /** Fermeture par Échap, par le bouton ou par clic sur le fond. */
  onDialogClosed(): void {
    this.closed.emit();
  }

  /** Un clic sur le fond (hors du panneau) ferme le guide. */
  onDialogClick(event: MouseEvent): void {
    if (event.target === this.dialog?.nativeElement) {
      this.close();
    }
  }

  /** Guide fermé pendant un redimensionnement : les écouteurs du document sont retirés. */
  ngOnDestroy(): void {
    this.stopResize();
  }

  startResize(event: PointerEvent | MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;

    document.addEventListener('pointermove', this.resize);
    document.addEventListener('pointerup', this.stopResize);
  }

  resize = (event: PointerEvent | MouseEvent): void => {
    if (!this.isResizing) return;
    // Le panneau est ancré à droite
    this.setWidth(window.innerWidth - event.clientX);
  };

  stopResize = (): void => {
    this.isResizing = false;

    document.removeEventListener('pointermove', this.resize);
    document.removeEventListener('pointerup', this.stopResize);
  };

  /** Redimensionnement au clavier : flèche gauche = plus large, flèche droite = plus étroit. */
  onResizeKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.setWidth(this.panelWidth + this.keyboardStep);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.setWidth(this.panelWidth - this.keyboardStep);
    }
  }

  get maxWidth(): number {
    return Math.round(window.innerWidth * 0.9);
  }

  private setWidth(width: number): void {
    this.panelWidth = Math.round(Math.min(Math.max(width, this.minWidth), this.maxWidth));
  }
}
