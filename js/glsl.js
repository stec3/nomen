// glsl.js — i programmi che girano sulla scheda grafica (GLSL ES 3.00, WebGL2).
// Il pianeta non ha triangoli: per ogni pixel si lancia un raggio e si calcola cosa incontra.

export const VERTICI = `#version 300 es
void main() {
  // Un solo triangolo che copre tutto lo schermo, senza dati in ingresso.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const INTESTAZIONE = `#version 300 es
precision highp float;
precision highp int;

out vec4 esito;

// vista
uniform vec2 uRis;        // pixel disegnati
uniform float uTempo;     // secondi
uniform vec3 uCamPos;     // posizione della camera
uniform mat3 uCam;        // colonne: destra, alto, avanti
uniform float uTanFov;    // tangente di mezzo campo visivo
uniform vec2 uCentro;     // spostamento del pianeta rispetto al centro dello schermo
uniform float uQuota;     // altezza della camera sul suolo, in raggi
uniform float uEspo;      // esposizione
uniform float uVelo;      // 0 = buio, 1 = pieno (dissolvenza)
uniform int uQual;        // 0 leggera, 1 media, 2 piena

// stella e cielo
uniform vec3 uSole;       // direzione verso la stella
uniform vec3 uSoleCol;    // colore della sua luce
uniform vec3 uStellaCol;  // colore della stella vista nel cielo
uniform vec3 uSole2;      // la seconda stella, se c'è (raro): direzione
uniform vec3 uSole2Col;   // la luce che dà al pianeta (zero = non c'è)
uniform vec3 uStella2Col; // come si vede nel cielo
uniform float uNebForza;  // via lattea: 1 di norma, molto di più col cielo di nebulosa
uniform mat3 uCielo;      // orientamento della via lattea
uniform vec3 uNebA;
uniform vec3 uNebB;

// pianeta
uniform int uTipo;        // 0 terrestre, 1 oceanico, 2 desertico, 3 ghiacciato, 4 lavico, 5 gassoso
uniform mat3 uRot;        // dal mondo al pianeta che ruota
uniform mat3 uRotNubi;    // dal mondo allo strato di nuvole
uniform vec3 uAsse;
uniform ivec3 uSemeI;     // seme del pianeta: entra nell'hash come intero, le coordinate restano piccole
uniform vec3 uCol[12];
uniform float uFreq;
uniform float uPiega;
uniform float uGuad;
uniform float uScala;
uniform float uMare;
uniform float uCreste;
uniform float uPoli;
uniform float uClima;
uniform int uLiquido;     // 0 asciutto, 1 acqua, 2 lava
uniform float uCrepe;
uniform float uCrepeFreq;
uniform float uRilievo;
uniform float uLucido;
uniform float uBrace;
uniform float uNubiSoglia;
uniform float uNubiScala;
uniform float uNubiVort;
uniform vec4 uCiclone[3]; // centro e raggio dei cicloni (raggio 0 = non c'è)
uniform float uCiv;          // livello della civiltà: 0 nessuna, da 1 (villaggi) a 5 (pianeta-città)
uniform float uCivPronta;    // la civiltà entra in dissolvenza quando è costruita (0-1)
uniform highp sampler2D uCivIndice; // per ogni cella: dove iniziano i suoi elementi e quanti sono
uniform highp sampler2D uCivDati;   // città e tratti di strada, due caselle per elemento
uniform float uAurora;
uniform float uMariLuce;  // mari che brillano di notte (raro)
uniform float uEsagono;   // esagono polare dei giganti gassosi (raro)
uniform vec3 uAuroraCol;
uniform float uFasce;
uniform float uTurb;
uniform vec4 uTempesta[2];

// aria
uniform vec3 uBetaR;      // quanto l'aria devia ogni colore
uniform float uBetaM;     // foschia
uniform float uHR;        // altezza di scala dell'aria
uniform float uHM;        // altezza di scala della foschia
uniform float uRAtm;      // dove l'aria finisce

// anelli
uniform vec2 uAnello;     // raggio interno ed esterno (0 = niente anelli)
uniform vec3 uAnelloCol;
uniform vec3 uAnelloCol2;
uniform float uAnelloTau;
uniform float uAnelloSeme;
uniform vec3 uAnelloDiv;  // divisione: posto, larghezza, profondità

// lune
uniform int uLune;
uniform vec4 uLuna[3];    // centro e raggio
uniform vec3 uLunaCol[3];

