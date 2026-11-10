// civilta.test.js — il terreno in JavaScript e la civiltà costruita (PROGETTO.md, 2.4 e 2.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pianeta, fi } from '../js/nome.js';
import { creaTerreno } from '../js/terreno.js';
import { costruisci, cella, improntaTabelle, PER_CELLA } from '../js/civilta.js';

// 4.000 punti sparsi in modo uniforme sulla sfera (spirale di Fibonacci)
const PUNTI = Array.from({ length: 4000 }, (_, i) => {
  const y = 1 - (2 * i + 1) / 4000, r = Math.sqrt(1 - y * y), a = i * 2.399963229728653;
  return [r * Math.cos(a), y, r * Math.sin(a)];
});

test('il terreno in JavaScript: la parte sotto il mare concorda con la scheda', () => {
  // un pianeta da solo ha pochi continenti grandi e si scosta anche di 7 punti: si confronta la media di 40
  let somma = 0, n = 0;
  for (let k = 0; n < 40; k++) {
    const p = pianeta(`m${k}`);
    if (p.tipo === 'gassoso') continue;
    const quota = creaTerreno(p);
    const sotto = PUNTI.filter(([x, y, z]) => quota(x, y, z) < 0).length / PUNTI.length;
    somma += sotto - fi(p.terreno.mare / 0.33);
    n++;
  }
  assert.ok(Math.abs(somma / n) < 0.03, `scarto medio ${(somma / n).toFixed(3)}`);
});

// mondi con civiltà di ogni livello e tipo: villaggi, città, nazioni, mondo connesso, pianeta-città
const NOMI = ['Gaia', 'Atena', 'Leto', 'Estia', 'Eos', 'Narciso', 'Sif', 'Elena', 'Mnemosine', 'Penelope'];
const civilta = new Map(NOMI.map((nome) => {
  const p = pianeta(nome);
  return [nome, { p, quota: creaTerreno(p), civ: costruisci(p) }];
}));

test('ogni città sta sulla terra e fuori dalle calotte', () => {
  for (const [nome, { p, quota, civ }] of civilta) {
    assert.ok(civ.citta.length > 0, `${nome}: nessuna città`);
    for (const c of civ.citta) {
      assert.ok(quota(...c.c) > 0.004, `${nome}: ${c.nome} in mare`);
      assert.ok(Math.abs(c.c[1]) < p.terreno.poli - 0.03, `${nome}: ${c.nome} sul ghiaccio`);
    }
  }
});

test("ogni strada resta dentro il limite d'acqua", () => {
  for (const [nome, { quota, civ }] of civilta) {
    for (const s of civ.strade) {
      let acqua = 0, tutti = 0, fila = 0, filaMax = 0;
      for (let i = 0; i < s.punti.length - 1; i++) {
        const [P, Q] = [s.punti[i], s.punti[i + 1]];
        const passi = Math.max(1, Math.ceil(Math.hypot(P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]) / 0.004));
        for (let t = i ? 1 : 0; t <= passi; t++) {
          const v = P.map((x, k) => x + (Q[k] - x) * (t / passi));
          const l = Math.hypot(...v);
          const bagnato = quota(v[0] / l, v[1] / l, v[2] / l) < 0;
          tutti++;
          acqua += bagnato;
          fila = bagnato ? fila + 1 : 0;
          filaMax = Math.max(filaMax, fila);
        }
      }
      assert.ok(acqua <= 0.12 * tutti && filaMax <= 3, `${nome}: strada ${s.da}-${s.a} troppo bagnata`);
      assert.equal(s.ponte, acqua > 0, `${nome}: ponte`);
    }
  }
});

test('ogni città si ritrova nella cella del suo centro', () => {
  for (const [nome, { civ }] of civilta) {
    const indice = civ.indice.dati, dati = civ.dati.dati;
    let piena = 0;
    for (let id = 0; id < indice.length / 4; id++) piena = Math.max(piena, indice[id * 4 + 1]);
    assert.ok(piena <= PER_CELLA, `${nome}: cella con ${piena} elementi`);
    for (const c of civ.citta) {
      const id = cella(...c.c);
      let trovata = false;
      for (let k = 0; k < indice[id * 4 + 1]; k++) {
        const o = (indice[id * 4] + 2 * k) * 4;
        if (dati[o + 7] === 0 && dati[o + 4] === Math.fround(c.pop) && dati[o] === Math.fround(c.c[0])) trovata = true;
      }
      assert.ok(trovata, `${nome}: ${c.nome} manca nella sua cella`);
    }
  }
});

test('lo stesso nome dà la stessa civiltà', () => {
  const oro = JSON.parse(readFileSync(new URL('./oro.json', import.meta.url), 'utf8')).civilta ?? {};
  for (const [nome, { p, civ }] of civilta) {
    const impronta = improntaTabelle(civ);
    assert.equal(improntaTabelle(costruisci(p)), impronta, `${nome}: due costruzioni diverse`);
    if (oro[nome]) assert.equal(impronta, oro[nome], `${nome}: la civiltà è cambiata rispetto a tests/oro.json`);
  }
  assert.ok(Object.keys(oro).length >= 3, 'tests/oro.json non ha le impronte delle civiltà');
});
