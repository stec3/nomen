// main.js — la pagina: la casella del nome, l'indirizzo, la scheda del pianeta.
import { pianeta, descrivi, ripulisci } from './nome.js';
import { nomeACaso } from './nomi.js';
import { creaMotore } from './motore.js';
import { creaEtichette } from './etichette.js';

const italiano = (navigator.language || 'en').toLowerCase().startsWith('it');
const lingua = italiano ? 'it' : 'en';
const T = italiano
  ? {
      segnaposto: 'Scrivi un nome',
      vai: 'Crea il pianeta',
      caso: 'Un nome a caso',
      aiuto: 'Trascina per girarlo',
      copia: 'Copia il link',
      copiato: 'Copiato',
      particolari: 'Particolari',
      tratti: 'Particolarità',
      criteri: 'Per la vita',
      superficie: 'Superficie',
      vita: 'Vita',
      civilta: 'Civiltà',
      capitale: 'capitale',
      abitanti: 'abitanti',
      niente: 'Questo browser non ha WebGL2: il pianeta non si può disegnare.',
      pianetaDi: 'Il pianeta di',
    }
  : {
      segnaposto: 'Type a name',
      vai: 'Make the planet',
      caso: 'A random name',
      aiuto: 'Drag to spin it',
      copia: 'Copy link',
      copiato: 'Copied',
      particolari: 'Details',
      tratti: 'Features',
      criteri: 'For life',
      superficie: 'Surface',
      vita: 'Life',
      civilta: 'Civilization',
      capitale: 'capital',
      abitanti: 'people',
      niente: 'This browser has no WebGL2: the planet cannot be drawn.',
      pianetaDi: 'The planet of',
    };

const $ = (id) => document.getElementById(id);
const PREDEFINITO = 'Nomen';

document.documentElement.lang = lingua;
$('casella').placeholder = T.segnaposto;
$('casella').setAttribute('aria-label', T.segnaposto);
$('vai').setAttribute('aria-label', T.vai);
$('caso').setAttribute('aria-label', T.caso);
$('caso').title = T.caso;
$('copia').textContent = T.copia;
$('aiuto').textContent = T.aiuto;
$('apri').textContent = T.particolari;

let motore = null;
try {
  motore = creaMotore($('tela'));
} catch (errore) {
  console.error(errore);
}

// Il nome sta dopo il cancelletto: quella parte dell'indirizzo il browser non la manda a nessuno.
function nomeNellIndirizzo() {
  try {
    return ripulisci(decodeURIComponent(location.hash.slice(1)));
  } catch {
    return '';
  }
}

// Un elemento con la sua classe e il suo testo: la scheda si costruisce senza HTML scritto a mano.
function crea(tag, classe, testo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
}

function pastiglia(voce) {
  const li = crea('li', 'pastiglia', voce.nome);
  if (voce.unoSu) li.append(crea('small', '', voce.unoSu));
  return li;
}

function blocco(titolo, ...figli) {
  const s = crea('section', 'blocco');
  s.append(crea('h2', '', titolo), ...figli);
  return s;
}