const float PI = 3.14159265;
const float LONTANO = 1e9;
`;

// ---------------------------------------------------------------------------
// Rumore. I numeri casuali vengono da conti su interi: sono identici su ogni
// scheda grafica, mentre il classico trucco col seno cambia da una all'altra.
// ---------------------------------------------------------------------------
export const RUMORE = `
// pcg3d (Jarzynski e Olano, 2020)
uvec3 pcg3(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
// Il seme del pianeta si somma dentro l'hash, come intero: ogni pianeta ha il suo rumore e le
// coordinate restano piccole, così anche le ottave fini restano precise. In main vale zero per il cielo.
ivec3 gSeme;
vec3 h33(ivec3 p) { return vec3(pcg3(uvec3(p + gSeme))) * 2.3283064365386963e-10; }

float h11(int n) {
  uint x = uint(n + gSeme.x);
  x ^= x >> 16u; x *= 0x7feb352du;
  x ^= x >> 15u; x *= 0x846ca68bu;
  x ^= x >> 16u;
  return float(x) * 2.3283064365386963e-10;
}

// Rumore a gradiente in 3D: valori attorno a zero, deviazione misurata 0,19.
#define G(o) dot(h33(i + o) * 2.0 - 1.0, f - vec3(o))
float rumore(vec3 p) {
  vec3 fl = floor(p);
  ivec3 i = ivec3(fl);
  vec3 f = p - fl;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = G(ivec3(0, 0, 0)), b = G(ivec3(1, 0, 0)), c = G(ivec3(0, 1, 0)), d = G(ivec3(1, 1, 0));
  float e = G(ivec3(0, 0, 1)), g = G(ivec3(1, 0, 1)), h = G(ivec3(0, 1, 1)), k = G(ivec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);
}
#undef G

// Lo stesso rumore con la sua derivata (stessi gradienti, stessa curva quintica):
// x = valore, yzw = gradiente rispetto a p. Serve al dettaglio fine, una valutazione per ottava.
vec4 rumored(vec3 p) {
  vec3 fl = floor(p); ivec3 i = ivec3(fl); vec3 f = p - fl;
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec3 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec3 ga = h33(i) * 2.0 - 1.0,                 gb = h33(i + ivec3(1, 0, 0)) * 2.0 - 1.0;
  vec3 gc = h33(i + ivec3(0, 1, 0)) * 2.0 - 1.0, gd = h33(i + ivec3(1, 1, 0)) * 2.0 - 1.0;
  vec3 ge = h33(i + ivec3(0, 0, 1)) * 2.0 - 1.0, gf = h33(i + ivec3(1, 0, 1)) * 2.0 - 1.0;
  vec3 gg = h33(i + ivec3(0, 1, 1)) * 2.0 - 1.0, gh = h33(i + ivec3(1, 1, 1)) * 2.0 - 1.0;
  float va = dot(ga, f),                   vb = dot(gb, f - vec3(1, 0, 0));
  float vc = dot(gc, f - vec3(0, 1, 0)),   vd = dot(gd, f - vec3(1, 1, 0));
  float ve = dot(ge, f - vec3(0, 0, 1)),   vf = dot(gf, f - vec3(1, 0, 1));
  float vg = dot(gg, f - vec3(0, 1, 1)),   vh = dot(gh, f - vec3(1, 1, 1));
  float k1 = vb - va, k2 = vc - va, k3 = ve - va;
  float k4 = va - vb - vc + vd, k5 = va - vc - ve + vg, k6 = va - vb - ve + vf;
  float k7 = -va + vb + vc - vd + ve - vf - vg + vh;
  float v = va + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z;
  vec3 d = ga + u.x * (gb - ga) + u.y * (gc - ga) + u.z * (ge - ga)
         + u.x * u.y * (ga - gb - gc + gd) + u.y * u.z * (ga - gc - ge + gg) + u.z * u.x * (ga - gb - ge + gf)
         + u.x * u.y * u.z * (-ga + gb + gc - gd + ge - gf - gg + gh)
         + du * (vec3(k1, k2, k3) + u.yzx * vec3(k4, k5, k6) + u.zxy * vec3(k6, k4, k5) + u.yzx * u.zxy * k7);
  return vec4(v, d);
}

// Tre rumori in uno, tra -1 e 1: serve a piegare le coordinate.
vec3 rumore3(vec3 p) {
  vec3 fl = floor(p);
  ivec3 i = ivec3(fl);
  vec3 f = p - fl;
  vec3 u = f * f * (3.0 - 2.0 * f);
  vec3 a = mix(mix(h33(i), h33(i + ivec3(1, 0, 0)), u.x), mix(h33(i + ivec3(0, 1, 0)), h33(i + ivec3(1, 1, 0)), u.x), u.y);
  vec3 b = mix(mix(h33(i + ivec3(0, 0, 1)), h33(i + ivec3(1, 0, 1)), u.x), mix(h33(i + ivec3(0, 1, 1)), h33(i + ivec3(1, 1, 1)), u.x), u.y);
  return mix(a, b, u.z) * 2.0 - 1.0;
}

// Rumore lungo una linea, tra 0 e 1.
float rumore1(float x) {
  float fl = floor(x);
  int i = int(fl);
  float f = x - fl;
  f = f * f * (3.0 - 2.0 * f);
  return mix(h11(i), h11(i + 1), f);
}

// Ogni ottava raddoppia il dettaglio e ruota il reticolo, così la griglia non si vede.
const mat3 GIRA = mat3(0.0, 1.616, 1.212, -1.616, 0.7272, -0.9696, -1.212, -0.9696, 1.2928);
float fbm(vec3 p, int n, float guadagno) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < n; i++) {
    s += a * rumore(p);
    p = GIRA * p + 11.3;
    a *= guadagno;
  }
  return s;
}
`;

// ---------------------------------------------------------------------------
// L'aria. La luce della stella viene deviata dalle molecole (Rayleigh) e dalla
// foschia (Mie): è lo stesso conto che fa il cielo azzurro e il tramonto rosso.
// ---------------------------------------------------------------------------
export const ARIA = `
bool sfera(vec3 ro, vec3 rd, float r, out float t0, out float t1) {
  float b = dot(ro, rd);
  float d = b * b - dot(ro, ro) + r * r;
  if (d < 0.0) return false;
  d = sqrt(d);
  t0 = -b - d;
  t1 = -b + d;
  return true;
}

vec2 densita(vec3 p) {
  float h = max(length(p) - 1.0, 0.0);
  return exp(-h / vec2(uHR, uHM));
}

// Quanta aria c'è tra un punto e la stella.
vec2 versoSole(vec3 p) {
  float t0, t1;
  sfera(p, uSole, uRAtm, t0, t1);
  int n = uQual == 0 ? 3 : 6;
  float passo = t1 / float(n);
  vec2 od = vec2(0.0);
  for (int i = 0; i < n; i++) od += densita(p + uSole * ((float(i) + 0.5) * passo));
  return od * passo;
}

// La luce che l'aria aggiunge lungo un raggio, da ta a tb; tras è quanta luce di dietro passa.
vec3 atmosfera(vec3 ro, vec3 rd, float ta, float tb, out vec3 tras) {
  int n = uQual == 0 ? 6 : 10;
  float passo = (tb - ta) / float(n);
  float mu = dot(rd, uSole);
  float faseR = 0.0596831 * (1.0 + mu * mu);
  const float g = 0.76;
  float faseM = 0.1193662 * (1.0 - g * g) * (1.0 + mu * mu) / ((2.0 + g * g) * pow(1.0 + g * g - 2.0 * g * mu, 1.5));
  vec2 od = vec2(0.0);
  vec3 sR = vec3(0.0), sM = vec3(0.0);
  for (int i = 0; i < n; i++) {
    vec3 p = ro + rd * (ta + (float(i) + 0.5) * passo);
    vec2 d = densita(p) * passo;
    od += d * 0.5;
    // il pianeta fa ombra alla sua aria
    float b = dot(p, uSole);
    float ombra = b < 0.0 ? smoothstep(0.985, 1.005, length(p - uSole * b)) : 1.0;
    if (ombra > 0.0) {
      vec2 ol = versoSole(p);
      vec3 resta = exp(-(uBetaR * (od.x + ol.x) + uBetaM * 1.1 * (od.y + ol.y))) * ombra;
      sR += d.x * resta;
      sM += d.y * resta;
    }
    od += d * 0.5;
  }
  tras = exp(-(uBetaR * od.x + uBetaM * 1.1 * od.y));
  return uSoleCol * PI * (sR * uBetaR * faseR + sM * uBetaM * faseM);
}
`;

// ---------------------------------------------------------------------------
// Anelli: un disco sottile di polvere. La luce riflessa e quella che lo
// attraversa seguono le formule di uno strato sottile (Chandrasekhar).
// ---------------------------------------------------------------------------
export const ANELLI = `
// Com'è fatto l'anello al raggio r: x = quanto è fitto, y = quanto è chiaro.
// sfoca = larghezza di un pixel: i solchi più fini di così si spengono.
vec2 anelloTau(float r, float sfoca) {
  float largo = uAnello.y - uAnello.x;
  float x = (r - uAnello.x) / largo;
  if (x <= 0.0 || x >= 1.0) return vec2(0.0);
  float fx = sfoca / largo;
  float s = uAnelloSeme, f = 5.0, a = 1.0, d = 0.0, tot = 0.0;
  for (int i = 0; i < 5; i++) {
    float vede = 1.0 - smoothstep(0.2, 0.55, f * fx);
    d += a * mix(0.5, rumore1(x * f + s), vede);
    tot += a;
    f *= 2.9; a *= 0.62; s += 37.0;
  }
  d = smoothstep(0.25, 0.75, d / tot);
  float bordo = smoothstep(0.0, 0.03, x) * (1.0 - smoothstep(0.95, 1.0, x));
  float profilo = 0.25 + 0.75 * smoothstep(0.05, 0.35, x) * (1.0 - 0.45 * smoothstep(0.75, 1.0, x));
  float divisione = 1.0 - uAnelloDiv.z * (1.0 - smoothstep(uAnelloDiv.y * 0.6, uAnelloDiv.y, abs(x - uAnelloDiv.x)));
  return vec2(uAnelloTau * (0.04 + 0.96 * d * d) * bordo * profilo * divisione, 0.55 + 0.45 * d);
}

