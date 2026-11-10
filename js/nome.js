// nome.js — dal nome al pianeta.
// Modulo puro: niente pagina, niente WebGL. Lo usano il sito e i collaudi con Node.
// Regola d'oro: lo stesso nome dà sempre gli stessi numeri, su ogni dispositivo. Per questo le soglie che
// decidono qualcosa (tratti, criteri, livelli) si calcolano solo con + − × ÷, radici e interi: seno,
// esponenziali e potenze possono cambiare l'ultimo bit da un browser all'altro, e servono solo per i
// numeri che si mostrano o si disegnano.
import { FREQUENZE, PESI, SOGLIE, CODA, CAMPIONE, PASSO } from './rarita.js';

export const VERSIONE = 1;

// Direzione della stella e posa iniziale della camera: fisse, uguali per tutti.
export const SOLE = normale([-0.62, 0.3, 0.72]);
export const CAMERA = { giro: 0, alzo: 0.22 };

export const TIPI = ['terrestre', 'oceanico', 'desertico', 'ghiacciato', 'lavico', 'gassoso'];
const PESI_TIPI = [26, 16, 16, 13, 9, 20];

// I particolari che danno punti: i tratti (si vedono sul pianeta) e i primati (le code delle misure).
// I titoli sono combinazioni con un nome: si mostrano, ma non danno punti.
export const ELENCO_TRATTI = ['aurora', 'civilta', 'asse', 'dueSoli', 'nebulosa', 'mariLuce', 'esagono', 'oceanoGlobale', 'cromatico', 'pianetaCitta'];
export const ELENCO_PRIMATI = ['lunaGigante', 'anelliImmensi', 'giornoLampo', 'giornoEterno', 'colosso', 'minuscolo', 'rigoglio', 'treCicloni', 'cieloCoperto'];
export const ELENCO_TITOLI = ['gemello', 'notteAccesa', 'sottoDueSoli', 'civiltaDeserto', 'incoronato', 'giardino', 'perla'];

// ---------------------------------------------------------------------------
// 1. Pulizia del nome
// ---------------------------------------------------------------------------

const LUNGHEZZA_MASSIMA = 60;

