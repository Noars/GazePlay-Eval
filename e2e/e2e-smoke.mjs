/**
 * Tests de bout en bout de l'application construite, sans aucune dépendance npm.
 *
 * - l'application de production (`dist/GazePlay-Eval/browser`, produite par `npm run build`)
 *   est servie par un petit serveur HTTP local ;
 * - Chrome et Edge sont pilotés par le protocole DevTools, Firefox par WebDriver BiDi
 *   (WebSocket natif de Node ≥ 22) ;
 * - chaque navigateur démarre avec un profil temporaire, supprimé à la fin : les données
 *   de l'utilisateur (sauvegardes, médias, préférences) ne sont jamais lues ni modifiées.
 *
 * Usage : `npm run e2e` (Chrome, Edge et Firefox trouvés sur la machine)
 *         `node e2e/e2e-smoke.mjs chrome firefox`
 * Emplacements des navigateurs remplaçables par CHROME_BIN, EDGE_BIN et FIREFOX_BIN.
 * Code de sortie 1 si une vérification échoue ou si un navigateur demandé est introuvable.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist', 'GazePlay-Eval', 'browser');
const SAMPLE = path.join(ROOT, 'tests', 'évaluationImportation-gazeplayEval.gpSave');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── Navigateurs ─────────────────────────────────────────────────────────────

const CANDIDATES = {
  chrome: {
    env: 'CHROME_BIN',
    win32: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'],
  },
  edge: {
    env: 'EDGE_BIN',
    win32: ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'],
    darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
    linux: ['microsoft-edge', 'microsoft-edge-stable'],
  },
  firefox: {
    env: 'FIREFOX_BIN',
    win32: ['C:\\Program Files\\Mozilla Firefox\\firefox.exe', 'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'],
    darwin: ['/Applications/Firefox.app/Contents/MacOS/firefox'],
    linux: ['firefox'],
  },
};

/** Exécutable du navigateur, ou `null` s'il n'est pas installé. */
function findBrowser(name) {
  const {env, ...byPlatform} = CANDIDATES[name];
  const candidates = [process.env[env], ...(byPlatform[process.platform] ?? [])].filter(Boolean);
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) return candidate;
    } else if (spawnSync(process.platform === 'win32' ? 'where' : 'which', [candidate]).status === 0) {
      return candidate;
    }
  }
  return null;
}

// ─── Serveur statique de l'application construite ────────────────────────────

const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'};

async function startServer() {
  const missing = [];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      missing.push(url);
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {base: `http://127.0.0.1:${server.address().port}/`, missing, close: () => server.close()};
}

// ─── Pilotes (DevTools pour Chrome/Edge, WebDriver BiDi pour Firefox) ─────────

/** Échanges JSON numérotés sur une WebSocket (commandes et événements). */
function rpc(ws) {
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const {resolve, reject} = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(typeof msg.error === 'string' ? `${msg.error}: ${msg.message}` : JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else {
      listeners.forEach(listener => listener(msg));
    }
  });
  return {
    send: (method, params = {}, extra = {}) => new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, {resolve, reject});
      ws.send(JSON.stringify({id: msgId, method, params, ...extra}));
    }),
    on: listener => listeners.push(listener),
  };
}

async function connect(url) {
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const ws = new WebSocket(url);
      await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
      return ws;
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`Connexion au navigateur impossible : ${url}`);
}

