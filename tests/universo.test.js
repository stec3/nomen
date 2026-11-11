// Collaudi della galassia (js/universo.js): direzioni tra i mondi, durata del salto, posto, collezione.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pianeta, descrivi } from '../js/nome.js';
import { verso, durata, distanza, rotazione, leggiCollezione, scriviCollezione, aggiungi, MASSIMO } from '../js/universo.js';

// Dal cielo di un pianeta alla galassia: g = M · v, con M per colonne.
function nellaGalassia(p, v) {
  const m = rotazione(p.cielo.angoli);
  return [0, 1, 2].map((i) => m[i] * v[0] + m[3 + i] * v[1] + m[6 + i] * v[2]);
}

test('verso: una direzione unitaria, opposta a quella del ritorno se riportate nella galassia', () => {
  const a = pianeta('Estia');
  const b = pianeta('Elena');
  const andata = verso(a, b);
  const ritorno = verso(b, a);
  assert.ok(Math.abs(Math.hypot(...andata) - 1) < 1e-9);
  const ga = nellaGalassia(a, andata);
  const gb = nellaGalassia(b, ritorno);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(ga[i] + gb[i]) < 1e-9);
});

test('durata del salto: da 1,5 a 4 secondi, e cresce con la distanza', () => {
  assert.equal(durata(0), 1.5);
  assert.equal(durata(1000), 4);
  const d = durata(distanza(pianeta('Estia'), pianeta('Leto')));
  assert.ok(d >= 1.5 && d <= 4);
  assert.ok(durata(5) < durata(20));
});

test('il posto nella galassia è stabile e si scrive nella scheda', () => {
  const uno = pianeta('Estia').posto;
  assert.deepEqual(pianeta('Estia').posto, uno);
  assert.ok(uno.distanza >= 2 && uno.distanza <= 26);
  assert.match(descrivi(pianeta('Estia'), 'it').posto, /^Braccio .+ · [\d.]+ anni luce dal centro$/);
});

test('la collezione nell\'indirizzo: andata e ritorno, niente doppioni, al massimo 40, niente barre', () => {
  const nomi = ['Estia', 'Città Nuova', 'Leto'];
  assert.deepEqual(leggiCollezione('#' + scriviCollezione(nomi)), nomi);
  assert.deepEqual(aggiungi(['Estia', 'Elena'], 'Elena'), ['Elena', 'Estia']);
  const tanti = Array.from({ length: 50 }, (_, i) => `Mondo ${i}`);
  assert.equal(aggiungi(tanti, 'Nomen').length, MASSIMO);
  assert.ok(leggiCollezione('#Alfa%2FBeta').every((n) => !n.includes('/')));
});