/** Il nome come si mostra: spazi in ordine, lunghezza limitata. */
export function ripulisci(nome) {
  const testo = String(nome ?? '')
    .normalize('NFC')
    .replace(/[\p{Cc}​-‍⁠﻿]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return [...testo].slice(0, LUNGHEZZA_MASSIMA).join('').trim();
}

/** La chiave che decide il pianeta: «Stefano», « stefano » e «STÉFANO» sono lo stesso nome. */
export function normalizza(nome) {
  return ripulisci(nome)
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accenti e segni delle lettere latine, greche e cirilliche
    .normalize('NFC')
    .replace(/\s+/gu, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// 2. Dal testo ai numeri
// ---------------------------------------------------------------------------

const codifica = new TextEncoder();

// Rimescola i bit di un intero a 32 bit (è il passo finale di MurmurHash3).
function mischia(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Impronta a 64 bit di un testo, in due metà: due passate diverse sugli stessi byte. */
export function impronta(testo) {
  const byte = codifica.encode(testo);
  let a = 0x811c9dc5; // FNV-1a
  let b = 0x9e3779b9; // rotazione, xor e moltiplicazione
  for (let i = 0; i < byte.length; i++) {
    a = Math.imul(a ^ byte[i], 0x01000193);
    b = (Math.imul(((b << 5) | (b >>> 27)) ^ byte[i], 0xcc9e2d51) + 0xe6546b64) | 0;
  }
  a = mischia(a ^ byte.length);
  b = mischia(b ^ a);
  return [a, b];
}

const improntaChiavi = new Map();

/**
 * Un flusso di numeri per ogni parametro, legato al nome del parametro.
 * Così aggiungere un parametro nuovo non sposta quelli che esistono già.
 */
function dadi(seme) {
  const intero = (chiave) => {
    let k = improntaChiavi.get(chiave);
    if (!k) improntaChiavi.set(chiave, (k = impronta(chiave)));
    return mischia(mischia(seme[0] ^ k[0]) ^ Math.imul(seme[1] ^ k[1], 0x9e3779b1));
  };
  const u = (chiave) => intero(chiave) / 4294967296;
  return {
    intero,
    u,
    tra: (chiave, min, max) => min + (max - min) * u(chiave),
    prob: (chiave, p) => intero(chiave) < p * 4294967296,
    // Scelta pesata fatta con soli interi: nessun arrotondamento può cambiarla.
    scegli(chiave, pesi) {
      const totale = pesi.reduce((s, p) => s + p, 0);
      let x = intero(chiave) % (totale * 1000);
      for (let i = 0; i < pesi.length; i++) {
        x -= pesi[i] * 1000;
        if (x < 0) return i;
      }
      return pesi.length - 1;
    },
  };
}

/** Gaussiana cumulata Φ(z) con soli + − × ÷ (Abramowitz e Stegun, 26.2.19): uguale su ogni dispositivo. */
export function fi(z) {
  if (z < 0) return 1 - fi(-z);
  let s = 1 + z * (0.049867347 + z * (0.0211410061 + z * (0.0032776263 + z * (0.0000380036 + z * (0.0000488906 + z * 0.000005383)))));
  s *= s;
  s *= s;
  s *= s;
  s *= s; // la sedicesima potenza, con quattro quadrati
  return 1 - 0.5 / s;
}

// Nomi inventati, fatti di sillabe: le capitali delle civiltà e metà dei nomi del dado.
const ATTACCHI = ['', '', 'b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'br', 'dr', 'kr', 'tr', 'st', 'th', 'sh'];
const VOCALI = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'i', 'o', 'a', 'ia', 'io', 'ae', 'ei'];
const LEGAMI = ['l', 'm', 'n', 'r', 's', 't', 'v', 'd', 'k', 'nd', 'nt', 'ndr', 'rr', 'll', 'ss', 'st', 'tr', 'lv', 'rv', 'th'];
const FINALI = ['', '', '', '', 'n', 'r', 's', 'l'];

/** Un nome inventato di due o tre sillabe; intero(i) dà l'i-esimo numero casuale, intero e positivo. */
export function componi(intero) {
  const pesca = (lista, i) => lista[intero(i) % lista.length];
  const sillabe = intero(0) % 3 === 0 ? 3 : 2;
  let s = pesca(ATTACCHI, 1) + pesca(VOCALI, 2);
  for (let k = 1; k < sillabe; k++) s += pesca(LEGAMI, 1 + 2 * k) + pesca(VOCALI, 2 + 2 * k);
  s += pesca(FINALI, 9);
  return s[0].toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// 3. Colori
// ---------------------------------------------------------------------------

// Da «rrggbb» (sRGB) a tre numeri lineari: i conti della luce si fanno in lineare.
function colore(hex) {
  return [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

// Ruota la tinta attorno all'asse dei grigi: una piccola variazione che non rovina la tavolozza.
function ruotaTinta([r, g, b], angolo) {
  const c = Math.cos(angolo);
  const s = Math.sin(angolo);
  const k = (1 - c) / 3;
  const q = s / Math.sqrt(3);
  return [
    Math.max(0, r * (c + k) + g * (k - q) + b * (k + q)),
    Math.max(0, r * (k + q) + g * (c + k) + b * (k - q)),
    Math.max(0, r * (k - q) + g * (k + q) + b * (c + k)),
  ];
}

const misto = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const liscio = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Da tre numeri lineari al colore «#rrggbb» che si scrive nella pagina. */
export function esadecimale(c) {
  const canale = (v) => {
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, s)) * 255).toString(16).padStart(2, '0');
  };
  return `#${c.map(canale).join('')}`;
}

// Caselle di una tavolozza, in quest'ordine (per i giganti gassosi le caselle 2-6 sono le fasce,
// la 7 i poli e la 9 la tempesta):
// 0 abisso · 1 costa · 2 sabbia · 3 pianura · 4 bosco · 5 roccia · 6 vetta · 7 ghiaccio ·
// 8 nuvole · 9 crepe · 10 luce calda (città, lava incandescente) · 11 brace
// In fondo, dopo la barra: il colore del cielo.
const TAVOLOZZE = {
  terrestre: [
    '0b2a5b 1f6f9c c9b58a 4f7a3a 2f5a2c 6e6558 f2f4f7 e9f1f7 ffffff 3a3028 ffc27a 000000 | 4f8fe6',
    '0a3a4a 2a9aa0 d9c7a3 7a3f7e 4b2a63 5d5566 f4eef8 eef0fa fff6fb 2e2233 9fe8ff 000000 | 6fb5d9',
    '0c2f3f 2e7f86 dcc08a b5652a 7a3b1c 6a5a50 f6f1ea f0f3f5 fffaf2 3a2a20 ffd28a 000000 | 6aa6e8',
    '06283d 1fa187 e3d3a1 2f8f4e 17603a 575f57 ffffff e8f6f2 f7fffb 26302a fff0a8 000000 | 58c4c0',
    '0a1f55 2a62c0 e2cf9c b9a04e 7f7a35 7b6650 f3efe6 eef2f6 ffffff 3a3020 ffb866 000000 | 5a96f0',
    '14184f 3b56b8 ead9c0 d06a8f 8f3f6b 6b5a66 fff5fa f3eef7 fff7fa 33222c ffd9ef 000000 | 8d86f0',
  ],
  oceanico: [
    '071c4d 1c7fc2 e8dbb0 4b8f4a 2d6b3a 6f6a5f f5f7f8 eaf3f8 ffffff 30302a ffd9a0 000000 | 4c8ef0',
    '05364d 19b7b0 f1e3b8 56a05a 2f7a48 6a6a5a fbfbf5 eaf7f5 ffffff 2a3330 fff2b0 000000 | 55c7d6',
    '150f4a 5a4fc7 e0d2c0 8a6aa8 5b3f7a 665e70 f7f3fb f0eefa fdf9ff 2a2238 c9d8ff 000000 | 8a7bf0',
    '063a35 2fae7e e9dfb5 7aa24a 4a7a35 68705e f8faf2 ecf7f0 fbfff8 2a332a ffeeaa 000000 | 5fd0a0',
    '0e2233 3d6f8f cfc7b0 5d7a5a 3e5a48 606860 f2f4f4 e8eef2 f4f7fa 2a3033 ffd0a0 000000 | 7fa7c8',
  ],
  desertico: [
    '5a2a1c 8a4a2c d08a56 b5643a 9a4a2a 6f3a26 e9d3bd f4efe8 e9c9a8 3a1a12 ffd0a0 000000 | d9a06a',
    '7a5a2a b08a44 f0d08a dcae5e c08a3e 8a5f30 fff0cf fbf6ea f3dfb0 5a3a18 ffe0a0 000000 | e8c88a',
    'e6dcc8 c9b89a 8a7a6a 5f5550 45403f 2f2c2e b9b0a8 f1f1f1 cfc6ba 1a1718 ffd8b0 000000 | 9fb4d0',
    '3f2a3a 6a3f52 e9a66a d9773f b8502a 7a2f22 f5d9b8 f6efe6 f0c8a0 2a1420 ffc8a0 000000 | e09a7a',
    '4a4a1e 7a7a2a e6e08a c9c05a a09a3a 6a6a2a f5f5c8 f8f8e8 e8e8a8 2a2a10 f0ffa0 000000 | c8d07a',
  ],
  ghiacciato: [
    '5f8fb5 9cc4dc dfeaf2 eef4f8 dce8f0 b9c9d6 ffffff ffffff f4f9ff 8a4a3a c0e8ff 000000 | 9fd0ff',
    '1f4f9a 4f8fd6 cfe3f7 e6f1fb c9def5 9fb9dc ffffff ffffff f2f7ff 17306a a0d0ff 000000 | 7fb8ff',
    '2f8f8a 6fc9c0 d8f3ee ecfaf7 cfeee8 a3d3cc ffffff ffffff f3fffc 1f5f6a b0fff0 000000 | 8fe8dc',
    '6a5fa8 a79fe0 e9e4f8 f3f0fb dfd9f3 bdb4de ffffff ffffff f8f4ff c0507a e0c8ff 000000 | c0a8ff',
  ],
  lavico: [
    '120c0a 1a1210 2a2422 1f1b1b 171415 262022 3a3432 3a3432 3a2e2a ff5a14 ffd27a ff4a0c | ff7a3a',
    '0a0c12 10141c 22262e 1b1e26 14161c 20242c 343842 343842 2a3038 3aa0ff c8e8ff 2a7cff | 5a7aff',
    '140a08 1e100c 3a2a22 2e201a 221712 34261e 4a3a30 4a3a30 3a2a24 ff2a0a ffb060 e01a06 | c0503a',
    '100e0a 1a1610 2c2820 22201a 1a1814 2a2620 3e3a30 3e3a30 38322a ffb020 fff0b0 ff8a10 | e0a050',
  ],
  gassoso: [
    '000000 000000 d9c2a0 b8875a efe2c8 9a6a48 e8d0a8 7a6a60 ffffff c2552e 000000 000000 | c9b9a0',
    '000000 000000 e8d8a8 d9c084 f3e9c8 c9ac6e ecdcae b8a878 ffffff f5efda 000000 000000 | e8dcae',
    '000000 000000 2a5fd0 3f7fe6 1f4fb5 5a9af0 2f6fdc 1a3f9a ffffff 0f2f80 000000 000000 | 5a9aff',
    '000000 000000 9fe0e0 b5ecea 8fd6d8 c5f2ee a5e4e2 7fc8cc ffffff e8ffff 000000 000000 | a8f0f0',
    '000000 000000 6a3fa0 9a5fd0 4a2a80 c08ae8 7f4fb8 3a2060 ffffff f0c0ff 000000 000000 | b08aff',
    '000000 000000 7a1f14 d0502a 3a1210 f09a4a a8351c 2a0f10 ffffff ffd08a 000000 000000 | ff8a5a',
    '000000 000000 5fa87a d8e8c0 3f8a66 eff5d8 7fbf8a 2f6a50 ffffff f5ffe0 000000 000000 | a8e0b8',
    '000000 000000 e8a8b8 f5d0c0 c088a8 fae8d8 d898b0 a06888 ffffff fff0f0 000000 000000 | f0b8d0',
  ],
};

// Le tavolozze dei mondi cromatici, una per tipo: stesse caselle, colori che altrove non escono mai.
const CROMATICHE = {
  terrestre: '1a0b4a 6a3fc0 f0d890 e0702a b03a2a 5a3a4a fff4f0 f4ecff fff8f4 3a2030 ffd08a 000000 | b080ff',
  oceanico: '04303a 1fc8a0 fff2c8 e05a9a 9a2a6a 5a4a58 fffaf4 f0fff8 ffffff 30202a ffe0a8 000000 | 50f0c8',
  desertico: '0c2f3f 2e7f86 e8f4f4 a8dce4 70b8c8 3a6a7a ffffff f4fbff e4f6fa 0a2a3a a8f0ff 000000 | 8ae0f0',
  ghiacciato: '8a2a5a c85a8a f8d4e4 fdeaf2 f5cade e09ab8 ffffff ffffff fff2f8 5a1a3a ffc4e4 000000 | ff9ad0',
  lavico: '0a120a 101a10 222e22 1b261b 141c14 202c20 343e34 343e34 2a382a 3aff6a c8ffd0 1aff4a | 5aff8a',
  gassoso: '000000 000000 ff7ad9 ffd36e 7af0ff b98aff 7affb0 4a2a80 ffffff fff0a0 000000 000000 | ffd0f0',
};

// Luminosità e massa rispetto al Sole: servono a distanza e durata dell'anno.
const STELLE = [
  { id: 'rossa', peso: 14, colore: 'ffb48a', luminosita: 0.04, massa: 0.4 },
  { id: 'arancione', peso: 22, colore: 'ffd6ae', luminosita: 0.3, massa: 0.75 },
  { id: 'gialla', peso: 30, colore: 'fff3e4', luminosita: 1, massa: 1 },
  { id: 'bianca', peso: 19, colore: 'f7f6ff', luminosita: 5, massa: 1.5 },
  { id: 'azzurra', peso: 15, colore: 'd2ddff', luminosita: 40, massa: 3 },
];

const ANELLI = ['e8dcc0 b8a888', 'd8c8a0 9a7a50', 'cfd8e8 8fa0c0', 'e8b8a0 a06850', 'f0e8f8 b0a0d0', 'c8e8e0 78a8a0'];
const LUNE = ['b8b4ae', 'a89880', 'c8a078', 'd0dce8', 'd8c878', '8a8690', 'c09080'];
const CIELI = ['6a7cff ff9ad0', '5fd0ff b08aff', 'ffb37a 7aa8ff', '8affd0 6a8cff', 'ff8a9a 8a7aff', 'a0c0ff fff0c0'];
const AURORE = ['40ff9a', 'ff5ad0', '5ae0ff', 'b07aff'];

// ---------------------------------------------------------------------------
// 4. Il pianeta
// ---------------------------------------------------------------------------

function normale([x, y, z]) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}
const scalare = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vettoriale = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Quantile della gaussiana (approssimazione di Tukey): da «quanta parte del cielo è coperta» alla soglia.
const quantile = (p) => 4.91 * (p ** 0.14 - (1 - p) ** 0.14);

// Come sono fatti i sei tipi di mondo.
const BASI = {
  terrestre: { mare: [-0.1, 0.14], clima: 1, liquido: 1, crepe: [0, 0], rilievo: [0.05, 0.09], nubi: [0.22, 0.48], aria: [0.5, 0.85] },
  oceanico: { mare: [0.3, 0.52], clima: 0.8, liquido: 1, crepe: [0, 0], rilievo: [0.05, 0.08], nubi: [0.28, 0.52], aria: [0.5, 0.85] },
  desertico: { mare: [-0.35, -0.05], clima: 0.15, liquido: 0, crepe: [0.3, 0.7], rilievo: [0.07, 0.12], nubi: [0.02, 0.18], aria: [0.25, 0.5] },
  ghiacciato: { mare: [-0.15, 0.15], clima: 0, liquido: 0, crepe: [0.5, 0.9], rilievo: [0.03, 0.06], nubi: [0.05, 0.28], aria: [0.25, 0.55] },
  lavico: { mare: [-0.25, 0.05], clima: 0, liquido: 2, crepe: [0.5, 1], rilievo: [0.07, 0.12], nubi: [0.05, 0.25], aria: [0.3, 0.7] },
  gassoso: { mare: [-9, -9], clima: 0, liquido: 0, crepe: [0, 0], rilievo: [0, 0], nubi: [0, 0], aria: [0.4, 0.8] },
};
// Temperatura media (°C), raggio (km) e densità (g/cm³) per tipo: il resto della fisica ne discende.
const CLIMI = { terrestre: [-35, 65], oceanico: [-25, 65], desertico: [-60, 100], ghiacciato: [-230, -45], lavico: [350, 1500], gassoso: [-210, 700] };
const RAGGI = { terrestre: [4500, 9000], oceanico: [4500, 9000], desertico: [2800, 7500], ghiacciato: [1800, 7000], lavico: [3000, 8500], gassoso: [21000, 80000] };
const DENSITA = { terrestre: [5.0, 5.8], oceanico: [3.8, 5.0], desertico: [3.6, 5.2], ghiacciato: [1.6, 3.0], lavico: [5.2, 7.0], gassoso: [0.5, 1.8] };
// Calotte dei mondi temperati: da «a» quando fa più freddo a «b» quando fa più caldo.
const CALOTTE = { terrestre: [0.64, 0.97], oceanico: [0.7, 0.98], desertico: [0.85, 0.995] };

/** Tutto quello che c'è da sapere sul pianeta di un nome. */
export function pianeta(nomeGrezzo) {
  const nome = ripulisci(nomeGrezzo);
  const chiave = normalizza(nomeGrezzo);
  const seme = impronta(chiave);
  const d = dadi(seme);

  const tipoIndice = d.scegli('tipo', PESI_TIPI);
  const tipo = TIPI[tipoIndice];
  const roccioso = tipo !== 'gassoso';
  const base = BASI[tipo];

  // --- colori ---------------------------------------------------------------
  // Uno su 256 è «cromatico»: una tavolozza speciale del suo tipo, come gli esemplari rari dei videogiochi.
  const cromatico = d.prob('tratto.cromatico', 1 / 256);
  const serie = TAVOLOZZE[tipo];
  const tavolozzaIndice = Math.floor(d.u('tavolozza') * serie.length);
  const [caselle, cielo] = (cromatico ? CROMATICHE[tipo] : serie[tavolozzaIndice]).split(' | ');
  const tinta = d.tra('tinta', -0.13, 0.13);
  const colori = caselle.split(' ').map((hex) => ruotaTinta(colore(hex), tinta));
  if (tipo === 'gassoso' && d.prob('fasce.rovescio', 0.5)) {
    [colori[2], colori[6]] = [colori[6], colori[2]];
    [colori[3], colori[5]] = [colori[5], colori[3]];
  }
  const coloreCielo = ruotaTinta(colore(cielo), tinta);

  // --- stelle -----------------------------------------------------------------
  const S = STELLE[d.scegli('stella', STELLE.map((s) => s.peso))];
  const stella = { id: S.id, colore: colore(S.colore), luminosita: S.luminosita, massa: S.massa };
  let dueSoli = null;
  if (d.prob('tratto.dueSoli', 0.03)) {
    // la seconda stella sta a 10-25° dalla prima, in una direzione a caso attorno a lei
    const S2 = STELLE[d.scegli('dueSoli.stella', STELLE.map((s) => s.peso))];
    const angolo = d.tra('dueSoli.angolo', 0.175, 0.436);
    const verso = d.tra('dueSoli.verso', 0, Math.PI * 2);
    const e1 = normale(vettoriale(SOLE, [0, 1, 0]));
    const e2 = vettoriale(SOLE, e1);
    const lato = [0, 1, 2].map((i) => e1[i] * Math.cos(verso) + e2[i] * Math.sin(verso));
    dueSoli = { id: S2.id, colore: colore(S2.colore), direzione: normale(SOLE.map((s, i) => s * Math.cos(angolo) + lato[i] * Math.sin(angolo))) };
  }

  // --- clima e aria -----------------------------------------------------------
  const [tMin, tMax] = CLIMI[tipo];
  const xT = d.u('fisica.temperatura');
  const temperatura = tMin + (tMax - tMin) * xT;
  const forzaAria = d.tra('aria.forza', ...base.aria);
  const r = forzaAria / 0.65;
  const pressione = roccioso ? r * r * r : null; // atmosfere: è la stessa aria che disegna l'alone

  // --- mari, terre, ghiacci -----------------------------------------------------
  let liquido = base.liquido;
  let mare = d.tra('terreno.mare', ...base.mare);
  // deserti con le falde: laghi salati dall'1 al 6 % della superficie
  if (tipo === 'desertico' && d.prob('falde', 0.4)) {
    liquido = 1;
    mare = d.tra('falde.mare', -0.75, -0.5);
    colori[0] = ruotaTinta(colore('0c2f3f'), tinta);
    colori[1] = ruotaTinta(colore('2e7f86'), tinta);
  }
  const oceanoGlobale = tipo === 'oceanico' && d.prob('tratto.oceanoGlobale', 0.05);
  if (oceanoGlobale) mare = 1.2;

  // calotte: più fa freddo più sono grandi, e sopra i 45 °C non ci sono
  let poli = 2;
  if (CALOTTE[tipo] && temperatura <= 45) {
    const [a, b] = CALOTTE[tipo];
    poli = a + (b - a) * Math.sqrt(xT * Math.sqrt(xT)) + (d.u('terreno.poli') - 0.5) * 0.03; // x^0,75 con le sole radici
  }
  const k = Math.min(poli, 1);
  const sommerso = fi(mare / 0.33); // il terreno ha deviazione 0,33: questa è la parte sotto il livello del mare
  let superficie;
  if (tipo === 'ghiacciato') superficie = [['ghiaccio', 1]];
  else if (tipo === 'lavico') superficie = [['lava', sommerso], ['crosta', 1 - sommerso]];
  else if (tipo === 'gassoso') {
    const idrogeno = d.tra('gas.idrogeno', 0.75, 0.92);
    const tracce = d.tra('gas.tracce', 0.002, 0.02);
    superficie = [['idrogeno', idrogeno], ['elio', 1 - idrogeno - tracce], ['tracce', tracce]];
  } else if (liquido === 1) superficie = [['acqua', sommerso * k], ['terre', (1 - sommerso) * k], ['ghiacci', 1 - k]];
  else superficie = [['terre', k], ['ghiacci', 1 - k]];
  superficie = superficie.filter(([, x]) => x > 0);
  const parte = (id) => superficie.find(([quale]) => quale === id)?.[1] ?? 0;

  // --- vita -------------------------------------------------------------------
  // Quattro criteri, uguali per tutti i mondi: con tutti e quattro nasce una civiltà.
  const criteri = {
    acqua: liquido === 1,
    clima: temperatura >= -5 && temperatura <= 40,
    aria: pressione !== null && pressione >= 0.2,
    terre: parte('terre') >= 0.08,
  };
  const soddisfatti = Object.values(criteri).filter(Boolean).length;
  const uv = d.u('vita');
  const vita = !criteri.acqua ? 0 : soddisfatti === 4 ? 0.6 + 0.4 * uv : soddisfatti === 3 ? 0.2 + 0.4 * uv : 0.02 + 0.18 * uv;
  if (liquido === 1) {
    // la vita si vede: senza, pianure e boschi restano terra nuda, tra la sabbia e la roccia
    const verde = liscio(0.05, 0.7, vita);
    const spoglio = misto(colori[2], colori[5], 0.45);
    colori[3] = misto(spoglio, colori[3], verde);
    colori[4] = misto(spoglio, colori[4], verde);
  }

  // --- fisica -------------------------------------------------------------------
  const giorno = d.tra('giorno', roccioso ? 70 : 45, roccioso ? 150 : 80); // secondi per un giro su sé stesso
  const raggio = d.tra('fisica.raggio', ...RAGGI[tipo]);
  const densita = d.tra('fisica.densita', ...DENSITA[tipo]);
  // la distanza a cui la luce della stella dà questa temperatura (l'aria scalda un po')
  const kelvin = Math.max(25, temperatura + 273.15 - (roccioso ? 33 * Math.min(pressione, 3) ** 0.3 : 0));
  const distanza = Math.sqrt(stella.luminosita) * (255 / kelvin) ** 2;
  const fisica = {
    temperatura,
    pressione,
    raggio,
    densita,
    gravita: (densita / 5.51) * (raggio / 6371),
    distanza,
    anno: 365.25 * Math.sqrt(distanza ** 3 / stella.massa), // terza legge di Keplero, in giorni terrestri
    giornoOre: giorno * (roccioso ? 0.24 : 0.2),
  };

  // --- civiltà --------------------------------------------------------------------
  let civilta = null;
  if (soddisfatti === 4) {
    const livello = 1 + d.scegli('civilta.livello', [340, 360, 220, 74, 6]); // villaggi … pianeta-città
    civilta = {
      livello,
      capitale: componi((i) => d.intero(`civilta.capitale.${i}`)),
      abitanti: 10 ** (5.5 + 1.1 * livello) * (parte('terre') / 0.3) * (raggio / 6371) ** 2 * d.tra('civilta.abitanti', 0.6, 1.4),
    };
  }

  // --- anelli -----------------------------------------------------------------
  const probAnelli = { gassoso: 0.6, ghiacciato: 0.35 }[tipo] ?? 0.22;
  let anelli = null;
  if (d.prob('anelli', probAnelli)) {
    const interno = d.tra('anelli.interno', 1.3, 1.62);
    const [c1, c2] = ANELLI[Math.floor(d.u('anelli.colore') * ANELLI.length)].split(' ');
    anelli = {
      interno,
      esterno: Math.min(interno + d.tra('anelli.larghezza', 0.45, 1.1), 2.7),
      spessore: d.tra('anelli.spessore', 0.5, 1.6),
      seme: d.tra('anelli.seme', 0, 500),
      divisione: [d.tra('anelli.div.posto', 0.35, 0.75), d.tra('anelli.div.largo', 0.012, 0.035), d.tra('anelli.div.fondo', 0.6, 1)],
      colore: ruotaTinta(colore(c1), tinta),
      colore2: ruotaTinta(colore(c2), tinta),
    };
  }

  // --- asse -------------------------------------------------------------------
  // Con gli anelli si cerca una posa in cui dalla camera iniziale si vedano aperti e illuminati.
  const camera0 = [0, Math.sin(CAMERA.alzo), Math.cos(CAMERA.alzo)];
  const estremo = d.prob('asse.estremo', 0.06);
  let asse;
  let inclinazione;
  for (let i = 0; i < 12; i++) {
    inclinazione = estremo ? d.tra(`asse.inc.${i}`, 1.0, 1.5) : d.tra(`asse.inc.${i}`, 0.05, 0.56);
    const az = d.tra(`asse.az.${i}`, 0, Math.PI * 2);
    asse = [Math.sin(inclinazione) * Math.cos(az), Math.cos(inclinazione), Math.sin(inclinazione) * Math.sin(az)];
    if (!anelli) break;
    const versoCamera = scalare(asse, camera0);
    const versoSole = scalare(asse, SOLE);
    if (Math.abs(versoCamera) > 0.16 && Math.abs(versoCamera) < 0.55 && Math.abs(versoSole) > 0.15 && versoCamera * versoSole > 0) break;
  }

  // --- lune -------------------------------------------------------------------
  const quante = d.scegli('lune', tipo === 'gassoso' ? [8, 30, 34, 28] : [22, 38, 26, 14]);
  const lune = [];
  let orbita = Math.max(anelli ? anelli.esterno + 0.3 : 0, 1.9);
  for (let i = 0; i < quante; i++) {
    orbita += d.tra(`luna.${i}.passo`, i === 0 ? 0.1 : 0.6, i === 0 ? 0.9 : 1.3);
    lune.push({
      raggio: d.tra(`luna.${i}.raggio`, 0.045, i === 0 ? 0.14 : 0.1),
      orbita,
      fase: d.tra(`luna.${i}.fase`, 0, Math.PI * 2),
      inclinazione: d.tra(`luna.${i}.inclinazione`, -0.14, 0.14),
      nodo: d.tra(`luna.${i}.nodo`, 0, Math.PI * 2),
      velocita: 0.26 * orbita ** -1.5, // terza legge di Keplero: più lontana, più lenta
      colore: colore(LUNE[Math.floor(d.u(`luna.${i}.colore`) * LUNE.length)]),
    });
  }

  // --- nubi, tempeste, aria ---------------------------------------------------------
  const guadagno = d.tra('terreno.guadagno', 0.48, 0.56);
  const copertura = d.tra('nubi.copertura', ...base.nubi);
  const tempeste = [];
  if (tipo === 'gassoso') {
    const n = d.scegli('tempeste', [30, 45, 25]);
    for (let i = 0; i < n; i++) {
      const lat = d.tra(`tempesta.${i}.lat`, -0.6, 0.6);
      const lon = d.tra(`tempesta.${i}.lon`, 0, Math.PI * 2);
      tempeste.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon), d.tra(`tempesta.${i}.raggio`, 0.1, 0.24)]);
    }
  }
  // cicloni: centro (nel riferimento delle nuvole) e raggio, in radianti
  const cicloni = [];
  if (roccioso && copertura > 0.15) {
    const n = d.scegli('cicloni', [20, 40, 30, 10]);
    for (let i = 0; i < n; i++) {
      const lat = d.tra(`ciclone.${i}.lat`, 0.25, 0.9) * (d.prob(`ciclone.${i}.sud`, 0.5) ? -1 : 1);
      const lon = d.tra(`ciclone.${i}.lon`, 0, Math.PI * 2);
      cicloni.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon), d.tra(`ciclone.${i}.raggio`, 0.16, 0.34)]);
    }
  }
  const altezzaAria = d.tra('aria.altezza', roccioso ? 0.008 : 0.01, roccioso ? 0.012 : 0.015);

  // --- tratti rari: ognuno col suo tiro, e solo chi può averlo ------------------------
  const tratti = [];
  if (d.prob('tratto.aurora', 0.12)) tratti.push('aurora');
  if (civilta) tratti.push('civilta');
  if (estremo) tratti.push('asse');
  if (dueSoli) tratti.push('dueSoli');
  if (d.prob('tratto.nebulosa', 0.015)) tratti.push('nebulosa');
  if (liquido === 1 && vita >= 0.2 && d.prob('tratto.mariLuce', 0.018)) tratti.push('mariLuce');
  if (tipo === 'gassoso' && d.prob('tratto.esagono', 0.04)) tratti.push('esagono');
  if (oceanoGlobale) tratti.push('oceanoGlobale');
  if (cromatico) tratti.push('cromatico');
  if (civilta && civilta.livello === 5) tratti.push('pianetaCitta');

  // --- primati: le code delle misure che ci sono già ---------------------------------
  const primati = [];
  if (lune.length && lune[0].raggio > 0.13) primati.push('lunaGigante');
  if (anelli && d.u('anelli.larghezza') > 0.88) primati.push('anelliImmensi');
  if (d.u('giorno') < 0.04) primati.push('giornoLampo');
  if (d.u('giorno') > 0.96) primati.push('giornoEterno');
  if (d.u('fisica.raggio') > 0.96) primati.push('colosso');
  if (d.u('fisica.raggio') < 0.04) primati.push('minuscolo');
  if (vita >= 0.95) primati.push('rigoglio');
  if (cicloni.length === 3) primati.push('treCicloni');
  if ((tipo === 'terrestre' || tipo === 'oceanico') && d.u('nubi.copertura') > 0.95) primati.push('cieloCoperto');

  // --- titoli: le combinazioni che hanno un nome ---------------------------------------
  const acqua = parte('acqua');
  const titoli = [];
  if ((tipo === 'terrestre' || tipo === 'oceanico') && acqua >= 0.6 && acqua <= 0.78 && civilta && lune.length === 1 && stella.id === 'gialla' && !anelli) titoli.push('gemello');
  if (civilta && tratti.includes('aurora') && tratti.includes('mariLuce')) titoli.push('notteAccesa');
  if (civilta && dueSoli) titoli.push('sottoDueSoli');
  if (civilta && tipo === 'desertico') titoli.push('civiltaDeserto');
  if (anelli && lune.length === 3) titoli.push('incoronato');
  if (vita >= 0.95) titoli.push('giardino');
  if (oceanoGlobale && anelli) titoli.push('perla');
  // se ce n'è più d'uno si mostra il più raro
  const titolo = titoli.reduce((a, b) => (a === null || (FREQUENZE[b] ?? 1) < (FREQUENZE[a] ?? 1) ? b : a), null);

  const p = {
    versione: VERSIONE,
    nome,
    chiave,
    seme,
    tipo,
    tipoIndice,
    tavolozzaIndice,
    colori,
    coloreCielo,
    stella,
    dueSoli,
    anelli,
    asse,
    inclinazione,
    giorno,
    lune,
    fisica,
    criteri,
    vita,
    civilta,
    tratti,
    primati,
    titoli,
    titolo,
    coloreAurora: colore(AURORE[Math.floor(d.u('aurora.colore') * AURORE.length)]),
    terreno: {
      // il seme entra nell'hash dello shader come intero (venti bit): ogni pianeta ha il suo rumore
      semi: [d.intero('terreno.seme.x') >>> 12, d.intero('terreno.seme.y') >>> 12, d.intero('terreno.seme.z') >>> 12],
      frequenza: d.tra('terreno.frequenza', roccioso ? 1.3 : 1.6, roccioso ? 2.1 : 2.6),
      piega: d.tra('terreno.piega', 0.35, 0.8),
      guadagno,
      scala: 3.4646 * Math.sqrt(1 - guadagno * guadagno), // porta il terreno a una deviazione di 0,33 (misurata)
      mare,
      creste: d.tra('terreno.creste', 0.15, 0.4),
      poli,
      clima: base.clima,
      liquido,
      crepe: d.tra('terreno.crepe', ...base.crepe),
      crepeFrequenza: d.tra('terreno.crepe.frequenza', 2.5, 6),
      rilievo: d.tra('terreno.rilievo', ...base.rilievo),
      lucido: tipo === 'ghiacciato' ? d.tra('terreno.lucido', 0.4, 0.8) : 0,
      brace: tipo === 'lavico' ? d.tra('terreno.brace', 1.4, 2.6) : 0,
    },
    nubi: {
      copertura,
      soglia: copertura > 0.001 ? quantile(1 - copertura) * 0.34 - 0.09 : 9,
      scala: d.tra('nubi.scala', 2.2, 3.6),
      vortice: d.tra('nubi.vortice', 0.35, 0.8),
      vento: d.tra('nubi.vento', 0.004, 0.012), // radianti al secondo rispetto al suolo
      cicloni,
    },
    gas: { fasce: d.tra('gas.fasce', 3.5, 9), turbolenza: d.tra('gas.turbolenza', 0.5, 1.6), tempeste },
    aria: {
      altezza: altezzaAria,
      // quanta luce di ogni colore devia l'aria: il colore del cielo, e al tramonto il suo contrario
      rayleigh: coloreCielo.map((c) => (forzaAria * 0.3 * (0.12 + c)) / altezzaAria),
      foschia: (forzaAria * d.tra('aria.foschia', 0.02, 0.07) * (tipo === 'desertico' ? 2.5 : 1)) / (altezzaAria * 0.35),
    },
    cielo: {
      angoli: [d.tra('cielo.a', 0, 6.283), d.tra('cielo.b', -1.2, 1.2), d.tra('cielo.c', 0, 6.283)],
      tinte: CIELI[Math.floor(d.u('cielo.tinte') * CIELI.length)].split(' ').map(colore),
    },
    // quello che la scheda mostra: le parti della superficie sommano a 1
    scheda: { superficie: superficie.map(([id, x]) => ({ id, parte: x })), nubi: roccioso ? copertura : null },
  };
  p.rarita = valuta(p); // per ultima: dipende da tutto il resto
  return p;
}