// Luce e opacità dell'anello in un punto, visto lungo rd.
vec4 anello(vec3 p, vec3 rd, float sfoca) {
  float r = length(p);
  float mu = max(abs(dot(rd, uAsse)), 0.03);
  float mu0 = max(abs(dot(uSole, uAsse)), 0.03);
  vec2 fatto = anelloTau(r, sfoca / mu);
  float tau = fatto.x;
  if (tau <= 0.0) return vec4(0.0);
  float b = dot(p, uSole);
  float ombra = b < 0.0 ? smoothstep(0.99, 1.03, length(p - uSole * b)) : 1.0;
  float luce;
  if (dot(uSole, uAsse) * dot(-rd, uAsse) > 0.0) {
    // faccia illuminata: luce riflessa
    luce = mu0 / (mu0 + mu) * (1.0 - exp(-tau * (1.0 / mu0 + 1.0 / mu)));
  } else {
    // faccia in ombra: luce che attraversa l'anello
    float dm = mu0 - mu;
    dm = (dm < 0.0 ? -1.0 : 1.0) * max(abs(dm), 1e-3);
    luce = mu0 / dm * (exp(-tau / mu0) - exp(-tau / mu));
  }
  float c = dot(rd, uSole);
  float fase = 1.0 - 0.45 * c + 3.0 * pow(max(c, 0.0), 8.0);
  float x = (r - uAnello.x) / (uAnello.y - uAnello.x);
  vec3 tinta = mix(uAnelloCol, uAnelloCol2, rumore1(x * 3.3 + uAnelloSeme * 0.7));
  return vec4(uSoleCol * tinta * luce * fase * 1.25 * fatto.y * ombra, 1.0 - exp(-tau / mu));
}

// L'ombra che gli anelli gettano sul pianeta.
float ombraAnello(vec3 p) {
  float dl = dot(uSole, uAsse);
  if (uAnello.y <= 0.0 || abs(dl) < 1e-4) return 1.0;
  float t = -dot(p, uAsse) / dl;
  if (t <= 0.0) return 1.0;
  return exp(-anelloTau(length(p + uSole * t), 0.012).x / max(abs(dl), 0.05));
}
`;

// ---------------------------------------------------------------------------
// La superficie: terreno, mare, nuvole, fasce dei giganti gassosi.
// ---------------------------------------------------------------------------
export const SUPERFICIE = `
// Quota del terreno in un punto della sfera: attorno a zero, deviazione 0,33. Piega, n ottave e creste;
// pf sono le coordinate dell'ottava n, da cui riparte il dettaglio fine.
float quotaBase(vec3 q, int n, out vec3 pf) {
  vec3 p = q * uFreq;
  p += uPiega * rumore3(p * 0.7 + 31.4);
  pf = p;
  float a = 0.5, s = 0.0;
  for (int i = 0; i < n; i++) {
    s += a * rumore(pf);
    pf = GIRA * pf + 11.3;
    a *= uGuad;
  }
  float h = s * uScala;
  // catene di montagne: creste là dove la terra è già alta
  float c = 1.0 - abs(rumore(p * 3.1 + 57.0)) * 2.6;
  h += uCreste * smoothstep(uMare, uMare + 0.35, h) * (c * c - 0.4);
  return h;
}
float quota(vec3 q, int n) {
  vec3 pf;
  return quotaBase(q, n, pf);
}

// Da vicino il terreno continua la stessa serie della base, dall'ottava n fino alla 17: una valutazione
// per ottava, col rumore che porta la sua derivata. Un'ottava entra quando la sua onda è larga qualche
// pixel, e il ciclo si ferma alla prima troppo fine. Restituisce l'altezza in più; pend è la pendenza
// rispetto a q (la piega si trascura), frast il frastaglio che rende nitidi i confini.
float dettaglio(vec3 pf, int n, float px, out vec3 pend, out float frast) {
  pend = vec3(0.0);
  frast = 0.0;
  float lam = 1.0 / (uFreq * pow(2.02, float(n)));
  if (lam < 2.0 * px) return 0.0; // da lontano: niente da aggiungere
  int tetto = uQual == 2 ? 12 : (uQual == 1 ? 9 : 6);
  float a = 0.5 * pow(uGuad, float(n)), a2 = 1.0, s = 0.0;
  mat3 m = mat3(1.0);
  for (int i = 0; i < n; i++) m = GIRA * m;
  vec3 p = pf;
  for (int k = 0; k < tetto; k++) {
    float w = smoothstep(2.0, 4.0, lam / px);
    if (w <= 0.0) break;
    vec4 r = rumored(p);
    s += a * w * r.x;
    pend += a * w * (transpose(m) * r.yzw);
    frast += a2 * w * r.x;
    m = GIRA * m;
    p = GIRA * p + 11.3;
    a *= uGuad;
    a2 *= 0.72;
    lam /= 2.02;
  }
  pend *= uFreq * uScala;
  return s * uScala;
}

// Lo strato di nuvole in un punto: x = quanto cielo copre (0-1), y = quanto è spesso (0-1).
vec2 nubi(vec3 q, int n) {
  // cicloni: l'aria gira più in fretta vicino al centro e avvolge le nuvole a spirale
  vec3 a = q;
  float nucleo = 0.0, occhio = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 c = uCiclone[i];
    if (c.w <= 0.0) continue;
    float dc = acos(clamp(dot(q, c.xyz), -1.0, 1.0)) / c.w;
    if (dc > 2.2) continue;
    float ang = (c.y > 0.0 ? 4.0 : -4.0) * exp(-dc * dc * 1.3);
    float ca = cos(ang), sa = sin(ang);
    a = a * ca + cross(c.xyz, a) * sa + c.xyz * dot(c.xyz, a) * (1.0 - ca);
    nucleo += exp(-dc * dc * 2.4);
    occhio += exp(-dc * dc * 160.0);
  }
  vec3 p = a * uNubiScala + vec3(4.1, 9.3, 2.7);
  vec3 w = rumore3(p * 0.5 + vec3(0.0, uTempo * 0.005, 0.0));
  p += uNubiVort * w;                                                    // i venti le tirano in filamenti
  float sistemi = fbm(p * 0.42 + 13.0, 3, 0.5) * 3.0;                    // dove sta il brutto tempo
  float trama = fbm(p * 1.7 + 0.5 * w + uTempo * 0.004, n, 0.62) * 3.0;  // il disegno fine
  float d = 0.72 * sistemi + 0.68 * trama + 0.06 * cos(q.y * 9.0) + 0.5 * nucleo - 1.5 * occhio;
  return vec2(smoothstep(uNubiSoglia, uNubiSoglia + 0.18, d), smoothstep(uNubiSoglia + 0.1, uNubiSoglia + 0.75, d));
}

vec3 aurora(vec3 q, vec3 pw) {
  float z = (abs(q.y) - 0.88 + 0.1 * rumore(q * 3.0 + uTempo * 0.03)) / 0.035;
  float tende = 0.4 + 5.0 * abs(rumore(q * vec3(22.0, 4.0, 22.0) + vec3(0.0, uTempo * 0.15, 0.0)));
  float notte = 1.0 - smoothstep(-0.2, 0.25, dot(pw, uSole));
  return uAuroraCol * exp(-z * z) * tende * (0.12 + 0.88 * notte) * uAurora;
}

