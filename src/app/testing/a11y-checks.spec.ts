import {findA11yProblems, findHeadingSkips} from './a11y-checks';

/** Vérifie que les contrôles automatisés détectent bien les erreurs qu'ils prétendent détecter. */
describe('a11y-checks (auto-test du vérificateur)', () => {
  function html(content: string): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = content;
    document.body.appendChild(root);
    return root;
  }

  afterEach(() => document.body.querySelectorAll(':scope > div').forEach(el => {
    if (!el.id) el.remove();
  }));

  it('signale un bouton icône sans nom, un champ sans libellé, une image sans alt, un lien sans href', () => {
    const root = html(`
      <button><i class="bi bi-trash"></i></button>
      <input type="text" id="sans-libelle">
      <img src="x.png">
      <a>Lien mort</a>
    `);
    const problems = findA11yProblems(root);
    expect(problems.some(p => p.startsWith('Contrôle sans nom'))).toBe(true);
    expect(problems.some(p => p.startsWith('Champ sans libellé'))).toBe(true);
    expect(problems.some(p => p.startsWith('Image sans attribut alt'))).toBe(true);
    expect(problems.some(p => p.startsWith('Lien sans href'))).toBe(true);
  });

  it('signale les identifiants dupliqués et les références aria cassées', () => {
    const root = html(`
      <p id="doublon">a</p><p id="doublon">b</p>
      <button aria-describedby="inexistant">OK</button>
    `);
    const problems = findA11yProblems(root);
    expect(problems.some(p => p.startsWith('Identifiant dupliqué'))).toBe(true);
    expect(problems.some(p => p.includes('#inexistant'))).toBe(true);
  });

  it('accepte un formulaire correct', () => {
    const root = html(`
      <label for="nom">Nom</label><input id="nom" type="text">
      <button aria-label="Supprimer"><i class="bi bi-trash" aria-hidden="true"></i></button>
      <img src="x.png" alt="">
      <div role="radiogroup" aria-labelledby="q"><span id="q">Question</span>
        <input type="radio" id="r1" name="r"><label for="r1">Oui</label>
      </div>
    `);
    expect(findA11yProblems(root)).toStrictEqual([]);
  });

  it('signale les sauts de niveaux de titres', () => {
    expect(findHeadingSkips(html('<h1>A</h1><h3>B</h3>'))).toStrictEqual(['Saut de niveau de titre : h1 → h3']);
    expect(findHeadingSkips(html('<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>'))).toStrictEqual([]);
  });
});