// ---------------------------------------------------------------------------
// 5. La rarità
// ---------------------------------------------------------------------------

/**
 * Quanto è raro un mondo: la somma intera dei pesi dei suoi particolari, il livello e «1 su N».
 * «1 su N» vuol dire «un nome su N ha un mondo raro almeno quanto questo»: è letto dalla coda
 * misurata da tools/rarita.js, non moltiplicato, perché i particolari non sono indipendenti.
 */
export function valuta(p) {
  let punti = 0;
  for (const id of p.tratti) punti += PESI[id] ?? 0;
  for (const id of p.primati) punti += PESI[id] ?? 0;
  let livello = 0;
  while (livello < SOGLIE.length && punti >= SOGLIE[livello]) livello++;
  const gradino = Math.floor(punti / PASSO);
  // oltre la fine della tabella nel campione restano meno di 30 nomi: si dice solo «oltre»
  const oltre = CODA.length > 0 && gradino >= CODA.length;
  const nomi = CODA.length ? CODA[Math.min(gradino, CODA.length - 1)] : CAMPIONE;
  return { punti, livello, unoSu: oltre ? CAMPIONE / 30 : CAMPIONE / nomi, oltre };
}

// ---------------------------------------------------------------------------
// 6. Le parole
// ---------------------------------------------------------------------------