// --- La civiltà (PROGETTO.md, 2.6) ---------------------------------------------------------------
// civilta.js costruisce città e strade e le mette in due tabelle. uCivIndice dice, per ogni cella di una
// griglia 64 × 64 su ogni faccia del cubo, dove iniziano i suoi elementi in uCivDati e quanti sono.
// Città: (centro, raggio) e (popolazione, angolo, seme, 0); tratto di strada: (a, larghezza) e (b, classe).
// In ogni cella vengono prima le città, dalla più grande, poi le strade.
const float ISOLATO = 0.000024; // lato di un isolato, in raggi: a quota minima è una decina di pixel
const float CAMPO = 0.00007;    // lato di un campo coltivato

// La faccia del cubo è l'asse più grande (a parità vince x, poi y), come faccia() in civilta.js.
int facciaCubo(vec3 q, out vec2 uv) {
  vec3 a = abs(q);
  if (a.x >= a.y && a.x >= a.z) { uv = q.yz / a.x; return q.x >= 0.0 ? 0 : 1; }
  if (a.y >= a.z) { uv = q.xz / a.y; return q.y >= 0.0 ? 2 : 3; }
  uv = q.xy / a.z;
  return q.z >= 0.0 ? 4 : 5;
}
vec3 dallaFaccia(int f, vec2 uv) {
  float s = (f & 1) == 0 ? 1.0 : -1.0;
  return normalize(f < 2 ? vec3(s, uv) : (f < 4 ? vec3(uv.x, s, uv.y) : vec3(uv, s)));
}
ivec2 cellaCiv(vec3 q) {
  vec2 uv;
  int f = facciaCubo(q, uv);
  ivec2 c = clamp(ivec2(floor((uv + 1.0) * 32.0)), ivec2(0), ivec2(63));
  return ivec2(f * 64 + c.x, c.y);
}
vec4 civDato(int i) { return texelFetch(uCivDati, ivec2(i & 511, i >> 9), 0); }

// Distanza da un tratto di strada sulla sfera; t dice dove cade lungo il tratto (0-1).
float distTratto(vec3 q, vec3 a, vec3 b, out float t) {
  vec3 ab = b - a;
  t = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(q - normalize(a + ab * t));
}

