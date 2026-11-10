// Collaudi di js/nome.js: un nome, un pianeta, per sempre; e quello che la scheda dice è vero.
// Si lanciano con: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pianeta, normalizza, descrivi, fi, TIPI, ELENCO_TRATTI, ELENCO_PRIMATI, ELENCO_TITOLI } from '../js/nome.js';
import { nomeACaso, NOMI } from '../js/nomi.js';
import { uniformi } from '../js/motore.js';
import { CAMPIONE, PASSO, FREQUENZE, QUOTE, CODA } from '../js/rarita.js';

const QUANTI = 200_000;
const PESI_TIPI = [26, 16, 16, 13, 9, 20];
// quanto può scostarsi una frequenza f misurata su n nomi: quattro deviazioni, più un margine
const scarto = (f, n) => 4 * Math.sqrt((f * (1 - f)) / n) + 0.0001;

// Un giro solo su 200.000 nomi diversi da quelli della misura (t0, t1…): i conti servono a più collaudi.
const conti = Object.fromEntries([...ELENCO_TRATTI, ...ELENCO_PRIMATI, ...ELENCO_TITOLI].map((id) => [id, 0]));
const tipi = Object.fromEntries(TIPI.map((t) => [t, 0]));
const livelli = [0, 0, 0, 0, 0, 0];
const punti = new Int32Array(QUANTI);
const impronte = new Set();
const civiltaSbagliate = [];
for (let i = 0; i < QUANTI; i++) {
  const p = pianeta(`t${i}`);
  for (const id of [...p.tratti, ...p.primati, ...p.titoli]) conti[id]++;
  tipi[p.tipo]++;
  livelli[p.rarita.livello]++;
  punti[i] = p.rarita.punti;
  impronte.add(`${p.seme[0]}.${p.seme[1]}`);
  if (Object.values(p.criteri).every(Boolean) !== (p.civilta !== null)) civiltaSbagliate.push(p.nome);
}

// Gli stessi percorsi di tools/oro.js: i valori di un pianeta come elenco piatto, a sei decimali.
function foglie(v, via = '', fuori = {}) {
  if (v === null || typeof v !== 'object') {
    const x = typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v;
    fuori[via] = x === 0 ? 0 : x;
    return fuori;
  }
  for (const [k, x] of Object.entries(v)) {
    if (!via && ['nome', 'chiave', 'rarita', 'titolo', 'scheda'].includes(k)) continue;
    foglie(x, via ? `${via}.${k}` : k, fuori);
  }
  return fuori;
}

test('lo stesso nome dà sempre lo stesso pianeta', () => {
  for (const nome of ['Atena', 'Zeus', 'Nomen', 'a', '名前', 'Ἀθηνᾶ']) assert.deepEqual(pianeta(nome), pianeta(nome));
});

test('spazi, maiuscole e accenti non cambiano il nome', () => {
  assert.equal(normalizza('  Atèna  '), 'atena');
  assert.equal(normalizza('ATENA'), normalizza(' atena '));
  assert.deepEqual(pianeta('Atèna').terreno, pianeta('atena').terreno);
});

test("nessuna collisione dell'impronta", () => assert.equal(impronte.size, QUANTI));

test('gli archetipi rispettano i pesi', () => {
  TIPI.forEach((tipo, i) => {
    const atteso = PESI_TIPI[i] / 100;
    const misurato = tipi[tipo] / QUANTI;
    assert.ok(Math.abs(misurato - atteso) <= scarto(atteso, QUANTI), `${tipo}: ${misurato}`);
  });
});

test('la civiltà nasce se e solo se ci sono i quattro criteri', () => assert.deepEqual(civiltaSbagliate, []));