const PAROLE = {
  it: {
    tipo: { terrestre: 'pianeta terrestre', oceanico: 'mondo oceanico', desertico: 'pianeta desertico', ghiacciato: 'mondo di ghiaccio', lavico: 'mondo di lava', gassoso: 'gigante gassoso' },
    stella: { rossa: 'stella rossa', arancione: 'stella arancione', gialla: 'stella gialla', bianca: 'stella bianca', azzurra: 'stella azzurra' },
    stellaBreve: { rossa: 'rossa', arancione: 'arancione', gialla: 'gialla', bianca: 'bianca', azzurra: 'azzurra' },
    livelli: ['comune', 'non comune', 'raro', 'epico', 'leggendario', 'mitico'],
    tratti: {
      aurora: 'aurore ai poli', civilta: 'civiltà', asse: 'asse sdraiato', dueSoli: 'due soli', nebulosa: 'cielo di nebulosa',
      mariLuce: 'mari che brillano', esagono: 'esagono polare', oceanoGlobale: 'oceano senza terre', cromatico: 'cromatico',
      pianetaCitta: 'pianeta-città', lunaGigante: 'luna gigante', anelliImmensi: 'anelli immensi', giornoLampo: 'giorno lampo',
      giornoEterno: 'giorno lunghissimo', colosso: 'colosso', minuscolo: 'minuscolo', rigoglio: 'vita rigogliosa',
      treCicloni: 'tre cicloni', cieloCoperto: 'cielo sempre coperto',
    },
    titoli: { gemello: 'Gemello della Terra', notteAccesa: 'Notte accesa', sottoDueSoli: 'Sotto due soli', civiltaDeserto: 'Civiltà del deserto', incoronato: 'Mondo incoronato', giardino: 'Mondo-giardino', perla: 'Perla' },
    unoSu: (n) => `1 su ${n}`,
    oltre: (n) => `oltre 1 su ${n}`,
    criteri: { acqua: 'Acqua liquida', clima: 'Clima mite', aria: 'Aria densa', terre: 'Terre emerse' },
    mari: 'mari',
    laghi: 'laghi',
    mariLava: 'mari di lava',
    niente: 'nessuna',
    vita: ['assente', 'tracce', 'scarsa', 'diffusa', 'abbondante', 'rigogliosa'],
    civilta: ['', 'villaggi', 'città', 'nazioni', 'mondo connesso', 'pianeta-città'],
    milioni: 'milioni',
    miliardi: 'miliardi',
    superficie: { acqua: 'acqua', terre: 'terre', ghiacci: 'ghiacci', ghiaccio: 'ghiaccio', lava: 'lava', crosta: 'crosta', idrogeno: 'idrogeno', elio: 'elio' },
    tracce: ['ammoniaca', 'zolfo', 'metano', 'cristalli di ammoniaca', 'fosfina', 'vapori di silicati', 'cloro', 'toline', 'cristalli iridescenti'],
    p: { temperatura: 'Temperatura', pressione: 'Pressione', giorno: 'Giorno', anno: 'Anno', raggio: 'Raggio', gravita: 'Gravità', lune: 'Lune', anelli: 'Anelli', nubi: 'Nubi', asse: 'Asse', stella: 'Stella', distanza: 'Distanza' },
    ore: 'ore',
    giorni: 'giorni',
    anni: 'anni',
    si: 'sì',
    no: 'no',
    fasce: 'a fasce',
    ua: 'UA',
  },
  en: {
    tipo: { terrestre: 'terrestrial planet', oceanico: 'ocean world', desertico: 'desert planet', ghiacciato: 'ice world', lavico: 'lava world', gassoso: 'gas giant' },
    stella: { rossa: 'red star', arancione: 'orange star', gialla: 'yellow star', bianca: 'white star', azzurra: 'blue star' },
    stellaBreve: { rossa: 'red', arancione: 'orange', gialla: 'yellow', bianca: 'white', azzurra: 'blue' },
    livelli: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    tratti: {
      aurora: 'polar auroras', civilta: 'civilization', asse: 'sideways axis', dueSoli: 'two suns', nebulosa: 'nebula sky',
      mariLuce: 'glowing seas', esagono: 'polar hexagon', oceanoGlobale: 'endless ocean', cromatico: 'chromatic',
      pianetaCitta: 'city-planet', lunaGigante: 'giant moon', anelliImmensi: 'vast rings', giornoLampo: 'flash day',
      giornoEterno: 'endless day', colosso: 'colossal', minuscolo: 'tiny', rigoglio: 'teeming life',
      treCicloni: 'three cyclones', cieloCoperto: 'overcast forever',
    },
    titoli: { gemello: "Earth's twin", notteAccesa: 'Night ablaze', sottoDueSoli: 'Under two suns', civiltaDeserto: 'Desert civilization', incoronato: 'Crowned world', giardino: 'Garden world', perla: 'Pearl' },
    unoSu: (n) => `1 in ${n}`,
    oltre: (n) => `beyond 1 in ${n}`,
    criteri: { acqua: 'Liquid water', clima: 'Mild climate', aria: 'Dense air', terre: 'Dry land' },
    mari: 'seas',
    laghi: 'lakes',
    mariLava: 'lava seas',
    niente: 'none',
    vita: ['none', 'traces', 'scarce', 'widespread', 'abundant', 'teeming'],
    civilta: ['', 'villages', 'cities', 'nations', 'connected world', 'city-planet'],
    milioni: 'million',
    miliardi: 'billion',
    superficie: { acqua: 'water', terre: 'land', ghiacci: 'ice', ghiaccio: 'ice', lava: 'lava', crosta: 'crust', idrogeno: 'hydrogen', elio: 'helium' },
    tracce: ['ammonia', 'sulfur', 'methane', 'ammonia crystals', 'phosphine', 'silicate vapor', 'chlorine', 'tholins', 'iridescent crystals'],
    p: { temperatura: 'Temperature', pressione: 'Pressure', giorno: 'Day', anno: 'Year', raggio: 'Radius', gravita: 'Gravity', lune: 'Moons', anelli: 'Rings', nubi: 'Clouds', asse: 'Axial tilt', stella: 'Star', distanza: 'Distance' },
    ore: 'hours',
    giorni: 'days',
    anni: 'years',
    si: 'yes',
    no: 'no',
    fasce: 'banded',
    ua: 'AU',
  },
};