// Coordinate sul piano tangente in c, girate dell'angolo della città (le stesse tangenti di civilta.js).
vec2 locale(vec3 q, vec3 c, float angolo) {
  vec3 t1 = normalize(cross(c, abs(c.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(c, t1);
  vec3 d = q - c;
  vec2 l = vec2(dot(d, t1), dot(d, t2));
  float co = cos(angolo), si = sin(angolo);
  return vec2(co * l.x + si * l.y, co * l.y - si * l.x);
}

// Una rotazione piccola e diversa per ogni quartiere di 8 × 8: la città è cresciuta a pezzi.
vec2 aPezzi(vec2 g, int seme, float forza) {
  vec2 qi = floor(g / 8.0);
  float r = (h33(ivec3(ivec2(qi), seme)).x - 0.5) * forza;
  vec2 cq = (qi + 0.5) * 8.0, d = g - cq;
  return cq + vec2(d.x * cos(r) - d.y * sin(r), d.x * sin(r) + d.y * cos(r));
}

// Il disegno di una città dall'alto, con g contato in isolati e pi = un pixel in isolati.
// x = via (0-1), y = tono dell'isolato (±0,25), z = parco (0 o 1), w = quanto il disegno si distingue;
// quartiere = quanto è fitto il suo quartiere (0-1), che si vede anche quando gli isolati non si distinguono.
vec4 vie(vec2 g, int seme, float pi, out float quartiere) {
  quartiere = mix(0.5, h33(ivec3(ivec2(floor(g / 8.0)), seme + 4243)).x, smoothstep(1.0, 2.5, 8.0 / pi));
  g = aPezzi(g, seme + 7001, 0.24);
  vec3 h = h33(ivec3(ivec2(floor(g)), seme));
  vec2 dv = abs(g - floor(g + 0.5));              // dalla via più vicina
  vec2 dl = abs(g - 4.0 * floor(g / 4.0 + 0.5));  // dal viale, uno ogni quattro isolati
  float a = 0.5 * pi;
  vec2 via = 1.0 - smoothstep(vec2(0.06 - a), vec2(0.06 + a), dv);
  vec2 viale = 1.0 - smoothstep(vec2(0.14 - a), vec2(0.14 + a), dl);
  return vec4(max(max(via.x, via.y), max(viale.x, viale.y)), (h.x - 0.5) * 0.5, step(h.y, 0.07), smoothstep(1.5, 3.0, 1.0 / pi));
}

// I campi attorno a una città: una scacchiera girata a pezzi, ogni campo col suo colore tra pianura e
// sabbia, qualcuno arato. Sotto un pixel e mezzo per campo resta il colore medio: un alone a mosaico.
vec3 campi(vec2 g, int seme, float pi) {
  vec3 hq = h33(ivec3(ivec2(floor(g / 8.0)), seme + 5113));
  g = aPezzi(g, seme + 3301, 0.5);
  vec3 h = h33(ivec3(ivec2(floor(g)), seme + 911));
  vec3 col = h.y < 0.14 ? uCol[2] * 0.72 : mix(uCol[3], uCol[2], h.x * 0.85);
  vec2 dv = abs(g - floor(g + 0.5));
  float a = 0.5 * pi;
  vec2 siepe = 1.0 - smoothstep(vec2(0.03 - a), vec2(0.03 + a), dv);
  col *= 1.0 - 0.25 * max(siepe.x, siepe.y);
  // da media quota resta il mosaico dei gruppi di 8 × 8 campi, ognuno col suo tono; più in alto il colore medio
  vec3 gruppo = mix(uCol[3], uCol[2], 0.1 + 0.65 * hq.x) * (0.82 + 0.25 * hq.y);
  vec3 lontano = mix(mix(uCol[3], uCol[2], 0.42) * 0.93, gruppo, smoothstep(1.0, 2.5, 8.0 / pi));
  return mix(lontano, col, smoothstep(1.0, 2.5, 1.0 / pi));
}

// La civiltà su un punto di terra: cambia l'albedo e accende le luci della notte.
// Restituisce quanto il punto è costruito e quanto è campo: lì il rilievo si appiattisce.
vec2 civTerra(vec3 q, float e, float px, float calotta, float notte, inout vec3 alb, inout vec3 emiss) {
  vec4 ind = texelFetch(uCivIndice, cellaCiv(q), 0);
  int inizio = int(ind.x), quanti = int(ind.y);
  float costr = 0.0, centro = 0.0;          // il costruito della città che domina il punto, e quanto si è al centro
  vec4 dom = vec4(0.0), domB = vec4(0.0);   // quella città
  float zc = 0.0;                           // la zona dei campi, e la sua città
  vec4 cmp = vec4(0.0), cmpB = vec4(0.0);
  float vD = 1e9, vR = 0.0;                 // la città più vicina, per le case lungo le strade
  float puntoAlb = 0.0, puntoLuce = 0.0;    // le città più piccole di un pixel e mezzo: un punto
  float strada = 0.0, chiara = 0.0, filo = 0.0, striscia = 0.0;
  for (int k = 0; k < 20; k++) {
    if (k >= quanti) break;
    vec4 a = civDato(inizio + 2 * k), b = civDato(inizio + 2 * k + 1);
    if (b.w < 0.5) {
      // una città
      vec3 dv = q - a.xyz;
      float d = length(dv), R = a.w;
      if (d > 4.6 * R + 2.5 * px) continue;
      float rp = R / px;
      float pf = 1.0 - smoothstep(1.0, 2.0, rp);
      if (pf > 0.0) {
        // la sua luce va come l'area, con un tetto: da lontano la notte è fatta di punti, e le prime
        // cento città si vedono anche dallo spazio (il guadagno fa la parte dell'alone dell'aria)
        float gs = exp(-1.4 * d * d / (px * px));
        puntoAlb = max(puntoAlb, pf * gs * min(1.0, 1.6 * rp * rp));
        puntoLuce += pf * gs * min(1.6, 25.0 * rp * rp);
        // l'alone delle città grandi, dentro la zona che la città occupa nell'indice (come in civilta.js)
        float rz = max(4.5 * R, 0.006) + 0.002;
        puntoLuce += pf * exp(-0.3 * d * d / (px * px)) * min(0.45, 2.0 * rp * rp) * (1.0 - smoothstep(0.7 * rz, rz, d));
      }
      if (pf < 1.0) {
        float Rb = R * (0.75 + 0.5 * rumore(dv * (3.0 / R) + b.z * vec3(0.0137, 0.0291, 0.0073))); // il bordo irregolare
        float c = (1.0 - smoothstep(0.55 * Rb, Rb, d)) * (1.0 - pf);
        if (c > costr) {
          costr = c;
          dom = a;
          domB = b;
          centro = 1.0 - smoothstep(0.15 * R, 0.35 * R, d);
        }
        if (d / Rb < vD) {
          vD = d / Rb;
          vR = Rb;
        }
        float z = smoothstep(1.2 * Rb, 1.7 * Rb, d) * (1.0 - smoothstep(3.3 * Rb, 4.0 * Rb, d)) * (1.0 - pf);
        if (z > zc) {
          zc = z;
          cmp = a;
          cmpB = b;
        }
      }
    } else {
      // un tratto di strada
      float t;
      float d = distTratto(q, a.xyz, b.xyz, t);
      float lw = a.w;
      if (vD < 2.6) {
        // le case seguono le strade: una striscia di costruito che esce dalla città
        float ws = max(0.04 * vR, 2.0 * ISOLATO);
        striscia = max(striscia, clamp((ws - d) / px + 0.5, 0.0, 1.0) * min(1.0, ws / px) * (1.0 - smoothstep(1.0, 2.6, vD)));
      }
      if (d > lw + 2.0 * px) continue;
      // più sottile di un pixel, la strada sbiadisce in proporzione: da lontano scompare
      float cop = clamp((0.5 * lw - d) / px + 0.5, 0.0, 1.0) * min(1.0, lw / px);
      if (cop > strada) {
        strada = cop;
        chiara = step(2.5, b.w);
      }
      if (b.w > 2.5) {
        // lungo le autostrade un filo di luci, a punti quando si distinguono
        float lungo = t * length(b.xyz - a.xyz) / (8.0 * lw);
        float punti = mix(0.6, 1.0 - smoothstep(0.15, 0.3, abs(fract(lungo) - 0.5)), smoothstep(1.0, 3.0, 8.0 * lw / px));
        filo = max(filo, cop * punti);
      }
    }
  }

  float terra = (1.0 - calotta) * uCivPronta;
  // i campi, dal livello 2, solo in pianura e sotto tutto il resto
  zc *= (1.0 - smoothstep(0.12, 0.2, e)) * step(1.5, uCiv);
  if (zc > 0.0) alb = mix(alb, campi(locale(q, cmp.xyz, cmpB.y + 0.4) / CAMPO, int(cmpB.z), px / CAMPO), zc * terra * 0.9);
  // il pianeta-città: costruito su tutte le terre abitabili, a quartieri di 0,01 col loro orientamento
  float rete = 0.0;
  if (uCiv > 4.5) {
    float ovunque = smoothstep(0.0, 0.006, e) * (1.0 - smoothstep(0.32, 0.45, e));
    rete = clamp(rumore(q * 45.0 + 3.0) * 2.6 + rumore(q * 130.0 + 8.0) * 2.6, -1.0, 1.0);
    if (ovunque > costr) {
      vec2 uv;
      int f = facciaCubo(q, uv);
      vec2 ci = floor(uv / 0.01);
      vec3 h = h33(ivec3(ivec2(ci), f + 77));
      dom = vec4(dallaFaccia(f, (ci + 0.5) * 0.01), 0.004);
      domB = vec4(0.0, h.x * 1.5708, floor(h.y * 65535.0), 0.0);
      costr = ovunque;
      centro = 0.0;
    }
  }
  float luceCitta = 0.0;
  costr = max(costr, striscia * 0.7);
  if (costr > 0.0) {
    float quartiere;
    vec4 v = vie(locale(q, dom.xyz, domB.y) / ISOLATO, int(domB.z), px / ISOLATO, quartiere);
    vec3 grigio = mix(vec3(0.42, 0.41, 0.40), vec3(0.55, 0.53, 0.50), 0.5 + 2.0 * v.y) * (1.0 + v.y) * (1.0 - 0.2 * centro);
    vec3 casa = mix(grigio, alb, 0.15);   // tinto dal suolo
    vec3 disegno = mix(v.z > 0.5 ? mix(uCol[4], uCol[3], 0.35) : casa, vec3(0.19, 0.19, 0.2), v.x);
    vec3 medio = mix(vec3(0.485, 0.47, 0.45), alb, 0.15) * (0.86 - 0.13 * centro) * (1.0 + 0.12 * rete) * (0.9 + 0.2 * quartiere);
    alb = mix(alb, mix(medio, disegno, v.w), costr * terra);
    // di notte le vie sono le più accese, i parchi bui
    // in media quanto da lontano, così scendendo la luce non cambia: vie accese, isolati fiochi
    float fitto = (0.3 + 0.25 * centro) * (0.45 + 1.1 * quartiere) * (1.0 + 0.35 * rete);
    float accese = v.z > 0.5 ? 0.02 : mix(0.12 * (1.0 + 0.8 * v.y), 1.4, v.x);
    luceCitta = pow(costr, 1.5) * mix(fitto, accese * fitto / 0.35, v.w);
  }
  alb = mix(alb, vec3(0.45, 0.44, 0.42), puntoAlb * terra);
  alb = mix(alb, mix(vec3(0.52, 0.52, 0.5), vec3(0.68, 0.67, 0.64), chiara), strada * terra);
  // la notte: da lontano è fatta di punti, scendendo diventano reticoli; i campi restano bui
  emiss += uCol[10] * (luceCitta * 1.6 + puntoLuce + filo * 1.2) * notte * terra;
  return vec2(costr, zc) * terra;
}

// Sul mare si disegnano solo i ponti: le statali e le autostrade che passano l'acqua. Restituisce quanto copre.
float civMare(vec3 q, float px, float notte, inout vec3 alb, inout vec3 emiss) {
  vec4 ind = texelFetch(uCivIndice, cellaCiv(q), 0);
  int inizio = int(ind.x), quanti = int(ind.y);
  float ponte = 0.0;
  for (int k = 0; k < 20; k++) {
    if (k >= quanti) break;
    vec4 b = civDato(inizio + 2 * k + 1);
    if (b.w < 1.5) continue;
    vec4 a = civDato(inizio + 2 * k);
    float t;
    float d = distTratto(q, a.xyz, b.xyz, t);
    if (d > a.w + 2.0 * px) continue;
    ponte = max(ponte, clamp((0.5 * a.w - d) / px + 0.5, 0.0, 1.0) * min(1.0, a.w / px));
  }
  ponte *= uCivPronta;
  alb = mix(alb, vec3(0.5, 0.5, 0.48), ponte);
  emiss += uCol[10] * ponte * 0.8 * notte;
  return ponte;
}

// Pianeti di roccia, d'acqua, di ghiaccio e di lava. luce = il colore della luce che arriva al suolo.
vec3 roccioso(vec3 pw, vec3 q, vec3 rd, vec3 luce, float px) {
  int n = uQual == 2 ? 6 : (uQual == 1 ? 5 : 4);
  vec3 pf, pendFine;
  float frast;
  float h0 = quotaBase(q, n, pf);
  // da vicino il terreno continua con le ottave fini: altezza, pendenza e frastaglio dei confini
  float h = h0 + dettaglio(pf, n, px, pendFine, frast);
  float e = h - uMare;                                  // altezza sul livello del mare
  float ec = e + 0.003 * frast;                         // la costa, nitida anche da vicino
  float lat = abs(q.y);
  float um = rumore(q * 2.3 + vec3(5.3, 1.9, 8.2)) * 2.0;         // umidità, a grande scala
  float grana = rumore(q * 26.0 + vec3(2.6, 7.4, 3.8)) * 2.0;     // grana fine, per la vista da lontano
  bool liquido = uLiquido != 0 && ec < 0.0;
  float calotta = smoothstep(uPoli, uPoli + 0.07, lat + um * 0.06 + grana * 0.012 + frast * 0.02 + max(e, 0.0) * 0.15);

  vec3 N = pw;
  vec3 alb = vec3(0.0);
  vec3 emiss = vec3(0.0);
  float spec = 0.0;
  float lustro = 60.0;

  if (liquido && uLiquido == 1) {
    // mare: turchese a riva, scuro al largo; il vento increspa e allarga il riflesso
    alb = mix(uCol[1], uCol[0], smoothstep(0.0, 0.16, -e));
    spec = 3.0;
    lustro = mix(70.0, 380.0, 0.5 + 0.5 * clamp(rumore(q * 7.0 + vec3(6.1, 3.3, 9.7)) * 3.0, -1.0, 1.0));
    alb = mix(alb, uCol[7], calotta);
    spec *= 1.0 - calotta * 0.8;
    if (uMariLuce > 0.0) {
      // mari che brillano: plancton acceso sul lato notturno, più fitto verso la costa
      float buio = 1.0 - smoothstep(-0.14, 0.06, dot(pw, uSole));
      float b = max(rumore(q * 40.0 + vec3(0.0, uTempo * 0.01, 0.0)) * 2.0 + 0.3, 0.0);
      emiss += vec3(0.15, 0.9, 0.8) * 0.6 * buio * b * b * (0.35 + 0.65 * (1.0 - smoothstep(0.0, 0.12, -e))) * (1.0 - calotta);
    }
    if (uCiv > 1.5 && uCivPronta > 0.0) spec *= 1.0 - civMare(q, px, 1.0 - smoothstep(-0.14, 0.06, dot(pw, uSole)), alb, emiss);
  } else if (liquido) {
    // mare di lava: vene incandescenti tra zolle di crosta scura
    float v = 1.0 - abs(rumore(q * uCrepeFreq * 1.7 + vec3(1.7, 8.8 + uTempo * 0.006, 4.4))) * 3.2;
    float vene = smoothstep(0.35, 1.0, v);
    float respiro = 0.85 + 0.15 * sin(uTempo * 0.6 + grana * 9.0);
    alb = vec3(0.015);
    emiss = mix(uCol[11], uCol[10], vene * vene) * (0.18 + 2.4 * vene * vene + 0.7 * smoothstep(0.0, 0.3, -e)) * uBrace * respiro;
  } else {
    // rilievo: la pendenza del terreno inclina la normale
    float eps = max(px * 1.5, 0.0015);
    vec3 t1 = normalize(cross(q, abs(q.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 t2 = cross(q, t1);
    float h1 = quota(normalize(q + t1 * eps), n);
    float h2 = quota(normalize(q + t2 * eps), n);
    // la base con le differenze, il dettaglio con la sua derivata, senza la parte lungo q
    pendFine -= q * dot(pendFine, q);
    N = normalize(q - uRilievo * ((t1 * (h1 - h0) + t2 * (h2 - h0)) / eps + 0.7 * pendFine)) * uRot;

    float ee = e + grana * 0.02 + 0.012 * frast;
    vec3 c;
    if (ec < 0.0) {
      // conche asciutte dei pianeti senza mare
      c = mix(uCol[1], uCol[0], smoothstep(0.02, 0.3, -e));
      c = mix(uCol[2], c, smoothstep(0.0, 0.05, -ee));
    } else {
      c = mix(uCol[2], uCol[3], smoothstep(0.0, 0.05, ee));
      c = mix(c, uCol[4], smoothstep(0.08, 0.28, ee + um * 0.2));
      // fasce aride: dipendono dalla latitudine e dall'umidità
      float bagnato = 0.5 + 0.3 * cos(lat * 8.17) + um * 0.9;
      c = mix(c, uCol[2], uClima * (1.0 - smoothstep(0.15, 0.45, bagnato)) * (1.0 - smoothstep(0.25, 0.45, ee)));
      c = mix(c, uCol[5], smoothstep(0.3, 0.55, ee + grana * 0.03));
      // neve in quota, più bassa verso i poli
      c = mix(c, uCol[6], smoothstep(0.58, 0.72, ee + lat * 0.3 * uClima + grana * 0.03));
    }
    c = mix(c, uCol[7], calotta);

    if (uCrepe > 0.0) {
      // crepe: le linee dove un rumore passa per lo zero
      vec3 pc = q * uCrepeFreq + vec3(9.1, 2.2, 5.5);
      float l1 = 1.0 - abs(rumore(pc + 0.5 * rumore3(pc * 0.6))) * 50.0;
      float l2 = 1.0 - abs(rumore(pc * 2.3 + 7.0)) * 40.0;
      float linee = max(smoothstep(0.0, 1.0, l1), 0.6 * smoothstep(0.0, 1.0, l2));
      // da vicino crepe più fini e più sottili: entrano quando la loro trama è larga qualche pixel
      float w3 = smoothstep(2.0, 4.0, 1.0 / (uCrepeFreq * 4.0 * px));
      float w4 = smoothstep(2.0, 4.0, 1.0 / (uCrepeFreq * 16.0 * px));
      if (w3 > 0.0) linee = max(linee, 0.5 * w3 * smoothstep(0.0, 1.0, 1.0 - abs(rumore(pc * 4.0 + 3.1)) * 90.0));
      if (w4 > 0.0) linee = max(linee, 0.4 * w4 * smoothstep(0.0, 1.0, 1.0 - abs(rumore(pc * 16.0 + 5.3)) * 160.0));
      if (uLiquido == 2) emiss += mix(uCol[11], uCol[10], linee * linee) * linee * uBrace * uCrepe * 1.2;
      else c = mix(c, uCol[9], linee * uCrepe * (1.0 - calotta));
    }
    alb = c * (0.9 + 0.12 * grana) * (1.0 + 0.10 * frast);
    spec = uLucido * 0.6 + calotta * 0.15;
    lustro = 40.0;

    // la civiltà: città, vie, strade e campi costruiti da civilta.js
    if (uCiv > 0.0 && uCivPronta > 0.0) {
      vec2 piatto = civTerra(q, e, px, calotta, 1.0 - smoothstep(-0.14, 0.06, dot(pw, uSole)), alb, emiss);
      N = normalize(mix(N, pw, clamp(0.8 * piatto.x + 0.45 * piatto.y, 0.0, 1.0)));
    }
  }

  // luce diretta
  float giorno = smoothstep(-0.04, 0.12, dot(pw, uSole));
  vec3 diretta = alb * luce * max(dot(N, uSole), 0.0) * giorno;
  diretta += alb * uSole2Col * max(dot(N, uSole2), 0.0); // la seconda stella: una luce di taglio, senza ombre
  if (spec > 0.0) {
    vec3 H = normalize(uSole - rd);
    float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, H), 0.0), 5.0);
    diretta += luce * spec * fresnel * (lustro + 8.0) * 0.0398 * pow(max(dot(N, H), 0.0), lustro) * giorno;
  }

  vec3 col = diretta + emiss;
  if (uNubiSoglia < 5.0) {
    float cl = dot(pw, uSole);
    // avvicinandosi le nuvole prendono fino a tre ottave in più
    int piu = uQual == 0 ? 0 : int(3.0 * (1.0 - smoothstep(0.08, 1.2, uQuota)) + 0.5);
    vec2 sopra = nubi(uRotNubi * pw, (uQual == 0 ? 3 : 5) + piu);
    // le nuvole che stanno tra questo punto e la stella: fanno ombra al suolo e alle nuvole vicine
    vec2 davanti = nubi(uRotNubi * normalize(pw + uSole * (0.011 / max(cl, 0.09))), (uQual == 0 ? 3 : 4) + piu);
    col = diretta * (1.0 - 0.72 * davanti.x) + emiss;
    // una nuvola è più chiara dalla parte della stella e dove è più spessa
    float rilievo = clamp(1.0 + 1.2 * (sopra.y - davanti.y) + 0.4 * (sopra.x - davanti.x), 0.45, 1.3);
    float soleNubi = pow(max((cl + 0.1) / 1.1, 0.0), 0.75);
    vec3 cn = uCol[8] * (luce * soleNubi * (0.66 + 0.34 * sopra.y) * rilievo + uSole2Col * max(dot(pw, uSole2), 0.0));
    cn += emiss * (0.55 - 0.3 * sopra.y); // le luci di sotto (città, mari, lava) passano attenuate dalle nuvole
    // scesi sotto le nuvole non si vedono più, ma le loro ombre sul suolo sì
    col = mix(col, cn, sopra.x * (0.7 + 0.28 * sopra.y) * smoothstep(0.025, 0.09, uQuota));
  }
  if (uAurora > 0.0) col += aurora(q, pw);
  return col;
}

// Giganti gassosi: fasce lungo i paralleli, coi confini mossi dai venti e le tempeste che li avvitano.
vec3 gassoso(vec3 pw, vec3 q, vec3 luce) {
  vec3 q0 = q;
  float macchia = 0.0;
  for (int i = 0; i < 2; i++) {
    vec4 s = uTempesta[i];
    if (s.w <= 0.0) continue;
    float d = acos(clamp(dot(q, s.xyz), -1.0, 1.0)) / s.w;
    float ang = 2.4 * exp(-d * d * 0.9);
    float ca = cos(ang), sa = sin(ang);
    q = q * ca + cross(s.xyz, q) * sa + s.xyz * dot(s.xyz, q) * (1.0 - ca);
    macchia = max(macchia, 1.0 - smoothstep(0.5, 1.05, d));
  }
  // i venti: vortici grandi e piccoli spostano i confini tra le fasce
  vec3 v0 = vec3(q.x, q.y * 2.8, q.z) * uFreq;
  vec3 w1 = rumore3(v0 + vec3(uTempo * 0.003, 0.0, 0.0));
  vec3 w2 = rumore3(v0 * 2.9 + 1.5 * w1 + 9.0);
  float y = asin(clamp(q.y, -1.0, 1.0)) * 0.63662 + uTurb * (0.045 * w1.y + 0.02 * w2.y);
  // le fasce: larghe, medie e sottili
  float v = rumore1(y * uFasce + 3.0) * 0.6 + rumore1(y * uFasce * 2.6 + 17.0) * 0.28 + rumore1(y * uFasce * 6.3 + 29.0) * 0.12;
  // filamenti tirati dal vento lungo i paralleli
  vec3 f = vec3(q.x, y * 7.0, q.z) * uFreq * 2.2 + 0.7 * w2 + vec3(7.7, 2.9, 5.1);
  float fili = fbm(f + vec3(uTempo * 0.002, 0.0, 0.0), uQual == 0 ? 3 : 5, 0.6) * 3.0;
  v = clamp(smoothstep(0.15, 0.85, v) + 0.16 * fili, 0.0, 1.0);
  float x = v * 4.0;
  int i0 = clamp(int(floor(x)), 0, 3);
  vec3 c = mix(uCol[2 + i0], uCol[3 + i0], smoothstep(0.0, 1.0, x - float(i0)));
  c *= 0.9 + 0.3 * fili;
  c = mix(c, uCol[9] * (0.85 + 0.4 * fili), macchia * 0.85);
  c = mix(c, uCol[7], smoothstep(0.62, 0.95, abs(y)) * 0.7);
  if (uEsagono > 0.0 && q0.y > 0.0) {
    // l'esagono polare: una corrente a getto che gira attorno al polo nord su sei lati dritti
    vec2 pp = q0.xz;
    float dh = max(abs(pp.x), max(abs(dot(pp, vec2(0.5, 0.8660254))), abs(dot(pp, vec2(-0.5, 0.8660254)))));
    c *= 1.0 - 0.4 * (1.0 - smoothstep(0.204, 0.216, dh));
    c += uCol[8] * 0.3 * exp(-(dh - 0.21) * (dh - 0.21) / 0.00004);
  }
  vec3 col = c * (luce * max(dot(pw, uSole), 0.0) + uSole2Col * max(dot(pw, uSole2), 0.0));
  if (uAurora > 0.0) col += aurora(q0, pw);
  return col;
}
`;

// ---------------------------------------------------------------------------
// Il cielo: stelle, via lattea, la stella del pianeta. E le lune.
// ---------------------------------------------------------------------------
const CIELO = `
vec3 cielo(vec3 rd, float pix) {
  vec3 g = uCielo * rd;                       // coordinate della galassia: g.y è la distanza dal suo piano
  float banda = exp(-g.y * g.y * (uNebForza > 1.0 ? 2.25 : 9.0)); // col cielo di nebulosa la fascia è larga il doppio
  vec3 c = vec3(0.0);

  // stelle: come nel cielo vero, tantissime deboli e pochissime forti
  for (int k = 0; k < 2; k++) {
    float fitte = k == 0 ? 56.0 : 140.0;
    vec3 p = rd * fitte;
    vec3 fl = floor(p);
    ivec3 i = ivec3(fl) + ivec3(k * 131);
    vec3 h = h33(i);
    vec3 centro = normalize(fl + 0.2 + 0.6 * h) * fitte;
    if (any(notEqual(floor(centro), fl))) continue;
    vec3 h2 = h33(i + ivec3(17, 59, 83));
    float lum = (k == 0 ? 0.02 : 0.007) * pow(max(h2.x, 0.0004), -0.667) * (0.55 + 0.9 * banda);
    float raggio = pix * (1.0 + 0.6 * smoothstep(0.1, 1.2, lum));
    float d = length(p - centro) / fitte;
    vec3 tinta = mix(vec3(1.0), mix(vec3(1.0, 0.7, 0.5), vec3(0.6, 0.75, 1.0), h2.y), 0.55);
    c += tinta * min(lum, 2.5) * exp(-d * d / (raggio * raggio));
  }

  // via lattea: una fascia di luce con le sue nubi scure
  if (uQual > 0) {
    float n = fbm(g * 3.0 + 5.0, 4, 0.55) * 3.0;
    float polvere = smoothstep(-0.1, 0.5, fbm(g * 5.0 + 40.0, 3, 0.5) * 3.0 + (1.0 - abs(g.y) * 6.0) * 0.3);
    c += mix(uNebA, uNebB, 0.5 + 0.5 * n) * banda * (0.5 + 0.8 * max(n + 0.3, 0.0)) * (1.0 - 0.6 * polvere * banda) * 0.022 * uNebForza;
  }

  // la stella del pianeta, col suo alone
  float cs = dot(rd, uSole);
  if (cs > 0.0) {
    float disco = smoothstep(0.9999, 0.99996, cs);
    c += uStellaCol * (disco * 40.0 + 1.2 * pow(cs, 1500.0) + 0.18 * pow(cs, 90.0) + 0.035 * pow(cs, 9.0));
  }
  // la seconda stella, se c'è: più piccola e più debole
  float cs2 = dot(rd, uSole2);
  if (cs2 > 0.0 && dot(uStella2Col, vec3(1.0)) > 0.0) {
    float disco2 = smoothstep(0.99996, 0.99999, cs2);
    c += uStella2Col * (disco2 * 40.0 + 1.2 * pow(cs2, 3000.0) + 0.15 * pow(cs2, 180.0) + 0.03 * pow(cs2, 14.0));
  }
  return c;
}

// Una luna: mari scuri, crateri accennati, e l'eclissi quando entra nell'ombra del pianeta.
vec3 luna(int i, vec3 p) {
  vec3 n = (p - uLuna[i].xyz) / uLuna[i].w;
  vec3 s = n * 2.6 + float(i) * 17.0 + vec3(3.0, 7.0, 11.0);
  float mari = fbm(s, 4, 0.55) * 3.0;
  float crateri = 1.0 - abs(rumore(s * 4.0)) * 2.5;
  vec3 alb = uLunaCol[i] * (0.72 + 0.5 * mari) * (0.9 + 0.15 * crateri);
  float b = dot(p, uSole);
  float ombra = b < 0.0 ? smoothstep(0.98, 1.06, length(p - uSole * b)) : 1.0;
  return alb * uSoleCol * pow(max(dot(n, uSole), 0.0), 0.8) * ombra;
}
`;

const PRINCIPALE = `
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRis) / uRis.y - uCentro;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCam * vec3(uv * uTanFov, 1.0));
  float pix = 2.0 * uTanFov / uRis.y;         // quanto è largo un pixel, in radianti

  gSeme = ivec3(0); // il cielo non dipende dal pianeta
  vec3 col = cielo(rd, pix);
  gSeme = uSemeI;

  // pianeta: copP è quanta parte del pixel copre (bordo senza scalette)
  float b = dot(ro, rd);
  float vicino = -b;
  float scarto = sqrt(max(dot(ro, ro) - b * b, 0.0));
  float copP = vicino > 0.0 ? clamp((1.0 - scarto) / (pix * vicino) + 0.5, 0.0, 1.0) : 0.0;
  float tP = copP > 0.0 ? vicino - sqrt(max(1.0 - scarto * scarto, 0.0)) : LONTANO;

  // la luna più vicina sul raggio
  float tL = LONTANO, copL = 0.0;
  int quale = -1;
  for (int i = 0; i < uLune; i++) {
    vec3 oc = ro - uLuna[i].xyz;
    float bb = dot(oc, rd);
    if (bb >= 0.0) continue;
    float s = sqrt(max(dot(oc, oc) - bb * bb, 0.0));
    float rr = uLuna[i].w;
    float cp = clamp((rr - s) / (pix * -bb) + 0.5, 0.0, 1.0);
    if (cp <= 0.0) continue;
    float t = -bb - sqrt(max(rr * rr - s * s, 0.0));
    if (t < tL) { tL = t; copL = cp; quale = i; }
  }

  // anelli: dove il raggio buca il loro piano
  float tR = LONTANO;
  if (uAnello.y > 0.0) {
    float dn = dot(rd, uAsse);
    if (abs(dn) > 1e-5) {
      float t = -dot(ro, uAsse) / dn;
      float r = length(ro + rd * t);
      if (t > 0.0 && r > uAnello.x && r < uAnello.y) tR = t;
    }
  }

  // quello che sta dietro a qualcosa di pieno non si calcola
  if (copP >= 1.0 && tR > tP) tR = LONTANO;
  if (copL >= 1.0 && tR > tL) tR = LONTANO;
  if (copP >= 1.0 && tL > tP) tL = LONTANO;

  // pianeta e aria
  float tA = LONTANO;
  vec3 suolo = vec3(0.0), luceAria = vec3(0.0), tras = vec3(1.0);
  float a0, a1;
  if (sfera(ro, rd, uRAtm, a0, a1) && a1 > 0.0 && !(copL >= 1.0 && tL < a0)) {
    tA = copP > 0.0 ? tP : vicino;
    float fine = a1;
    if (copP > 0.0) {
      vec3 pw = normalize(ro + rd * tP);
      vec3 q = uRot * pw;
      vec2 ol = versoSole(pw * 1.0002);
      vec3 luce = uSoleCol * exp(-(uBetaR * ol.x + uBetaM * 1.1 * ol.y)) * ombraAnello(pw);
      suolo = uTipo == 5 ? gassoso(pw, q, luce) : roccioso(pw, q, rd, luce, pix * tP / max(dot(-rd, pw), 0.2));
      fine = mix(a1, tP, copP);
    }
    luceAria = atmosfera(ro, rd, max(a0, 0.0), fine, tras);
  }

  vec3 colLuna = tL < LONTANO ? luna(quale, ro + rd * tL) : vec3(0.0);
  vec4 colAnello = tR < LONTANO ? anello(ro + rd * tR, rd, tR * pix) : vec4(0.0);

  // si dipinge dal più lontano al più vicino
  for (int passo = 0; passo < 3; passo++) {
    float m = -1.0;
    int s = -1;
    if (tR < LONTANO && tR > m) { m = tR; s = 0; }
    if (tL < LONTANO && tL > m) { m = tL; s = 1; }
    if (tA < LONTANO && tA > m) { m = tA; s = 2; }
    if (s < 0) break;
    if (s == 0) { col = col * (1.0 - colAnello.a) + colAnello.rgb; tR = LONTANO; }
    else if (s == 1) { col = mix(col, colLuna, copL); tL = LONTANO; }
    else { col = mix(col, suolo, copP) * tras + luceAria; tA = LONTANO; }
  }

  // dalla luce al colore dello schermo: esposizione, curva ACES (formula di Narkowicz), gamma
  col *= uEspo * uVelo;
  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
  col = pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2));
  // un velo di grana rompe le bande nei gradienti scuri
  col += (h11(int(gl_FragCoord.x) + int(gl_FragCoord.y) * 8191) - 0.5) / 255.0;
  esito = vec4(col, 1.0);
}
`;

/** Il programma che disegna il pianeta visto dallo spazio. */
export const SPAZIO = [INTESTAZIONE, RUMORE, ARIA, ANELLI, SUPERFICIE, CIELO, PRINCIPALE].join('\n');