// La scheda: chiusa dice nome, livello, «1 su N» e due particolarità; aperta, tutto il resto.
function riempi(p, d) {
  $('nome').textContent = p.nome;
  $('riga').textContent = d.riga;

  const livello = crea('span', 'livello', d.livello.nome);
  livello.dataset.livello = String(d.livello.indice);
  const rango = [livello];
  if (d.unoSu) rango.push(crea('span', 'uno-su', d.unoSu));
  if (d.titolo) rango.push(crea('span', 'titolo', d.titolo.nome));
  $('rango').replaceChildren(...rango);

  const voci = d.tratti.slice(0, 2).map(pastiglia);
  if (d.tratti.length > 2) {
    const altri = crea('button', 'pastiglia piu', `+${d.tratti.length - 2}`);
    altri.type = 'button';
    altri.addEventListener('click', () => ($('particolari').open = true));
    const li = crea('li');
    li.append(altri);
    voci.push(li);
  }
  $('tratti').replaceChildren(...voci);

  const foglio = [];
  if (d.tratti.length) {
    const ul = crea('ul', 'elenco');
    ul.append(...d.tratti.map(pastiglia));
    foglio.push(blocco(T.tratti, ul));
  }
  if (d.criteri) {
    const ul = crea('ul', 'criteri');
    for (const c of d.criteri) {
      const li = crea('li', c.ok ? 'ok' : 'no', c.nome);
      li.append(crea('span', '', c.valore));
      ul.append(li);
    }
    const righe = [ul, crea('p', 'nota', `${T.vita}: ${d.vita}`)];
    if (d.civilta) righe.push(crea('p', 'nota', `${T.civilta}: ${d.civilta.nome} · ${T.capitale} ${d.civilta.capitale} · ${d.civilta.abitanti} ${T.abitanti}`));
    foglio.push(blocco(T.criteri, ...righe));
  }
  const barra = crea('div', 'barra');
  const legenda = crea('ul', 'legenda');
  for (const s of d.superficie) {
    const pezzo = crea('i');
    pezzo.style.flexGrow = String(s.quota);
    pezzo.style.background = s.colore;
    barra.append(pezzo);
    const li = crea('li', '', `${s.nome} ${s.testo}`);
    const pallino = crea('b');
    pallino.style.background = s.colore;
    li.prepend(pallino);
    legenda.append(li);
  }
  foglio.push(blocco(T.superficie, barra, legenda));
  const righe = crea('dl', 'righe');
  for (const r of d.particolari) {
    const div = crea('div');
    div.append(crea('dt', '', r.etichetta), crea('dd', '', r.valore));
    righe.append(div);
  }
  foglio.push(righe);
  $('foglio').replaceChildren(...foglio);
}

function mostra(nome) {
  const p = pianeta(nome || PREDEFINITO);
  const d = descrivi(p, lingua);
  riempi(p, d);
  $('tela').setAttribute('aria-label', `${T.pianetaDi} ${p.nome}: ${d.riga}, ${d.livello.nome}`);
  document.title = nome ? `${p.nome} — Nomen` : 'Nomen';
  // la scheda sparisce e riappare insieme al pianeta; il livello arriva per ultimo
  const scheda = $('scheda');
  scheda.classList.remove('entra');
  void scheda.offsetWidth;
  scheda.classList.add('entra');
  motore.mostra(p);
}

function vaiA(nome) {
  if (nome === nomeNellIndirizzo()) mostra(nome);
  else location.hash = encodeURIComponent(nome);
}

if (!motore) {
  $('errore').textContent = T.niente;
  $('errore').hidden = false;
  $('scheda').hidden = true;
} else {
  $('forma').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = ripulisci($('casella').value);
    if (!nome) return;
    $('casella').value = '';
    $('casella').blur();
    vaiA(nome);
  });
  // il dado: un nome da provare, mai lo stesso di adesso
  $('caso').addEventListener('click', () => {
    let nome = nomeACaso();
    while (nome === nomeNellIndirizzo()) nome = nomeACaso();
    vaiA(nome);
  });
  window.addEventListener('hashchange', () => mostra(nomeNellIndirizzo()));
  $('tela').addEventListener('trascinato', () => $('aiuto').classList.add('via'), { once: true });
  $('copia').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $('copia').textContent = T.copiato;
      setTimeout(() => ($('copia').textContent = T.copia), 1600);
    } catch {
      /* senza permesso di copiare non succede niente: l'indirizzo resta nella barra */
    }
  });
  motore.ogniFotogramma(creaEtichette($('etichette'), motore));
  mostra(nomeNellIndirizzo());
  // per i collaudi e per chi vuole curiosare dalla console
  window.nomen = { motore, pianeta, descrivi, mostra };
}