async function launchChromium(exe, profile) {
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', 'about:blank'], {stdio: 'ignore'});
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) await sleep(100);
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
  const c = rpc(await connect(`ws://127.0.0.1:${port}${wsPath}`));
  const version = (await c.send('Browser.getVersion')).product;

  async function newPage() {
    const {targetId} = await c.send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await c.send('Target.attachToTarget', {targetId, flatten: true});
    const send = (method, params) => c.send(method, params, {sessionId});
    const errors = [];
    let loads = 0;
    c.on(msg => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails;
        errors.push('exception : ' + (details.exception?.description ?? details.text));
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        errors.push('console.error : ' + msg.params.args.map(a => a.value ?? a.description).join(' '));
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        errors.push(`journal : ${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
      }
      if (msg.method === 'Page.loadEventFired') loads++;
    });
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.enable');
    await send('DOM.enable');
    const waitLoad = async before => { for (let i = 0; i < 200 && loads === before; i++) await sleep(50); };
    return {
      errors,
      async navigate(url) { const before = loads; await send('Page.navigate', {url}); await waitLoad(before); },
      async reload() { const before = loads; await send('Page.reload'); await waitLoad(before); },
      async eval(expression) {
        const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        return r.result.value;
      },
      viewport: (width, height) => send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false}),
      async setFiles(selector, file) {
        const {root} = await send('DOM.getDocument', {depth: 0});
        const {nodeId} = await send('DOM.querySelector', {nodeId: root.nodeId, selector});
        await send('DOM.setFileInputFiles', {nodeId, files: [file]});
      },
    };
  }
  return {version, newPage, close: async () => { proc.kill(); }};
}

async function launchFirefox(exe, profile) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(exe, ['-headless', '-no-remote', '-profile', profile, '--remote-debugging-port', String(port)], {stdio: 'ignore'});
  const c = rpc(await connect(`ws://127.0.0.1:${port}/session`));
  const session = await c.send('session.new', {capabilities: {}});
  const version = `Firefox ${session.capabilities.browserVersion}`;
  await c.send('session.subscribe', {events: ['log.entryAdded']});
  const errorsByContext = new Map();
  c.on(msg => {
    if (msg.method === 'log.entryAdded' && msg.params.level === 'error') {
      errorsByContext.get(msg.params.source?.context)?.push(`${msg.params.type} : ${msg.params.text}`);
    }
  });

  async function newPage() {
    const {context} = await c.send('browsingContext.create', {type: 'tab'});
    const errors = [];
    errorsByContext.set(context, errors);
    return {
      errors,
      navigate: url => c.send('browsingContext.navigate', {context, url, wait: 'complete'}),
      reload: () => c.send('browsingContext.reload', {context, wait: 'complete'}),
      async eval(expression) {
        const r = await c.send('script.evaluate', {expression, target: {context}, awaitPromise: true, resultOwnership: 'none'});
        if (r.type === 'exception') throw new Error(r.exceptionDetails.text);
        return ['string', 'number', 'boolean'].includes(r.result.type) ? r.result.value : null;
      },
      viewport: (width, height) => c.send('browsingContext.setViewport', {context, viewport: {width, height}}),
      async setFiles(selector, file) {
        const r = await c.send('script.evaluate', {expression: `document.querySelector(${JSON.stringify(selector)})`,
          target: {context}, awaitPromise: false, resultOwnership: 'root'});
        await c.send('input.setFiles', {context, element: {sharedId: r.result.sharedId}, files: [file]});
      },
    };
  }
  return {version, newPage, close: async () => { try { await c.send('session.end'); } catch { /* déjà fermé */ } proc.kill(); }};
}

// ─── Aides exécutées dans la page ────────────────────────────────────────────

const PAGE_HELPERS = `const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(f,t=8000)=>{const s=Date.now();let last;while(Date.now()-s<t){try{const v=await f();if(v)return v;}catch(e){last=e}await sleep(50);}throw new Error('délai dépassé : '+f+(last?' / '+last:''));};
const working=()=>JSON.parse(sessionStorage.getItem('gazeplay-eval.tab-working')||'null');
const setInput=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};`;
/** Exécute `body` (corps d'une fonction asynchrone) dans la page ; les résultats passent en JSON. */
const run = (page, body) => page.eval(`(async()=>{${PAGE_HELPERS}\n${body}})()`);

const ROUTES = ['home', 'info-eval', 'info-participant', 'setup-eval', 'create-eval', 'download-eval', 'sauvegarde',
  'load-save', 'option', 'guide', 'guide/creation', 'guide/sauvegardes', 'guide/imports', 'guide/options', 'guide/depannage',
  'no-page', 'adresse-inconnue'];

// ─── Scénarios ───────────────────────────────────────────────────────────────

async function scenarios(browser, base, missing, check, profile) {
  const a = await browser.newPage();
  await a.viewport(1280, 900);
  await a.navigate(base + '#/home');
  check('chargement initial (titre h1 affiché)',
    !!await run(a, `return (await until(()=>document.querySelector('main h1')))?.textContent.trim();`));

  for (const [width, height] of [[1280, 900], [320, 640]]) {
    await a.viewport(width, height);
    const problems = [];
    for (const route of ROUTES) {
      const res = JSON.parse(await run(a, `location.hash='#/${route}';await sleep(150);
        const h1=await until(()=>document.querySelector('main h1'));await sleep(100);
        return JSON.stringify({h1:h1.textContent.trim(),overflow:document.documentElement.scrollWidth-innerWidth,title:document.title});`));
      if (!res.h1 || res.overflow > 0 || !res.title) problems.push(`${route} : h1="${res.h1}" débordement=${res.overflow}px`);
    }
    check(`${ROUTES.length} pages à ${width}px : titre présent, aucun débordement horizontal`, problems.length === 0, problems.join(' ; '));
  }
  await a.viewport(1280, 900);
  await run(a, `location.hash='#/home';await until(()=>document.querySelector('main h1'));return 1;`);

  const theme = JSON.parse(await run(a, `const b=document.querySelector('header button[aria-pressed]');
    const before=document.documentElement.getAttribute('data-bs-theme');b.click();await sleep(300);
    const after=document.documentElement.getAttribute('data-bs-theme');b.click();await sleep(300);
    return JSON.stringify({before,after,back:document.documentElement.getAttribute('data-bs-theme')});`));
  check('bascule du thème clair/sombre puis retour', theme.before !== theme.after && theme.back === theme.before, JSON.stringify(theme));

  // Import du fichier .gpSave d'exemple (mode « Ouvrir »).
  await run(a, `document.querySelector('button.gp-action-card').click();await until(()=>document.querySelector('#import-file'));return 1;`);
  await a.setFiles('#import-file', SAMPLE);
  const imported = JSON.parse(await run(a, `document.querySelector('input[name=import-mode][value=consult]').click();await sleep(100);
    document.querySelector('.gp-dialog__footer .gp-btn--primary').click();
    await until(()=>working()?.nomEval==='évaluationImportation' && location.hash.includes('info-eval'),15000);
    const db=await new Promise((res,rej)=>{const r=indexedDB.open('GazePlayEvalDB');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
    const ids=await new Promise(res=>{const q=db.transaction('evalFiles').objectStore('evalFiles').getAllKeys();q.onsuccess=()=>res(q.result);});
    const w=working();return JSON.stringify({screens:w.listScreens.map(s=>s.type),fields:w.infoParticipant,ids});`));
  check('import .gpSave réel : écrans, champs et médias restaurés',
    imported.screens.join() === 'instruction,stimuli,transition' && imported.fields.length === 3 && imported.ids.length === 3,
    JSON.stringify(imported));

  // Saisie à l'étape 1 puis départ par le menu (page hors parcours).
  const left = JSON.parse(await run(a, `const i=await until(()=>document.querySelector('#evalName'));setInput(i,'Nom via menu');await sleep(50);
    document.querySelector('a[href="#/sauvegarde"]').click();await until(()=>location.hash.includes('sauvegarde'));await sleep(200);
    return JSON.stringify({name:working()?.nomEval,shown:document.querySelector('main').textContent.includes('Nom via menu')});`));
  check('saisie conservée en quittant une étape par le menu', left.name === 'Nom via menu' && left.shown, JSON.stringify(left));

  // Saisie puis rechargement de la page.
  await run(a, `location.hash='#/info-eval';const i=await until(()=>document.querySelector('#evalName'));setInput(i,'Nom avant rechargement');await sleep(50);return 1;`);
  await a.reload();
  const reloaded = JSON.parse(await run(a, `const i=await until(()=>location.hash.includes('info-eval')&&document.querySelector('#evalName'),10000);await sleep(200);
    return JSON.stringify({value:i.value,hash:location.hash});`));
  check('saisie conservée au rechargement de la page', reloaded.value === 'Nom avant rechargement', JSON.stringify(reloaded));

  // Rechargement hors parcours : la page affichée est conservée, l'évaluation en cours aussi.
  const stayed = [];
  for (const route of ['option', 'guide', 'guide/creation', 'sauvegarde', 'load-save', 'home']) {
    await run(a, `location.hash='#/${route}';await until(()=>document.querySelector('main h1'));await sleep(150);return 1;`);
    await a.reload();
    const res = JSON.parse(await run(a, `await until(()=>document.querySelector('main h1'),10000);await sleep(800);
      return JSON.stringify({hash:location.hash,name:working()?.nomEval});`));
    if (res.hash !== '#/' + route || res.name !== 'Nom avant rechargement') stayed.push(`${route} → ${JSON.stringify(res)}`);
  }
  const back = JSON.parse(await run(a, `location.hash='#/info-eval';const i=await until(()=>document.querySelector('#evalName'));await sleep(100);
    return JSON.stringify({value:i.value});`));
  check('rechargement hors parcours (options, guide, sauvegardes, accueil) : page et évaluation conservées',
    stayed.length === 0 && back.value === 'Nom avant rechargement', stayed.join(' ; ') + ' ' + JSON.stringify(back));

  // Second onglet : évaluation en cours isolée.
  const b = await browser.newPage();
  await b.viewport(1280, 900);
  await b.navigate(base + '#/home');
  const tabB = JSON.parse(await run(b, `await until(()=>document.querySelector('main h1'));await sleep(300);
    return JSON.stringify({working:working()?.nomEval??null});`));
  check('nouvel onglet pendant que le premier est ouvert : aucune reprise de son évaluation', tabB.working === null, JSON.stringify(tabB));
  await run(b, `document.querySelector('main .gp-btn--primary.gp-btn--lg').click();
    const i=await until(()=>document.querySelector('#evalName'));setInput(i,'Onglet B');await sleep(50);
    document.querySelector('a[href="#/sauvegarde"]').click();await until(()=>location.hash.includes('sauvegarde'));return 1;`);
  const isolation = JSON.parse(await run(a, `await sleep(200);return JSON.stringify({a:working()?.nomEval});`));
  check('évaluation de l\'onglet A intacte après modification dans l\'onglet B', isolation.a === 'Nom avant rechargement', JSON.stringify(isolation));

  // Aucune requête hors de l'application (données locales uniquement).
  const external = JSON.parse(await run(a, `return JSON.stringify(performance.getEntriesByType('resource').map(e=>e.name).filter(n=>!n.startsWith(location.origin)));`));
  check('aucune requête vers un serveur externe', external.length === 0, external.join(', '));

  // Fichier invalide : protection affichée, message d'erreur, évaluation en cours intacte.
  const bogus = path.join(profile, 'pas-une-archive.gpSave');
  fs.writeFileSync(bogus, 'ceci n\'est pas un zip');
  await run(a, `location.hash='#/home';await until(()=>document.querySelector('button.gp-action-card'));document.querySelector('button.gp-action-card').click();
    await until(()=>document.querySelector('#import-file'));return 1;`);
  await a.setFiles('#import-file', bogus);
  const invalid = JSON.parse(await run(a, `document.querySelector('input[name=import-mode][value=consult]').click();await sleep(100);
    document.querySelector('.gp-dialog__footer .gp-btn--primary').click();
    // Fenêtre de protection : « Remplacer sans télécharger », pour aller jusqu'à la lecture du fichier.
    const overwrite=await until(()=>document.querySelector('mat-dialog-container .gp-btn--danger-outline'),3000).catch(()=>null);
    if(overwrite){ overwrite.click(); }
    const alert=await until(()=>document.querySelector('[role=alert]')?.textContent.trim(),8000).catch(()=>'');
    return JSON.stringify({alert,dialogAsked:!!overwrite,name:working()?.nomEval});`));
  check('fichier invalide : protection affichée, message d\'erreur, évaluation en cours intacte',
    invalid.dialogAsked && invalid.alert.length > 0 && invalid.name === 'Nom avant rechargement', JSON.stringify(invalid));

  // Seule erreur attendue : la trace volontaire de l'import invalide provoqué ci-dessus.
  const errors = [...a.errors, ...b.errors].filter(e => !e.includes('Import impossible'));
  check('aucune erreur JavaScript ni console.error pendant les parcours', errors.length === 0, errors.slice(0, 5).join(' | '));
  check('aucune ressource manquante (404)', missing.length === 0, missing.join(', '));
}

// ─── Exécution ───────────────────────────────────────────────────────────────

async function runBrowser(name, exe) {
  const results = [];
  const check = (label, ok, detail = '') => {
    results.push(ok);
    console.log(`${ok ? '  OK  ' : '  ÉCHEC'} ${label}${detail && !ok ? ' — ' + detail : ''}`);
  };
  const server = await startServer();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `gazeplay-e2e-${name}-`));
  let browser = null;
  try {
    browser = name === 'firefox' ? await launchFirefox(exe, profile) : await launchChromium(exe, profile);
    console.log(`\n${browser.version}`);
    await scenarios(browser, server.base, server.missing, check, profile);
  } catch (error) {
    check('exécution des scénarios', false, error?.stack ?? String(error));
  } finally {
    await browser?.close();
    server.close();
    await sleep(800); // laisse le navigateur libérer son profil
    try { fs.rmSync(profile, {recursive: true, force: true}); } catch { /* fichier encore verrouillé : dossier temporaire */ }
  }
  const failed = results.filter(ok => !ok).length;
  console.log(`  ${browser?.version ?? name} : ${results.length - failed}/${results.length} vérifications réussies`);
  return failed === 0;
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`Application construite introuvable (${DIST}) : lancer d'abord « npm run build ».`);
  process.exit(1);
}

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(CANDIDATES);
let success = true;
for (const name of names) {
  if (!CANDIDATES[name]) {
    console.error(`Navigateur inconnu : ${name} (chrome, edge ou firefox).`);
    success = false;
    continue;
  }
  const exe = findBrowser(name);
  if (!exe) {
    // Navigateur explicitement demandé : erreur ; sinon simplement ignoré.
    console.log(`\n${name} : introuvable${requested.length ? '' : ', ignoré'} (variable ${CANDIDATES[name].env} pour l'indiquer).`);
    if (requested.length) success = false;
    continue;
  }
  success = await runBrowser(name, exe) && success;
}
process.exit(success ? 0 : 1);