test('Φ è la gaussiana cumulata', () => {
  assert.ok(Math.abs(fi(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(fi(1) - 0.8413) < 1e-4);
  assert.ok(Math.abs(fi(2) - 0.9772) < 1e-4);
  assert.ok(Math.abs(fi(-1) - 0.1587) < 1e-4);
});

test('le frequenze dichiarate sono quelle vere', () => {
  assert.ok(Object.keys(FREQUENZE).length > 0, 'tabelle vuote: lanciare node tools/rarita.js');
  for (const [id, f] of Object.entries(FREQUENZE)) {
    const misurata = conti[id] / QUANTI;
    assert.ok(Math.abs(misurata - f) <= scarto(f, QUANTI) + scarto(f, CAMPIONE), `${id}: dichiarata ${f}, misurata ${misurata}`);
  }
});

test('i livelli hanno le quote misurate', () => {
  QUOTE.forEach((q, l) => assert.ok(Math.abs(livelli[l] / QUANTI - q) <= 0.01, `livello ${l}: ${livelli[l] / QUANTI} contro ${q}`));
});

test('«1 su N» concorda con la coda misurata fino a 1 su 10.000', () => {
  const gradini = new Array(CODA.length + 1).fill(0);
  for (const x of punti) gradini[Math.min(Math.floor(x / PASSO), CODA.length)]++;
  let somma = gradini[CODA.length];
  for (let k = CODA.length - 1; k >= 0; k--) {
    somma += gradini[k];
    const atteso = CODA[k] / CAMPIONE;
    if (atteso < 1e-4) continue;
    const misurato = somma / QUANTI;
    assert.ok(Math.abs(misurato - atteso) <= scarto(atteso, QUANTI) + scarto(atteso, CAMPIONE), `${k * PASSO} punti: ${misurato} contro ${atteso}`);
  }
});

test('superficie, uniformi e scheda stanno in piedi su 20.000 nomi', () => {
  for (let i = 0; i < 20_000; i++) {
    const p = pianeta(`s${i}`);
    const somma = p.scheda.superficie.reduce((s, x) => s + x.parte, 0);
    assert.ok(Math.abs(somma - 1) < 1e-9 && p.scheda.superficie.every((x) => x.parte > 0), `${p.nome}: superficie ${somma}`);
    const u = uniformi(p);
    for (const [k, v] of Object.entries(u)) {
      const numeri = typeof v === 'number' ? [v] : Array.from(v);
      assert.ok(numeri.every(Number.isFinite), `${p.nome}: ${k} non finito`);
    }
    assert.ok(Array.from(u.uCol).every((c) => c >= 0 && c <= 1.5), `${p.nome}: colori fuori scala`);
    assert.ok(u.uSemeI.every((s) => Number.isInteger(s) && s >= 0 && s < 1 << 20), `${p.nome}: seme`);
    // i giganti gassosi non hanno mare: il loro livello sta a −9 apposta
    assert.ok((p.tipo === 'gassoso' || (u.uMare > -1 && u.uMare < 1.5)) && u.uPoli > 0.5 && u.uPoli <= 2, `${p.nome}: mare o poli`);
    if (i % 4) continue;
    for (const lingua of ['it', 'en']) {
      const d = descrivi(p, lingua);
      assert.equal(d.superficie.reduce((s, x) => s + x.parte, 0), 100, `${p.nome}: le percentuali non fanno 100`);
      const testo = JSON.stringify(d);
      assert.ok(!/undefined|NaN|Infinity/.test(testo), `${p.nome}: ${testo}`);
    }
  }
});

test('il dado dà nomi buoni', () => {
  assert.ok(NOMI.length >= 300);
  for (let i = 0; i < 2000; i++) {
    const nome = nomeACaso();
    assert.ok(nome.length >= 2 && nome.length <= 60 && nome === nome.trim(), nome);
  }
});

test('i pianeti di tests/oro.json non si sono spostati', () => {
  const oro = JSON.parse(readFileSync(new URL('./oro.json', import.meta.url), 'utf8'));
  for (const [nome, atteso] of Object.entries(oro.nomi)) {
    const p = pianeta(nome);
    assert.equal(p.tipo, atteso.tipo, nome);
    assert.deepEqual(p.tratti, atteso.tratti, nome);
    assert.equal(p.rarita.livello, atteso.livello, `${nome}: livello`);
    const ora = foglie(p);
    for (const [via, valore] of Object.entries(atteso.valori)) assert.deepEqual(ora[via], valore, `${nome}: ${via}`);
  }
});
