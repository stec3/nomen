// universo.js — la galassia (PROGETTO.md, fase 3): dove si vede un mondo dal cielo di un altro,
// quanto dura il salto, il cielo che cambia col posto e la collezione che vive nell'indirizzo.
// Funzioni pure, senza la pagina: le provano anche i collaudi con Node.
import { normalizza, ripulisci } from './nome.js';

/** Quanti mondi tiene la collezione, compreso quello dove si è. */
export const MASSIMO = 40;

const unita = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};

/** Rotazione da tre angoli, come matrice per colonne: porta il cielo del pianeta nella galassia (g = M · v). */
export function rotazione([a, b, c]) {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return [ca * cc + sa * sb * sc, cb * sc, -sa * cc + ca * sb * sc, -ca * sc + sa * sb * cc, cb * cc, sa * sc + ca * sb * cc, sa * cb, -sb, ca * cb];
}

// v = Mᵀ · g: dalla galassia al cielo del pianeta (la trasposta di una rotazione è la sua inversa)
const indietro = (m, g) => [m[0] * g[0] + m[1] * g[1] + m[2] * g[2], m[3] * g[0] + m[4] * g[1] + m[5] * g[2], m[6] * g[0] + m[7] * g[1] + m[8] * g[2]];

/** Distanza tra due mondi, in migliaia di anni luce. */
export function distanza(a, b) {
  const [p, q] = [a.posto.punto, b.posto.punto];
  return Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
}

/** La direzione in cui dal mondo a si vede il mondo b, nelle coordinate del cielo di a (quelle dello shader). */
export function verso(a, b) {
  const [p, q] = [a.posto.punto, b.posto.punto];
  return unita(indietro(rotazione(a.cielo.angoli), unita([q[0] - p[0], q[1] - p[1], q[2] - p[2]])));
}

/** Quanto dura il salto, in secondi: da 1,5 per i vicini a 4 per chi sta dall'altra parte della galassia. */
export function durata(migliaia) {
  return 1.5 + 2.5 * Math.min(1, Math.sqrt(migliaia / 40));
}

/**
 * Il cielo che dipende dal posto: verso il centro della galassia (nelle coordinate della galassia, come
 * le usa lo shader), la distanza dal centro, e il seme delle stelle, uguale per i mondi a meno di
 * 1.500 anni luce l'uno dall'altro. Così viaggiando le costellazioni cambiano davvero.
 */
export function cieloDelPosto(p) {
  const [x, y, z] = p.posto.punto;
  const r = Math.hypot(x, y, z);
  return {
    uBulbo: [-x / r, -y / r, -z / r, r],
    uStelleSeme: [Math.floor(x / 1.5), Math.floor(y / 1.5), Math.floor(z / 1.5)],
  };
}

// --- la collezione -------------------------------------------------------------

/** Toglie i doppioni (stesso nome normalizzato, vince il primo) e tiene al massimo MASSIMO nomi. */
export function senzaDoppioni(nomi) {
  const visti = new Set();
  const fuori = [];
  for (const grezzo of nomi) {
    // la barra separa i mondi nell'indirizzo, quindi dentro un nome non può stare
    const nome = ripulisci(String(grezzo).replaceAll('/', ' '));
    const chiave = normalizza(nome);
    if (!chiave || visti.has(chiave)) continue;
    visti.add(chiave);
    fuori.push(nome);
    if (fuori.length === MASSIMO) break;
  }
  return fuori;
}

/** La collezione scritta dopo il cancelletto: «#Estia/Elena/Leto», il primo è dove si è. */
export function leggiCollezione(frammento) {
  const testo = String(frammento ?? '').replace(/^#/, '');
  if (!testo) return [];
  return senzaDoppioni(
    testo.split('/').map((pezzo) => {
      try {
        return decodeURIComponent(pezzo);
      } catch {
        return pezzo;
      }
    }),
  );
}

export function scriviCollezione(nomi) {
  return senzaDoppioni(nomi).map(encodeURIComponent).join('/');
}

/** Si va in un mondo: passa in testa; se c'era già, si sposta lì senza doppioni. */
export function aggiungi(nomi, nome) {
  return senzaDoppioni([nome, ...nomi]);
}