// Da quale casella della tavolozza prende il colore ogni parte della superficie.
const COLORE_PARTE = { acqua: 1, terre: 3, ghiacci: 7, ghiaccio: 7, lava: 10, crosta: 5, idrogeno: 4, elio: 2, tracce: 9 };
const SPAZIO = String.fromCharCode(160); // lo spazio che non va a capo: «71 %», «18 °C»
const formati = new Map();

// Percentuali intere che sommano a 100 (metodo dei resti più grandi).
function centesimi(parti) {
  const grezzi = parti.map((x) => x * 100);
  const interi = grezzi.map(Math.floor);
  const resto = 100 - interi.reduce((s, x) => s + x, 0);
  const ordine = grezzi.map((x, i) => [x - interi[i], i]).sort((a, b) => b[0] - a[0]);
  for (let i = 0; i < resto; i++) interi[ordine[i][1]]++;
  return interi;
}

/** I numeri della scheda in parole, pronti da mettere in pagina. */
export function descrivi(p, lingua = 'it') {
  const L = lingua === 'it' ? 'it' : 'en';
  const t = PAROLE[L];
  const num = (x, cifre = 0) => {
    const k = L + cifre;
    if (!formati.has(k)) formati.set(k, new Intl.NumberFormat(L === 'it' ? 'it-IT' : 'en-US', { maximumFractionDigits: cifre }));
    return formati.get(k).format(x);
  };
  // N con due cifre significative: «1 su 1.200»
  const conta = (x) => {
    const passo = x >= 100 ? 10 ** (Math.floor(Math.log10(x)) - 1) : 1;
    return num(Math.round(x / passo) * passo);
  };
  const pct = (x) => `${x > 0 && x < 0.1 ? num(x * 100, 1) : num(Math.round(x * 100))}${SPAZIO}%`;
  const f = p.fisica;
  const r = p.rarita;

  const voci = [...p.tratti, ...p.primati]
    .map((id) => ({ id, frequenza: FREQUENZE[id] ?? 1 }))
    .sort((a, b) => a.frequenza - b.frequenza)
    .map(({ id, frequenza }) => ({ id, nome: t.tratti[id], unoSu: frequenza > 0 && frequenza < 1 ? t.unoSu(conta(1 / frequenza)) : '' }));

  const parte = (id) => p.scheda.superficie.find((s) => s.id === id)?.parte ?? 0;
  const pressione = f.pressione === null ? '' : `${num(f.pressione, f.pressione < 1 ? 2 : 1)}${SPAZIO}atm`;
  const gradi = `${num(Math.round(f.temperatura))}${SPAZIO}°C`;
  let criteri = null;
  if (p.tipo !== 'gassoso') {
    const acqua = p.criteri.acqua ? `${p.tipo === 'desertico' ? t.laghi : t.mari} ${pct(parte('acqua'))}` : p.tipo === 'lavico' ? t.mariLava : t.niente;
    criteri = [
      { id: 'acqua', nome: t.criteri.acqua, ok: p.criteri.acqua, valore: acqua },
      { id: 'clima', nome: t.criteri.clima, ok: p.criteri.clima, valore: gradi },
      { id: 'aria', nome: t.criteri.aria, ok: p.criteri.aria, valore: pressione },
      { id: 'terre', nome: t.criteri.terre, ok: p.criteri.terre, valore: pct(parte('terre')) },
    ];
  }
  const v = p.vita;
  const quantaVita = v === 0 ? 0 : v < 0.1 ? 1 : v < 0.3 ? 2 : v < 0.6 ? 3 : v < 0.85 ? 4 : 5;
  const persone = (n) =>
    n >= 1e9 ? `${num(n / 1e9, n < 1e10 ? 1 : 0)} ${t.miliardi}` : n >= 1e6 ? `${num(Math.round(n / 1e6))} ${t.milioni}` : num(Math.round(n / 1000) * 1000);

  const interi = centesimi(p.scheda.superficie.map((s) => s.parte));
  const superficie = p.scheda.superficie.map((s, i) => ({
    id: s.id,
    nome: s.id === 'tracce' ? t.tracce[p.tratti.includes('cromatico') ? 8 : p.tavolozzaIndice] : t.superficie[s.id],
    parte: interi[i],
    quota: s.parte,
    testo: `${interi[i] === 0 ? '<1' : interi[i]}${SPAZIO}%`,
    colore: esadecimale(p.colori[COLORE_PARTE[s.id]]),
  }));

  const anno = f.anno >= 730 ? `${num(f.anno / 365.25, f.anno < 3652 ? 1 : 0)} ${t.anni}` : f.anno >= 2 ? `${num(f.anno)} ${t.giorni}` : `${num(f.anno * 24)} ${t.ore}`;
  const stella = p.dueSoli ? `${t.stellaBreve[p.stella.id]} + ${t.stellaBreve[p.dueSoli.id]}` : t.stellaBreve[p.stella.id];
  const particolari = [
    [t.p.temperatura, gradi],
    ...(pressione ? [[t.p.pressione, pressione]] : []),
    [t.p.giorno, `${num(f.giornoOre, 1)} ${t.ore}`],
    [t.p.anno, anno],
    [t.p.raggio, `${num(Math.round(f.raggio / 10) * 10)}${SPAZIO}km`],
    [t.p.gravita, `${num(f.gravita, 2)}${SPAZIO}g`],
    [t.p.lune, num(p.lune.length)],
    [t.p.anelli, p.anelli ? t.si : t.no],
    [t.p.nubi, p.tipo === 'gassoso' ? t.fasce : pct(p.nubi.copertura)],
    [t.p.asse, `${num(Math.round((p.inclinazione * 180) / Math.PI))}°`],
    [t.p.stella, stella],
    [t.p.distanza, `${num(f.distanza, f.distanza < 10 ? 2 : 0)}${SPAZIO}${t.ua}`],
  ].map(([etichetta, valore]) => ({ etichetta, valore }));

  return {
    riga: `${t.tipo[p.tipo]} · ${t.stella[p.stella.id]}`,
    livello: { indice: r.livello, nome: t.livelli[r.livello] },
    unoSu: r.unoSu >= 2 ? (r.oltre ? t.oltre : t.unoSu)(conta(r.unoSu)) : '',
    titolo: p.titolo && { nome: t.titoli[p.titolo], unoSu: FREQUENZE[p.titolo] ? t.unoSu(conta(1 / FREQUENZE[p.titolo])) : '' },
    tratti: voci,
    criteri,
    vita: quantaVita === 0 ? t.vita[0] : `${t.vita[quantaVita]} (${pct(v)})`,
    civilta: p.civilta && { livello: p.civilta.livello, nome: t.civilta[p.civilta.livello], capitale: p.civilta.capitale, abitanti: persone(p.civilta.abitanti) },
    superficie,
    particolari,
  };
}
