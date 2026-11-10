// elenco.js — che pianeta esce da un nome? Stampa una riga per nome.
// Uso: node tools/elenco.js Atena Zeus Luna     (senza nomi usa i nomi del dado)
//      node tools/elenco.js --con civilta       (solo i nomi con quel tipo, particolare o titolo)
import { pianeta, descrivi } from '../js/nome.js';
import { NOMI } from '../js/nomi.js';

const argomenti = process.argv.slice(2);
const dove = argomenti.indexOf('--con');
const filtro = dove >= 0 ? argomenti.splice(dove, 2)[1] : null;
for (const nome of argomenti.length ? argomenti : NOMI) {
  const p = pianeta(nome);
  if (filtro && ![p.tipo, ...p.tratti, ...p.primati, ...p.titoli].includes(filtro)) continue;
  const d = descrivi(p, 'it');
  const nubi = p.tipo === 'gassoso' ? '' : ` · nubi ${Math.round(p.nubi.copertura * 100)}%`;
  const extra = d.tratti.map((v) => v.nome).join(', ');
  const titolo = d.titolo ? ` · «${d.titolo.nome}»` : '';
  console.log(`${p.nome.padEnd(13)} ${d.livello.nome.padEnd(11)} ${d.unoSu.padEnd(16)} ${d.riga}${nubi}${extra ? ` · ${extra}` : ''}${titolo}`);
}
