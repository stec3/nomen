// civilta.js — la civiltà di un mondo, costruita una volta sul processore: le città, le strade che le
// collegano e l'indice che la scheda grafica legge per disegnarle (PROGETTO.md, 2.5).
// I tiri vengono da mischia su interi e le scelte usano solo + − × ÷ e radici: niente Math.random e
// niente trigonometria, così lo stesso nome dà la stessa civiltà su ogni dispositivo.
import { componi, fi, mischia } from './nome.js';
import { creaTerreno } from './terreno.js';

export const LATO = 64; // celle per lato di ogni faccia del cubo, nell'indice
export const LARGO = 512; // larghezza della tabella dei dati
export const PER_CELLA = 20; // elementi al massimo in una cella
export const LARGHEZZA = [0, 0.0000035, 0.0000055, 0.000009]; // strada locale, statale, autostrada, in raggi

const QUANTE = [0, 50, 180, 480, 1100, 1100]; // città per livello, con il 30 % di terre (il 5 usa la rete del 4)
const RCAP = [0, 0.0022, 0.0042, 0.0065, 0.0085, 0.0085]; // raggio della capitale
const LUNGA = [0, 0.05, 0.12, 0.2, 0.3, 0.3]; // la strada più lunga
const R_MIN = 0.00025; // il paese più piccolo
const ZONA = 4.5; // fin dove arriva una città coi suoi campi, in raggi
const PUNTO = 0.006; // anche il paese più piccolo occupa le celle fin qui: da lontano è un punto di luce
const MARGINE = 0.002; // attorno a ogni elemento nell'indice: copre gli arrotondamenti della scheda grafica
const PASSO = 0.004; // passo con cui si guarda il terreno lungo una strada
const S3 = Math.sqrt(3) / 2;
const ESAGONO = [[1, 0], [0.5, S3], [-0.5, S3], [-1, 0], [-0.5, -S3], [0.5, -S3]];

/** La faccia del cubo (0-5) e le coordinate (u, v) tra -1 e 1 del punto: la stessa regola dello shader. */
export function faccia(x, y, z) {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  if (ax >= ay && ax >= az) return [x >= 0 ? 0 : 1, y / ax, z / ax];
  if (ay >= az) return [y >= 0 ? 2 : 3, x / ay, z / ay];
  return [z >= 0 ? 4 : 5, x / az, y / az];
}

/** La cella dell'indice che contiene il punto, come casella della tabella (riga per 6 · LATO colonne). */
export function cella(x, y, z) {
  const [f, u, v] = faccia(x, y, z);
  const i = Math.min(LATO - 1, Math.max(0, Math.floor((u + 1) * (LATO / 2))));
  const j = Math.min(LATO - 1, Math.max(0, Math.floor((v + 1) * (LATO / 2))));
  return j * 6 * LATO + f * LATO + i;
}

// r^−0,9, la legge di Zipf, senza pow: r^0,1 col metodo di Newton, partendo da r^(1/8) che sta sopra
function zipf(r) {
  let x = Math.sqrt(Math.sqrt(Math.sqrt(r)));
  for (let i = 0; i < 10; i++) {
    const x2 = x * x, x8 = x2 * x2 * x2 * x2;
    x = (9 * x + r / (x8 * x)) / 10;
  }
  return x / r;
}

