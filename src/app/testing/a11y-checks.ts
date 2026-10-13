/**
 * Vérifications d'accessibilité élémentaires, exécutées dans les tests Karma.
 *
 * Elles ne remplacent ni un outil d'audit complet (axe-core, Lighthouse) ni des tests
 * manuels avec lecteur d'écran : elles détectent automatiquement les régressions les plus
 * fréquentes (WCAG 1.1.1, 1.3.1, 2.4.6, 4.1.2).
 */

/** Nom accessible approximatif d'un élément (aria-labelledby, aria-label, libellé, texte, title). */
export function accessibleName(element: Element, root: ParentNode = document): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/)
      .map(id => (root.querySelector(`#${CSS.escape(id)}`) ?? document.getElementById(id))?.textContent ?? '')
      .join(' ')
      .trim();
    if (text) return text;
  }
  const ariaLabel = element.getAttribute('aria-label')?.trim();
  if (ariaLabel) return ariaLabel;

  const id = element.getAttribute('id');
  if (id) {
    const label = root.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  const wrappingLabel = element.closest('label');
  if (wrappingLabel?.textContent?.trim()) return wrappingLabel.textContent.trim();

  if (element instanceof HTMLImageElement) return element.alt;
  const text = element.textContent?.replace(/\s+/g, ' ').trim();
  if (text) return text;
  return element.getAttribute('title')?.trim() ?? '';
}

function isHidden(element: Element): boolean {
  return !!element.closest('[hidden], [aria-hidden="true"], dialog:not([open])');
}

/**
 * Renvoie la liste des problèmes détectés dans `root` (tableau vide si aucun).
 */
export function findA11yProblems(root: HTMLElement): string[] {
  const problems: string[] = [];
  const describe = (el: Element) => el.outerHTML.slice(0, 140);

  // Boutons et liens : nom accessible obligatoire.
  root.querySelectorAll('button, a[href], [role="button"]').forEach(el => {
    if (isHidden(el)) return;
    if (!accessibleName(el, root)) problems.push(`Contrôle sans nom accessible : ${describe(el)}`);
  });

  // Liens sans destination (non atteignables au clavier).
  root.querySelectorAll('a:not([href])').forEach(el => {
    if (!isHidden(el) && !el.hasAttribute('tabindex')) problems.push(`Lien sans href : ${describe(el)}`);
  });

  // Champs : libellé ou nom accessible obligatoire.
  root.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
    if (isHidden(el)) return;
    const inRadioGroup = el.getAttribute('type') === 'radio' && !!el.closest('[role="radiogroup"], fieldset');
    if (!accessibleName(el, root) && !inRadioGroup) problems.push(`Champ sans libellé : ${describe(el)}`);
  });

  // Images : attribut alt obligatoire (vide si décorative).
  root.querySelectorAll('img').forEach(el => {
    if (!el.hasAttribute('alt')) problems.push(`Image sans attribut alt : ${describe(el)}`);
  });

  // Identifiants uniques (les références aria-* et label[for] en dépendent).
  const ids = new Map<string, number>();
  root.querySelectorAll('[id]').forEach(el => ids.set(el.id, (ids.get(el.id) ?? 0) + 1));
  ids.forEach((count, id) => {
    if (count > 1) problems.push(`Identifiant dupliqué : #${id} (${count} fois)`);
  });

  // Références aria vers des éléments existants.
  root.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls]').forEach(el => {
    ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(attribute => {
      el.getAttribute(attribute)?.split(/\s+/).filter(Boolean).forEach(id => {
        if (!root.querySelector(`#${CSS.escape(id)}`) && !document.getElementById(id)) {
          problems.push(`${attribute} vers un élément absent (#${id}) : ${describe(el)}`);
        }
      });
    });
  });

  // Gestionnaires de clic sur des éléments non interactifs.
  root.querySelectorAll('div[onclick], span[onclick]').forEach(el => problems.push(`Clic sur un élément non interactif : ${describe(el)}`));

  return problems;
}

/** Niveaux de titres : renvoie les sauts (ex. h1 → h3) détectés. */
export function findHeadingSkips(root: HTMLElement): string[] {
  const levels = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(h => !isHidden(h))
    .map(h => Number(h.tagName[1]));
  const problems: string[] = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      problems.push(`Saut de niveau de titre : h${levels[i - 1]} → h${levels[i]}`);
    }
  }
  return problems;
}
