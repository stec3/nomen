// rarita.js — quanto è raro ogni particolare? Lo misura su milioni di nomi e scrive le tabelle.
// Uso: node tools/rarita.js [quanti]        (predefinito 3.000.000: un paio di minuti)
// Scrive js/rarita.js, che la scheda legge, e docs/misure/rarita.json, gli stessi numeri per chi controlla.
// I nomi sono r0, r1, r2…; i collaudi ne usano altri (t0, t1…), così la misura si verifica su nomi nuovi.
import { mkdirSync, writeFileSync } from 'node:fs';
import { pianeta, TIPI, ELENCO_TRATTI, ELENCO_PRIMATI, ELENCO_TITOLI } from '../js/nome.js';

const QUANTI = Number(process.argv[2] ?? 3_000_000);
const PASSO = 25; // la coda si conta a gradini di 25 centesimi di bit
const MINIMO = 30; // sotto questi nomi nel campione la coda non è più una misura
const OBIETTIVO = [0.55, 0.27, 0.12, 0.045, 0.013, 0.002]; // quote volute dei sei livelli, dal comune al mitico

const VOCI = [...ELENCO_TRATTI, ...ELENCO_PRIMATI]; // i particolari che danno punti
const bit = new Map(VOCI.map((id, i) => [id, i]));
const conti = Object.fromEntries([...VOCI, ...ELENCO_TITOLI].map((id) => [id, 0]));
const perTipo = Object.fromEntries(TIPI.map((t) => [t, { nomi: 0, civilta: 0 }]));
const maschere = new Int32Array(QUANTI);

// 1. Un giro su tutti i nomi: quali particolari ha ognuno, un bit per particolare
const inizio = Date.now();
for (let i = 0; i < QUANTI; i++) {
  const p = pianeta(`r${i}`);
  let m = 0;
  for (const id of [...p.tratti, ...p.primati]) {
    m |= 1 << bit.get(id);
    conti[id]++;
  }
  for (const id of p.titoli) conti[id]++;
  maschere[i] = m;
  perTipo[p.tipo].nomi++;
  if (p.civilta) perTipo[p.tipo].civilta++;
  if (i > 0 && i % 500_000 === 0) console.error(`  ${i.toLocaleString('it-IT')} nomi…`);
}

// 2. Frequenze e pesi: un particolare che esce con frequenza f vale log2(1/f) bit, in centesimi
const tondo = (x) => Number(x.toPrecision(6));
const FREQUENZE = Object.fromEntries(Object.entries(conti).map(([id, n]) => [id, tondo(n / QUANTI)]));
const PESI = {};
for (const id of VOCI) {
  const f = conti[id] / QUANTI;
  if (f > 0 && f <= 0.2) PESI[id] = Math.round(100 * Math.log2(1 / f));
}

// 3. I punti di ogni nome e la coda: quanti nomi hanno almeno tanti punti, a gradini
const pesoBit = VOCI.map((id) => PESI[id] ?? 0);
const punti = new Int32Array(QUANTI);
for (let i = 0; i < QUANTI; i++) {
  let s = 0;
  for (let b = 0, m = maschere[i]; m; b++, m >>>= 1) if (m & 1) s += pesoBit[b];
  punti[i] = s;
}
let massimo = 0;
for (const x of punti) if (x > massimo) massimo = x;
const gradini = new Array(Math.floor(massimo / PASSO) + 1).fill(0);
for (const x of punti) gradini[Math.floor(x / PASSO)]++;
const coda = new Array(gradini.length);
for (let k = gradini.length - 1, somma = 0; k >= 0; k--) coda[k] = somma += gradini[k];
const fine = coda.findIndex((n) => n < MINIMO);
const CODA = fine < 0 ? coda : coda.slice(0, fine);

// 4. Le soglie dei livelli: per ognuno il punteggio che lascia sopra la quota voluta di nomi
const ordinati = punti.slice().sort();
const sopra = []; // [punti, parte dei nomi con almeno quei punti], per ogni punteggio diverso
for (let i = 0; i < QUANTI; ) {
  let j = i;
  while (j < QUANTI && ordinati[j] === ordinati[i]) j++;
  sopra.push([ordinati[i], (QUANTI - i) / QUANTI]);
  i = j;
}
const SOGLIE = [];
for (let l = 1, da = 1; l < OBIETTIVO.length; l++) {
  const voluta = OBIETTIVO.slice(l).reduce((a, b) => a + b, 0);
  const errore = (k) => Math.abs(Math.log(sopra[k][1] / voluta));
  let migliore = da;
  for (let k = da; k < sopra.length; k++) if (errore(k) < errore(migliore)) migliore = k;
  SOGLIE.push(sopra[migliore][0]);
  da = migliore + 1;
}
const livelli = new Array(OBIETTIVO.length).fill(0);
for (const x of punti) {
  let l = 0;
  while (l < SOGLIE.length && x >= SOGLIE[l]) l++;
  livelli[l]++;
}
const QUOTE = livelli.map((n) => tondo(n / QUANTI));

// 5. I file
const intestazione = `// Quanto è raro ogni particolare, misurato su ${QUANTI.toLocaleString('it-IT')} nomi (r0, r1, r2…).`;
const js = [
  '// rarita.js — scritto da tools/rarita.js: non si modifica a mano.',
  intestazione,
  `export const CAMPIONE = ${QUANTI};`,
  `export const PASSO = ${PASSO};`,
  `export const FREQUENZE = ${JSON.stringify(FREQUENZE)};`,
  '// pesi in centesimi di bit; solo i particolari che escono al massimo una volta su cinque',
  `export const PESI = ${JSON.stringify(PESI)};`,
  `export const SOGLIE = ${JSON.stringify(SOGLIE)};`,
  `export const QUOTE = ${JSON.stringify(QUOTE)};`,
  `// nomi del campione con almeno i × PASSO punti; dove sarebbero meno di ${MINIMO} la tabella finisce`,
  `export const CODA = ${JSON.stringify(CODA)};`,
  '',
].join('\n');
writeFileSync(new URL('../js/rarita.js', import.meta.url), js);
mkdirSync(new URL('../docs/misure/', import.meta.url), { recursive: true });
const civilta = Object.fromEntries(Object.entries(perTipo).map(([t, v]) => [t, tondo(v.civilta / v.nomi)]));
const misura = { campione: QUANTI, passo: PASSO, obiettivo: OBIETTIVO, quote: QUOTE, soglie: SOGLIE, frequenze: FREQUENZE, pesi: PESI, civiltaPerTipo: civilta, coda: CODA };
writeFileSync(new URL('../docs/misure/rarita.json', import.meta.url), `${JSON.stringify(misura, null, 1)}\n`);

console.log(`${QUANTI.toLocaleString('it-IT')} nomi in ${Math.round((Date.now() - inizio) / 1000)} s`);
console.log(`quote dei livelli: ${QUOTE.map((q) => `${(q * 100).toFixed(2)}%`).join(' / ')}  (soglie ${SOGLIE.join(', ')})`);
console.log(`civiltà per tipo: ${Object.entries(civilta).map(([t, f]) => `${t} ${(f * 100).toFixed(1)}%`).join(', ')}`);
for (const [id, f] of Object.entries(FREQUENZE)) console.log(`  ${id.padEnd(15)} 1 su ${f ? Math.round(1 / f) : '∞'}${PESI[id] ? `  (${PESI[id]} punti)` : ''}`);