const unita = (x, y, z) => {
  const l = Math.sqrt(x * x + y * y + z * z);
  return [x / l, y / l, z / l];
};
const distanza = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
const tra = (a, b, t) => unita(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

// due direzioni sul piano tangente nel punto n, come nello shader: t1 = cross(n, su), t2 = cross(n, t1)
function tangenti([x, y, z]) {
  const t1 = Math.abs(y) < 0.99 ? unita(-z, 0, x) : unita(0, z, -y);
  return [t1, [y * t1[2] - z * t1[1], z * t1[0] - x * t1[2], x * t1[1] - y * t1[0]]];
}

/**
 * Costruisce la civiltà di p (che deve averla). quota è il terreno di creaTerreno(p).
 * Restituisce le città (la prima è la capitale), le strade e le due tabelle per la scheda grafica.
 */
export function costruisci(p, quota = creaTerreno(p)) {
  const t0 = performance.now();
  const livello = p.civilta.livello;
  const [s0, s1, s2] = p.terreno.semi;
  const seme = mischia(s0 ^ mischia(s1 ^ mischia(s2 ^ 0x5bd1e995)));
  // un intero casuale per (flusso, a, b): ogni scelta ha il suo flusso, così non si spostano a vicenda
  const tiro = (flusso, a, b = 0) => mischia((mischia((mischia(seme ^ flusso) + a) | 0) ^ Math.imul(b + 1, 0x9e3779b1)) | 0);
  const caso = (flusso, a, b) => tiro(flusso, a, b) / 4294967296;
  const poli = p.terreno.poli;
  const terre = (1 - fi(p.terreno.mare / 0.33)) * Math.min(poli, 1);

  // --- città: candidati su una griglia 40 × 40 per faccia del cubo --------------------------------
  const G = 40;
  const candidati = [];
  for (let f = 0; f < 6; f++) {
    for (let j = 0; j < G; j++) {
      for (let i = 0; i < G; i++) {
        const id = (f * G + j) * G + i;
        const u = -1 + ((i + caso(1, id)) * 2) / G, v = -1 + ((j + caso(2, id)) * 2) / G;
        const s = f & 1 ? -1 : 1;
        const [x, y, z] = f < 2 ? unita(s, u, v) : f < 4 ? unita(u, s, v) : unita(u, v, s);
        const e = quota(x, y, z);
        if (!(e > 0.004 && e < 0.26 && Math.abs(y) < poli - 0.03)) continue;
        // città di costa: c'è mare entro 0,012 (due raggi di una capitale), in uno dei sei punti attorno
        const [t1, t2] = tangenti([x, y, z]);
        let costa = false;
        for (const [a, b] of ESAGONO) {
          const k = 0.012;
          const [qx, qy, qz] = unita(x + k * (a * t1[0] + b * t2[0]), y + k * (a * t1[1] + b * t2[1]), z + k * (a * t1[2] + b * t2[2]));
          if (quota(qx, qy, qz) < 0) {
            costa = true;
            break;
          }
        }
        // il centro sta un po' nell'entroterra: sulla riva metà città finirebbe in mare
        const riva = Math.min(1, e / 0.02);
        candidati.push({ id, c: [x, y, z], punti: caso(3, id) * (1 - e / 0.26) * riva * (costa ? 1.8 : 1) });
      }
    }
  }
  candidati.sort((a, b) => b.punti - a.punti || a.id - b.id);

  // le migliori, con la grandezza della legge di Zipf; chi sta troppo vicino a una più grande si scarta
  const voglio = Math.round((QUANTE[livello] * terre) / 0.3);
  const rcap = RCAP[livello];
  const citta = [];
  for (const k of candidati) {
    if (citta.length >= voglio) break;
    const rango = citta.length + 1;
    const pop = zipf(rango);
    const R = Math.max(R_MIN, rcap * Math.sqrt(pop));
    let libera = true;
    for (const d of citta) {
      const lim = 1.2 * (R + d.R);
      const dx = k.c[0] - d.c[0], dy = k.c[1] - d.c[1], dz = k.c[2] - d.c[2];
      if (dx * dx + dy * dy + dz * dz < lim * lim) {
        libera = false;
        break;
      }
    }
    if (!libera) continue;
    citta.push({
      c: k.c,
      R,
      pop,
      rango,
      angolo: caso(4, rango) * (Math.PI / 2), // l'orientamento delle vie: il reticolo si ripete ogni quarto di giro
      seme: tiro(5, rango) & 0xffff,
      nome: rango === 1 ? p.civilta.capitale : componi((i) => tiro(6, rango, i)),
    });
  }

  // --- strade -------------------------------------------------------------------------------------
  const n = citta.length;
  const d1 = new Float64Array(n).fill(Infinity), d2 = new Float64Array(n).fill(Infinity), dg = new Float64Array(n).fill(Infinity);
  const j1 = new Int32Array(n).fill(-1), j2 = new Int32Array(n).fill(-1), jg = new Int32Array(n).fill(-1);
  const vicina = (i, j, d) => {
    if (d >= d2[i]) return;
    if (d < d1[i]) {
      d2[i] = d1[i];
      j2[i] = j1[i];
      d1[i] = d;
      j1[i] = j;
    } else {
      d2[i] = d;
      j2[i] = j;
    }
  };
  for (let i = 0; i < n; i++) {
    const a = citta[i].c;
    for (let j = i + 1; j < n; j++) {
      const b = citta[j].c;
      const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
      vicina(i, j, d);
      vicina(j, i, d);
      if (d < dg[j]) {
        dg[j] = d; // per j, i è una città più grande
        jg[j] = i;
      }
    }
  }
  const lunga2 = LUNGA[livello] ** 2;
  const vicini = Array.from({ length: n }, () => new Set());
  const collega = (i, k, d) => {
    if (k < 0 || d > lunga2) return;
    vicini[i].add(k);
    vicini[k].add(i);
  };
  for (let i = 0; i < n; i++) {
    collega(i, jg[i], dg[i]); // a) l'ossatura: verso la più vicina tra le più grandi
    collega(i, j1[i], d1[i]); // b) le due più vicine, se la seconda non è troppo lontana: nascono gli anelli
    if (d2[i] <= 6.25 * d1[i]) collega(i, j2[i], d2[i]);
  }
  // c) via i tratti dove ci si passa già, dal più lungo: la rete resta connessa
  const dist = (i, k) => distanza(citta[i].c, citta[k].c);
  const archi = [];
  for (let i = 0; i < n; i++) for (const k of vicini[i]) if (k > i) archi.push([i, k, dist(i, k)]);
  archi.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
  for (const [i, k, d] of archi) {
    for (const j of vicini[i]) {
      if (j !== k && vicini[j].has(k) && dist(i, j) + dist(j, k) < 1.15 * d) {
        vicini[i].delete(k);
        vicini[k].delete(i);
        break;
      }
    }
  }

  // il percorso: una spezzata che gira attorno ai monti; il mare si passa solo coi ponti
  const peso = (e) => (e < 0 ? 10 - e : e); // l'acqua pesa molto più di qualunque monte
  function percorso(A, B) {
    const L = distanza(A, B);
    const m = Math.min(5, Math.max(1, Math.round(L / 0.025)));
    const punti = [A];
    for (let s = 1; s < m; s++) {
      const P = tra(A, B, s / m);
      const dir = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      const perp = unita(dir[1] * P[2] - dir[2] * P[1], dir[2] * P[0] - dir[0] * P[2], dir[0] * P[1] - dir[1] * P[0]);
      const lato = (0.1 * L) / m;
      let meglio = P, pm = peso(quota(...P));
      const p0 = pm;
      for (const k of [lato, -lato]) {
        const Q = unita(P[0] + k * perp[0], P[1] + k * perp[1], P[2] + k * perp[2]);
        const pq = peso(quota(...Q));
        if (pq < pm) {
          meglio = Q;
          pm = pq;
        }
      }
      punti.push(p0 - pm < 0.03 ? P : meglio); // dritta, se girare non conviene abbastanza
    }
    punti.push(B);
    let acqua = 0, tutti = 0, fila = 0, filaMax = 0;
    for (let s = 0; s < punti.length - 1; s++) {
      const P = punti[s], Q = punti[s + 1];
      const passi = Math.max(1, Math.ceil(distanza(P, Q) / PASSO));
      for (let t = s ? 1 : 0; t <= passi; t++) {
        const bagnato = quota(...tra(P, Q, t / passi)) < 0;
        tutti++;
        acqua += bagnato;
        fila = bagnato ? fila + 1 : 0;
        filaMax = Math.max(filaMax, fila);
      }
    }
    if (acqua > 0.12 * tutti || filaMax * PASSO > 0.012) return null;
    return { punti, ponte: acqua > 0 };
  }

  const strade = [];
  const grande = (i, parte) => i < parte * n; // tra le più popolose: le città sono in ordine di rango
  for (let i = 0; i < n; i++) {
    for (const k of vicini[i]) {
      if (k < i) continue;
      const via = percorso(citta[i].c, citta[k].c);
      if (!via) continue;
      const classe = livello >= 3 && grande(i, 0.12) && grande(k, 0.12) ? 3 : grande(i, 0.35) || grande(k, 0.35) ? 2 : 1;
      strade.push({ da: i, a: k, classe, ...via });
    }
  }

  // --- l'indice: per ogni cella le città e i tratti che la toccano ------------------------------------
  const celle = new Map();
  const metti = (idCella, el, viste) => {
    if (viste.has(idCella)) return;
    viste.add(idCella);
    let lista = celle.get(idCella);
    if (!lista) celle.set(idCella, (lista = []));
    lista.push(el);
  };
  citta.forEach((cit, ic) => {
    const rz = Math.max(ZONA * cit.R, PUNTO) + MARGINE;
    const [t1, t2] = tangenti(cit.c);
    const k = Math.ceil(rz / 0.006), passo = rz / k;
    const viste = new Set();
    const el = { tipo: 0, ordine: ic, cit };
    for (let a = -k; a <= k; a++) {
      for (let b = -k; b <= k; b++) {
        const x = cit.c[0] + passo * (a * t1[0] + b * t2[0]), y = cit.c[1] + passo * (a * t1[1] + b * t2[1]), z = cit.c[2] + passo * (a * t1[2] + b * t2[2]);
        metti(cella(x, y, z), el, viste);
      }
    }
  });
  let tratti = 0;
  for (const via of strade) {
    for (let s = 0; s < via.punti.length - 1; s++) {
      const P = via.punti[s], Q = via.punti[s + 1];
      const el = { tipo: via.classe, ordine: 4 - via.classe, P, Q, larghezza: LARGHEZZA[via.classe] };
      const passi = Math.max(1, Math.ceil(distanza(P, Q) / PASSO));
      const dir = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]];
      const viste = new Set();
      for (let t = 0; t <= passi; t++) {
        const S = tra(P, Q, t / passi);
        const perp = unita(dir[1] * S[2] - dir[2] * S[1], dir[2] * S[0] - dir[0] * S[2], dir[0] * S[1] - dir[1] * S[0]);
        for (const k of [0, MARGINE, -MARGINE]) metti(cella(S[0] + k * perp[0], S[1] + k * perp[1], S[2] + k * perp[2]), el, viste);
      }
      tratti++;
    }
  }

  // in ogni cella prima le città, dalla più grande, poi le strade dalla più importante;
  // oltre PER_CELLA escono per prime le strade locali
  let elementi = 0, pienaMax = 0, scartati = 0;
  for (const [id, lista] of celle) {
    lista.sort((a, b) => (a.tipo === 0 ? 0 : 1) - (b.tipo === 0 ? 0 : 1) || (a.tipo === 0 ? a.ordine - b.ordine : b.tipo - a.tipo));
    pienaMax = Math.max(pienaMax, lista.length);
    if (lista.length > PER_CELLA) {
      scartati += lista.length - PER_CELLA;
      lista.length = PER_CELLA;
    }
    elementi += lista.length;
    celle.set(id, lista);
  }
  const altezza = Math.max(1, Math.ceil((2 * elementi) / LARGO));
  const indice = new Float32Array(6 * LATO * LATO * 4);
  const dati = new Float32Array(LARGO * altezza * 4);
  let pos = 0;
  for (const [id, lista] of celle) {
    indice[id * 4] = pos;
    indice[id * 4 + 1] = lista.length;
    for (const el of lista) {
      const o = pos * 4;
      if (el.tipo === 0) dati.set([...el.cit.c, el.cit.R, el.cit.pop, el.cit.angolo, el.cit.seme, 0], o);
      else dati.set([...el.P, el.larghezza, ...el.Q, el.tipo], o);
      pos += 2;
    }
  }

  return {
    livello,
    citta,
    strade,
    indice: { larghezza: 6 * LATO, altezza: LATO, dati: indice },
    dati: { larghezza: LARGO, altezza, dati },
    misure: { candidati: candidati.length, citta: n, strade: strade.length, ponti: strade.filter((s) => s.ponte).length, tratti, elementi, pienaMax, scartati, ms: Math.round(performance.now() - t0) },
  };
}

/** L'impronta delle due tabelle: serve ai collaudi per dire che lo stesso nome dà la stessa civiltà. */
export function improntaTabelle(civ) {
  let a = 0x811c9dc5, b = civ.citta.length;
  for (const t of [civ.indice.dati, civ.dati.dati]) {
    const parole = new Uint32Array(t.buffer, t.byteOffset, t.length);
    for (let i = 0; i < parole.length; i++) {
      a = mischia(a ^ parole[i]);
      b = (Math.imul(b, 31) + a) | 0;
    }
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (mischia(b) >>> 0).toString(16).padStart(8, '0');
}
