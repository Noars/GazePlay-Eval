import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  Type,
  ViewChild
} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {Router} from '@angular/router';
import {GuideSauvegardeComponent} from '../../pages/guide/guide-sauvegarde/guide-sauvegarde.component';
import {GuideCreationComponent} from '../../pages/guide/guide-creation/guide-creation.component';

interface GuideSection {
  title: string;
  body: string;
}

interface PageGuide {
  title: string;
  intro?: string;
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
  imports: [NgComponentOutlet],
  templateUrl: './guide-popup-component.html',
  styleUrl: './guide-popup-component.scss',
})
export class GuidePopupComponent implements OnChanges {

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
    title: 'Aide',
    intro: "Le guide détaillé de cette page n'est pas encore disponible. Consultez le guide complet depuis le menu « Guide ».",
    sections: [],
  };

  // Titre des différentes parties + contenu
  private readonly guides: Record<string, PageGuide> = {
    home: {
      title: "Accueil",
      intro: "Cette page permet d'accéder aux évaluations, de deux façons différentes : ",
      sections: [
        {
          title: "Nouvelle évaluation",
          body: "Lancez la création d'une évaluation de zéro et laissez-vous guider pas à pas.",
        },
        {
          title: "Reprendre l'évaluation précédente",
          body: "Si une évaluation est en cours, reprenez-la là où vous vous en étiez arrêté.",
        },
      ],
    },
    'info-eval': {
      title: "Informations de l'évaluation",
      intro: "Définissez les informations générales de votre évaluation.",
      sections: [
        {
          title: "Nom de l'évaluation",
          body: "Choisissez un nom clair : il identifiera votre évaluation dans GazePlay-Eval.",
        },
      ],
    },
    'info-participant': {
      title: "Informations sur le participant",
      intro: "Choisissez les informations à renseigner sur la personne évaluée.",
      sections: [
        {
          title: "Champs personnalisés",
          body: "Sélectionnez le type d'informations que vous souhaitez collecter lors de la passation.",
        },
      ],
    },
    'setup-eval': {
      title: "Configuration de l'évaluation",
      intro: "Mettez en place la structure de votre évaluation.",
      sections: [
        {
          title: "Écrans",
          body: "Organisez les écrans et leur disposition avant d'ajouter vos contenus.",
        },
      ],
    },
    'create-eval': {
      title: "Création des stimuli",
      intro: "Ajoutez et configurez les stimuli de chaque écran.",
      sections: [
        {
          title: "Médias",
          body: "Importez les images, sons, vidéos ou textes à présenter dans chaque case.",
        },
        {
          title: "Bonne réponse",
          body: "Indiquez pour chaque case si elle correspond à la bonne réponse attendue.",
        },
      ],
    },
    'download-eval': {
      title: "Téléchargement",
      intro: "Exportez votre évaluation pour l'utiliser dans GazePlay-Eval.",
      sections: [
        {
          title: "Export",
          body: "Téléchargez le fichier de l'évaluation une fois la création terminée.",
        },
      ],
    },
    sauvegarde: {
      title: "Sauvegardes",
    },
    'load-save': {
      title: "Chargement",
      intro: "Rechargez une évaluation sauvegardée précédemment.",
      sections: [
        {
          title: "Charger une sauvegarde",
          body: "Sélectionnez une sauvegarde existante pour reprendre son édition.",
        },
      ],
    },
    option: {
      title: "Options et accessibilité",
      intro: "Adaptez l'affichage à vos besoins. Chaque réglage est appliqué immédiatement et enregistré sur cet appareil.",
      sections: [
        {
          title: "Apparence",
          body: "Choisissez un thème clair, sombre ou celui de votre système, et activez si besoin le contraste renforcé ou le mode daltonisme (couleurs distinguables complétées par des symboles).",
        },
        {
          title: "Lecture",
          body: "Modifiez la police, la taille du texte, l'interligne et les espacements pour faciliter la lecture.",
        },
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
