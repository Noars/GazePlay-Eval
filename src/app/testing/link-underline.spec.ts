/**
 * Soulignement des liens selon les préférences, vérifié sur les styles globaux réels
 * (`src/styles.scss`, chargé par Karma via angular.json) et le style calculé du navigateur.
 */
describe('Styles globaux — soulignement des liens', () => {
  const root = document.documentElement;
  const attributes = ['data-underline-links', 'data-contrast', 'data-color-blind'];
  let saved: (string | null)[];
  let container: HTMLElement;

  /** Liens présentés avec leur propre forme : jamais concernés par la préférence. */
  const shapedLinkClasses = ['gp-btn', 'gp-nav__link', 'gp-action-card', 'gp-header__brand', 'btn-section-card', 'stepper__step'];

  const decoration = (element: Element) => getComputedStyle(element).textDecorationLine;
  const textLink = () => container.querySelector('a.text-link')!;

  beforeEach(() => {
    saved = attributes.map(name => root.getAttribute(name));
    root.setAttribute('data-contrast', 'standard');
    root.setAttribute('data-color-blind', 'false');

    container = document.createElement('div');
    container.innerHTML = `<p>Un <a class="text-link" href="#/guide">lien de texte</a>.</p>`
      + shapedLinkClasses.map(cls => `<a class="${cls}" href="#/home">${cls}</a>`).join('');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    attributes.forEach((name, i) => saved[i] === null ? root.removeAttribute(name) : root.setAttribute(name, saved[i]!));
  });

  it('préférence désactivée → les liens de texte ne sont pas soulignés (Bootstrap ne l\'impose plus)', () => {
    root.setAttribute('data-underline-links', 'false');
    expect(decoration(textLink())).toBe('none');
  });

  it('préférence activée → les liens de texte sont soulignés', () => {
    root.setAttribute('data-underline-links', 'true');
    expect(decoration(textLink())).toBe('underline');
  });

  it('bascule Oui ↔ Non → effet immédiat sur le style calculé', () => {
    root.setAttribute('data-underline-links', 'true');
    expect(decoration(textLink())).toBe('underline');
    root.setAttribute('data-underline-links', 'false');
    expect(decoration(textLink())).toBe('none');
    root.setAttribute('data-underline-links', 'true');
    expect(decoration(textLink())).toBe('underline');
  });

  for (const value of ['true', 'false']) {
    it(`préférence ${value} → boutons, cartes, navigation, marque et étapes gardent leur forme (non soulignés)`, () => {
      root.setAttribute('data-underline-links', value);
      shapedLinkClasses.forEach(cls => {
        expect(decoration(container.querySelector(`a.${cls}`)!)).withContext(cls).toBe('none');
      });
    });
  }

  it('contraste renforcé → liens de texte soulignés même préférence désactivée', () => {
    root.setAttribute('data-underline-links', 'false');
    root.setAttribute('data-contrast', 'high');
    expect(decoration(textLink())).toBe('underline');
  });

  it('mode daltonisme → liens de texte soulignés même préférence désactivée', () => {
    root.setAttribute('data-underline-links', 'false');
    root.setAttribute('data-color-blind', 'true');
    expect(decoration(textLink())).toBe('underline');
  });
});
