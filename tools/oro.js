// oro.js — fissa in tests/oro.json i parametri di dodici nomi: i collaudi controllano che non cambino.
// Si rilancia solo per una scelta presa apposta: dopo il primo commit un nome non cambia pianeta.
// Uso: node tools/oro.js
import { writeFileSync } from 'node:fs';
import { pianeta } from '../js/nome.js';

const NOMI = ['Atena', 'Zeus', 'Gaia', 'Nettuno', 'Marte', 'Ermes', 'Giove', 'Iside', 'Orfeo', 'Aurora', 'Freya', 'Odino'];

// I valori di un pianeta come elenco piatto «percorso → valore», arrotondati a sei decimali.
// Restano fuori il nome, che è l'ingresso, e quello che dipende dalle tabelle misurate o è solo scheda.
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

const righe = NOMI.map((nome) => {
  const p = pianeta(nome);
  const voce = { tipo: p.tipo, tratti: p.tratti, livello: p.rarita.livello, valori: foglie(p) };
  return `    ${JSON.stringify(nome)}: ${JSON.stringify(voce)}`;
});
// un nome per riga: il file resta leggibile e le differenze si vedono
writeFileSync(new URL('../tests/oro.json', import.meta.url), `{\n  "versione": 1,\n  "nomi": {\n${righe.join(',\n')}\n  }\n}\n`);
console.log(`tests/oro.json: ${NOMI.length} nomi fissati`);
