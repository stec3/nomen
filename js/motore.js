// motore.js — WebGL2: compila lo shader, tiene la camera e disegna i fotogrammi.
import { VERTICI, SPAZIO } from './glsl.js';
import { SOLE, CAMERA } from './nome.js';

const TAN_FOV = 0.25; // tangente di mezzo campo visivo: un teleobiettivo, il pianeta resta tondo
const QUOTA_MIN = 0.006; // la camera più bassa, in raggi: sotto servono coordinate relative alla camera
const INTERI = new Set(['uTipo', 'uLiquido', 'uLune', 'uQual']);
const FORME = { uSemeI: 'i3', uCol: '3', uLunaCol: '3', uLuna: '4', uTempesta: '4', uCiclone: '4', uCam: 'm', uRot: 'm', uRotNubi: 'm', uCielo: 'm' };

const vett = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unita = (v) => {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
};
const somma = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
const stringi = (x, min, max) => Math.min(max, Math.max(min, x));
const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const liscio = (a, b, x) => {
  const t = stringi((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// v girato di f radianti attorno all'asse unitario k, verso della mano destra (formula di Rodrigues)
function ruota(v, k, f) {
  const [c, s] = [Math.cos(f), Math.sin(f)];
  const kv = punto(k, v) * (1 - c);
  const kx = vett(k, v);
  return [0, 1, 2].map((i) => v[i] * c + kx[i] * s + k[i] * kv);
}

// Rotazione da tre angoli, come matrice per colonne: orienta la via lattea.
function rotazione([a, b, c]) {
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return [ca * cc + sa * sb * sc, cb * sc, -sa * cc + ca * sb * sc, -ca * sc + sa * sb * cc, cb * cc, sa * sc + ca * sb * cc, sa * cb, -sb, ca * cb];
}

/** I valori che non cambiano finché il pianeta è lo stesso. Funzione pura: la provano anche i collaudi. */
export function uniformi(p) {
  const t = p.terreno;
  const tempeste = new Float32Array(8);
  p.gas.tempeste.forEach((s, i) => tempeste.set(s, i * 4));
  const coloriLune = new Float32Array(9);
  p.lune.forEach((l, i) => coloriLune.set(l.colore, i * 3));
  const cicloni = new Float32Array(12);
  p.nubi.cicloni.forEach((c, i) => cicloni.set(c, i * 4));
  // La tinta di una stella a parità di luminosità: piena per la stella vista nel cielo, appena accennata
  // per la luce che dà, perché l'occhio si abitua e sotto una stella rossa le nuvole restano quasi bianche.
  const tinta = (c, k, forza = 1) => {
    const chiaro = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    return c.map((x) => (1 + k * (x / chiaro - 1)) * forza);
  };
  const s2 = p.dueSoli;
  return {
    uTipo: p.tipoIndice,
    uSoleCol: tinta(p.stella.colore, 0.3),
    uStellaCol: tinta(p.stella.colore, 0.8),
    uSole2: s2 ? s2.direzione : [0, 1, 0],
    uSole2Col: s2 ? tinta(s2.colore, 0.9, 0.45) : [0, 0, 0], // la seconda stella: più debole, ma col suo colore pieno, si vede al tramonto della prima
    uStella2Col: s2 ? tinta(s2.colore, 0.8, 0.5) : [0, 0, 0],
    uNebForza: p.tratti.includes('nebulosa') ? 7 : 1,
    uAsse: p.asse,
    uSemeI: t.semi,
    uCol: new Float32Array(p.colori.flat()),
    uFreq: t.frequenza,
    uPiega: t.piega,
    uGuad: t.guadagno,
    uScala: t.scala,
    uMare: t.mare,
    uCreste: t.creste,
    uPoli: t.poli,
    uClima: t.clima,
    uLiquido: t.liquido,
    uCrepe: t.crepe,
    uCrepeFreq: t.crepeFrequenza,
    uRilievo: t.rilievo,
    uLucido: t.lucido,
    uBrace: t.brace,
    uNubiSoglia: p.nubi.soglia,
    uNubiScala: p.nubi.scala,
    uNubiVort: p.nubi.vortice,
    uCiclone: cicloni,
    uCitta: p.civilta ? p.civilta.livello : 0, // fino alla fase 2b la civiltà si vede con le luci di città, tante quanto il livello
    uAurora: p.tratti.includes('aurora') ? 1 : 0,
    uMariLuce: p.tratti.includes('mariLuce') ? 1 : 0,
    uEsagono: p.tratti.includes('esagono') ? 1 : 0,
    uAuroraCol: p.coloreAurora,
    uFasce: p.gas.fasce,
    uTurb: p.gas.turbolenza,
    uTempesta: tempeste,
    uBetaR: p.aria.rayleigh,
    uBetaM: p.aria.foschia,
    uHR: p.aria.altezza,
    uHM: p.aria.altezza * 0.35,
    uRAtm: 1 + 7 * p.aria.altezza,
    uAnello: p.anelli ? [p.anelli.interno, p.anelli.esterno] : [0, 0],
    uAnelloCol: p.anelli ? p.anelli.colore : [0, 0, 0],
    uAnelloCol2: p.anelli ? p.anelli.colore2 : [0, 0, 0],
    uAnelloTau: p.anelli ? p.anelli.spessore : 0,
    uAnelloSeme: p.anelli ? p.anelli.seme : 0,
    uAnelloDiv: p.anelli ? p.anelli.divisione : [0, 0, 0],
    uLune: p.lune.length,
    uLunaCol: coloriLune,
    uCielo: rotazione(p.cielo.angoli),
    uNebA: p.cielo.tinte[0],
    uNebB: p.cielo.tinte[1],
  };
}

function compila(gl, tipo, sorgente) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, sorgente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
  return s;
}

/** Crea il motore su una tela. Restituisce null se il browser non ha WebGL2. */
export function creaMotore(tela) {
  const gl = tela.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, compila(gl, gl.VERTEX_SHADER, VERTICI));
  gl.attachShader(prog, compila(gl, gl.FRAGMENT_SHADER, SPAZIO));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`programma: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);

  const posti = new Map();
  function manda(nome, v) {
    if (!posti.has(nome)) posti.set(nome, gl.getUniformLocation(prog, nome));
    const p = posti.get(nome);
    if (p === null) return;
    if (typeof v === 'number') return INTERI.has(nome) ? gl.uniform1i(p, v) : gl.uniform1f(p, v);
    const forma = FORME[nome] ?? String(v.length);
    if (forma === 'm') gl.uniformMatrix3fv(p, false, v);
    else if (forma === '4') gl.uniform4fv(p, v);
    else if (forma === '3') gl.uniform3fv(p, v);
    else if (forma === 'i3') gl.uniform3iv(p, v);
    else gl.uniform2fv(p, v);
  }

  // --- stato -----------------------------------------------------------------
  // quota: altezza sul suolo in raggi; aggancio: quanto la camera ha girato insieme al pianeta
  const cam = { giro: CAMERA.giro, alzo: CAMERA.alzo, quota: 5.9, dist: 7, vGiro: 0, vAlzo: 0, aggancio: 0 };
  let pianeta = null;
  let prossimo = null;
  let velo = 0; // dissolvenza: 0 buio, 1 pieno
  let tempo = 0;
  let fermo = false;
  let qualita = 2;
  let scala = 1; // parte della risoluzione piena che si disegna davvero
  let tetto = 1;
  let lento = 0;
  let svelto = 0;
  let mediaMs = 16;
  let ultimo = 0;
  let basi = null; // gli assi del pianeta nello spazio

  function prepara(p) {
    pianeta = p;
    for (const [nome, v] of Object.entries(uniformi(p))) manda(nome, v);
    const a = p.asse;
    const e1 = unita(vett(Math.abs(a[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0], a));
    basi = { a, e1, e3: vett(e1, a) };
    cam.giro = CAMERA.giro;
    cam.alzo = CAMERA.alzo;
    cam.vGiro = cam.vAlzo = 0;
    cam.quota = distanzaBase() - 1;
    cam.aggancio = 0;
  }

  // Matrice mondo → pianeta, col pianeta girato di un angolo attorno al suo asse.
  function giro(angolo) {
    const { a, e1, e3 } = basi;
    const ex = somma(e1, Math.cos(angolo), e3, -Math.sin(angolo));
    const ez = somma(e1, Math.sin(angolo), e3, Math.cos(angolo));
    return [ex[0], a[0], ez[0], ex[1], a[1], ez[1], ex[2], a[2], ez[2]];
  }

  // Distanza di partenza: il pianeta occupa poco più di metà del lato corto, e gli anelli devono starci.
  function distanzaBase() {
    const aspetto = (tela.clientWidth || tela.width) / (tela.clientHeight || tela.height);
    let d = 6.9 / Math.min(1, aspetto);
    if (pianeta?.anelli) d = Math.max(d, (0.82 * pianeta.anelli.esterno) / (TAN_FOV * aspetto));
    return d;
  }
  const quotaMax = () => 2.2 * distanzaBase() - 1;

  // Gli assi della camera: direzione da giro e alzo, poi girata col pianeta di cam.aggancio.
  function vista() {
    const [cg, sg, ca, sa] = [Math.cos(cam.giro), Math.sin(cam.giro), Math.cos(cam.alzo), Math.sin(cam.alzo)];
    let dir = [sg * ca, sa, cg * ca];
    let destra = [cg, 0, -sg];
    if (cam.aggancio) {
      dir = ruota(dir, basi.a, cam.aggancio);
      destra = ruota(destra, basi.a, cam.aggancio);
    }
    const avanti = dir.map((c) => -c);
    const morbido = velo * velo * (3 - 2 * velo);
    const aspetto = (tela.clientWidth || tela.width) / (tela.clientHeight || tela.height);
    return {
      dir,
      destra,
      avanti,
      alto: vett(destra, avanti),
      dist: (1 + cam.quota) * (1.12 - 0.12 * morbido),
      // da vicino il pianeta torna al centro dello schermo: si guarda il suolo sotto il centro
      centro: [0, (aspetto < 1 ? 0.16 : 0.11) * liscio(0.5, 3.0, cam.quota)],
    };
  }

  // Il punto del suolo sotto (x, y), in pixel della tela; null se lì c'è il cielo. Lo stesso conto dello shader.
  function suoloSotto(x, y) {
    if (!pianeta) return null;
    const v = vista();
    const [l, h] = [tela.clientWidth, tela.clientHeight];
    const u = ((2 * x - l) / h - v.centro[0]) * TAN_FOV;
    const w = ((h - 2 * y) / h - v.centro[1]) * TAN_FOV;
    const rd = unita(somma(somma(v.destra, u, v.alto, w), 1, v.avanti, 1));
    const ro = v.dir.map((c) => c * v.dist);
    const b = punto(ro, rd);
    const delta = b * b - punto(ro, ro) + 1;
    if (b > 0 || delta < 0) return null;
    return unita(somma(ro, 1, rd, -b - Math.sqrt(delta)));
  }

  // Cambia la quota di un fattore k tenendo fermo il suolo sotto (x, y): lo zoom va dove punta il cursore.
  function avvicina(k, x, y) {
    const prima = suoloSotto(x, y);
    cam.quota = stringi(cam.quota * k, QUOTA_MIN, quotaMax());
    // la camera gira come serve perché il punto torni sotto il cursore; il secondo e il terzo giro
    // correggono quel poco che si perde perché la camera non si inclina mai di lato
    for (let i = 0; prima && i < 3; i++) {
      const dopo = suoloSotto(x, y);
      if (!dopo) return;
      const asse = vett(dopo, prima);
      const s = Math.hypot(...asse);
      if (s < 1e-9) return;
      let dir = ruota(vista().dir, asse.map((c) => c / s), Math.atan2(s, punto(dopo, prima)));
      if (cam.aggancio) dir = ruota(dir, basi.a, -cam.aggancio);
      cam.giro = Math.atan2(dir[0], dir[2]);
      cam.alzo = stringi(Math.asin(stringi(dir[1], -1, 1)), -1.45, 1.45);
    }
  }

  function misure() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const l = Math.max(2, Math.round(tela.clientWidth * dpr * scala));
    const h = Math.max(2, Math.round(tela.clientHeight * dpr * scala));
    if (tela.width !== l || tela.height !== h) {
      tela.width = l;
      tela.height = h;
    }
    gl.viewport(0, 0, l, h);
  }

  function disegna() {
    if (!pianeta) return;
    misure();
    cam.quota = stringi(cam.quota, QUOTA_MIN, quotaMax());
    const vis = vista();
    cam.dist = vis.dist;

    const angolo = (tempo * Math.PI * 2) / pianeta.giorno;
    const lune = new Float32Array(12);
    pianeta.lune.forEach((l, i) => {
      const th = l.fase + l.velocita * tempo;
      const n1 = [Math.cos(l.nodo), 0, Math.sin(l.nodo)];
      const n2 = [-Math.sin(l.nodo) * Math.cos(l.inclinazione), Math.sin(l.inclinazione), Math.cos(l.nodo) * Math.cos(l.inclinazione)];
      const q = somma(n1, Math.cos(th) * l.orbita, n2, Math.sin(th) * l.orbita);
      const w = somma(somma(basi.e1, q[0], basi.a, q[1]), 1, basi.e3, q[2]);
      lune.set([...w, l.raggio], i * 4);
    });

    manda('uRis', [tela.width, tela.height]);
    manda('uTempo', tempo);
    manda('uCamPos', vis.dir.map((c) => c * vis.dist));
    manda('uCam', [...vis.destra, ...vis.alto, ...vis.avanti]);
    manda('uTanFov', TAN_FOV);
    manda('uCentro', vis.centro);
    manda('uQuota', vis.dist - 1);
    manda('uEspo', 1.1);
    manda('uVelo', velo * velo * (3 - 2 * velo));
    manda('uQual', qualita);
    manda('uSole', SOLE);
    manda('uRot', giro(angolo));
    manda('uRotNubi', giro(angolo + pianeta.nubi.vento * tempo));
    manda('uLuna', lune);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Se i fotogrammi rallentano si disegnano meno pixel, poi si alleggerisce lo shader.
  function adatta(dt) {
    mediaMs += (dt * 1000 - mediaMs) * 0.08;
    if (mediaMs > 21) {
      svelto = 0;
      if (++lento > 20) {
        lento = 0;
        tetto = scala * 0.95;
        if (scala > 0.55) scala = Math.max(0.5, scala * 0.85);
        else if (qualita > 0) {
          qualita -= 1;
          scala = 0.8;
          tetto = 1;
        }
        mediaMs = 16;
      }
    } else {
      lento = 0;
      if (mediaMs < 17.5 && scala < tetto && ++svelto > 240) {
        svelto = 0;
        scala = Math.min(tetto, scala * 1.08);
      }
    }
  }

  function fotogramma(ora) {
    requestAnimationFrame(fotogramma);
    const dt = Math.min((ora - ultimo) / 1000, 0.1);
    const saltato = ora - ultimo > 250; // scheda in secondo piano: non conta come lentezza
    ultimo = ora;
    if (!fermo) {
      tempo += dt;
      // da vicino la camera gira insieme al pianeta: il suolo sotto resta fermo e si vede arrivare la sera
      if (pianeta) cam.aggancio += (1 - liscio(0.3, 2.0, cam.quota)) * ((2 * Math.PI) / pianeta.giorno) * dt;
    }

    // dissolvenza: via il pianeta vecchio, dentro il nuovo
    if (prossimo) {
      velo -= dt / 0.25;
      if (velo <= 0 || !pianeta) {
        velo = 0;
        prepara(prossimo);
        prossimo = null;
      }
    } else if (velo < 1) velo = Math.min(1, velo + dt / 1.1);

    // inerzia del trascinamento
    if (punte.size === 0) {
      cam.giro += cam.vGiro;
      cam.alzo = stringi(cam.alzo + cam.vAlzo, -1.45, 1.45);
      const frena = 0.93 ** (dt * 60);
      cam.vGiro *= frena;
      cam.vAlzo *= frena;
    }

    if (!saltato && !fermo) adatta(dt);
    disegna();
  }

  // --- dita e mouse ------------------------------------------------------------
  const punte = new Map();
  let pizzico = 0;

  tela.addEventListener('pointerdown', (e) => {
    tela.setPointerCapture(e.pointerId);
    punte.set(e.pointerId, [e.clientX, e.clientY]);
    cam.vGiro = cam.vAlzo = 0;
  });
  tela.addEventListener('pointermove', (e) => {
    const prima = punte.get(e.pointerId);
    if (!prima) return;
    punte.set(e.pointerId, [e.clientX, e.clientY]);
    if (punte.size === 1) {
      // il pianeta segue il dito: la camera gli gira attorno dalla parte opposta,
      // di tanti radianti per pixel quanti ne servono perché a ogni quota il suolo resti sotto il dito
      const k = (2 * TAN_FOV * cam.quota) / tela.clientHeight;
      cam.vGiro = (-(e.clientX - prima[0]) * k) / Math.max(Math.cos(cam.alzo), 0.2);
      cam.vAlzo = (e.clientY - prima[1]) * k;
      cam.giro += cam.vGiro;
      cam.alzo = stringi(cam.alzo + cam.vAlzo, -1.45, 1.45);
      tela.dispatchEvent(new CustomEvent('trascinato'));
    } else if (punte.size === 2) {
      const [a, b] = [...punte.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const r = tela.getBoundingClientRect();
      if (pizzico) avvicina(pizzico / d, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      pizzico = d;
    }
  });
  const molla = (e) => {
    punte.delete(e.pointerId);
    pizzico = 0;
  };
  tela.addEventListener('pointerup', molla);
  tela.addEventListener('pointercancel', molla);
  tela.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = tela.getBoundingClientRect();
      // rotella a righe o a pagine (Firefox) come a pixel; il pizzico del trackpad arriva con ctrlKey
      const passi = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      avvicina(Math.exp(passi * (e.ctrlKey ? 0.008 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );

  requestAnimationFrame((ora) => {
    ultimo = ora;
    fotogramma(ora);
  });

  return {
    /** Mostra un pianeta, con una dissolvenza se ce n'era già uno. */
    mostra(p) {
      prossimo = p;
    },
    /** Per collaudi e misure: ferma il tempo, fissa qualità, risoluzione o camera. */
    imposta(o = {}) {
      // prima il cambio di pianeta, che rimette la camera al suo posto; poi il resto
      if (o.subito && prossimo) {
        prepara(prossimo);
        prossimo = null;
      }
      if (o.subito) velo = 1;
      if (o.fermo !== undefined) fermo = o.fermo;
      if (o.tempo !== undefined) tempo = o.tempo;
      if (o.qualita !== undefined) qualita = o.qualita;
      if (o.scala !== undefined) scala = tetto = o.scala;
      if (o.giro !== undefined) cam.giro = o.giro;
      if (o.alzo !== undefined) cam.alzo = o.alzo;
      if (o.zoom !== undefined) cam.quota = o.zoom * distanzaBase() - 1; // il vecchio zoom: 1 è la partenza
      if (o.quota !== undefined) cam.quota = o.quota;
      if (o.aggancio !== undefined) cam.aggancio = o.aggancio;
    },
    stato: () => ({ larghezza: tela.width, altezza: tela.height, scala, qualita, mediaMs, tempo, quota: cam.quota }),
    /** Tempo vero di un fotogramma: si disegna e si aspetta la scheda grafica, più volte. */
    misura(fotogrammi = 30) {
      const px = new Uint8Array(4);
      disegna();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let i = 0; i < fotogrammi; i++) {
        tempo += 1 / 60;
        disegna();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      }
      const ms = (performance.now() - t0) / fotogrammi;
      return { larghezza: tela.width, altezza: tela.height, qualita, ms: Math.round(ms * 100) / 100, fps: Math.round(1000 / ms) };
    },
    /** Un fotogramma disegnato adesso: serve subito prima di copiare la tela in un'immagine. */
    disegna,
    /** Il punto del suolo (nello spazio, raggio 1) sotto un pixel della tela, o null: per collaudi ed etichette. */
    suoloSotto,
  };
}
