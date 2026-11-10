// terreno.js — la quota del terreno di base, la stessa dello shader (piega, sei ottave, creste), tradotta
// in JavaScript. Serve a mettere città e strade sulla terra e mai in mare. Solo interi, + − × ÷:
// lo stesso risultato su ogni dispositivo. tools/confronto.html controlla che coincida con lo shader.

const K = 2.3283064365386963e-10; // 1 / 2³²

/**
 * Il terreno di un pianeta. Restituisce quota(x, y, z): l'altezza sul livello del mare nel punto (x, y, z)
 * della sfera unitaria, nelle coordinate del pianeta (y è l'asse). Sotto zero c'è il mare.
 */
export function creaTerreno(p) {
  const t = p.terreno;
  const [sx, sy, sz] = t.semi;
  const { frequenza, piega, guadagno, scala, mare, creste } = t;
  // l'ultimo hash e l'ultimo rumore3, in variabili: niente array nei cicli, che sono tanti
  let hx = 0, hy = 0, hz = 0;
  let rx = 0, ry = 0, rz = 0;

  // h33 dello shader: pcg3d sugli interi della cella più il seme, con gli stessi giri di bit
  function h33(ix, iy, iz) {
    let x = (Math.imul((ix + sx) >>> 0, 1664525) + 1013904223) >>> 0;
    let y = (Math.imul((iy + sy) >>> 0, 1664525) + 1013904223) >>> 0;
    let z = (Math.imul((iz + sz) >>> 0, 1664525) + 1013904223) >>> 0;
    x = (x + Math.imul(y, z)) >>> 0;
    y = (y + Math.imul(z, x)) >>> 0;
    z = (z + Math.imul(x, y)) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    y = (y ^ (y >>> 16)) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;
    x = (x + Math.imul(y, z)) >>> 0;
    y = (y + Math.imul(z, x)) >>> 0;
    z = (z + Math.imul(x, y)) >>> 0;
    hx = x * K;
    hy = y * K;
    hz = z * K;
  }

  // un angolo della cella: il suo gradiente per la distanza dall'angolo
  function g(ix, iy, iz, fx, fy, fz) {
    h33(ix, iy, iz);
    return (hx * 2 - 1) * fx + (hy * 2 - 1) * fy + (hz * 2 - 1) * fz;
  }

  // rumore a gradiente con la curva quintica, come rumore() dello shader
  function rumore(px, py, pz) {
    const x = Math.floor(px), y = Math.floor(py), z = Math.floor(pz);
    const fx = px - x, fy = py - y, fz = pz - z;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
    const a = g(x, y, z, fx, fy, fz), b = g(x + 1, y, z, fx - 1, fy, fz);
    const c = g(x, y + 1, z, fx, fy - 1, fz), d = g(x + 1, y + 1, z, fx - 1, fy - 1, fz);
    const e = g(x, y, z + 1, fx, fy, fz - 1), f = g(x + 1, y, z + 1, fx - 1, fy, fz - 1);
    const h = g(x, y + 1, z + 1, fx, fy - 1, fz - 1), k = g(x + 1, y + 1, z + 1, fx - 1, fy - 1, fz - 1);
    const ab = a + (b - a) * ux, cd = c + (d - c) * ux, ef = e + (f - e) * ux, hk = h + (k - h) * ux;
    const sotto = ab + (cd - ab) * uy, sopra = ef + (hk - ef) * uy;
    return sotto + (sopra - sotto) * uz;
  }

  // tre rumori di valore tra -1 e 1, con la curva cubica: piegano le coordinate (rumore3 dello shader)
  function rumore3(px, py, pz) {
    const x = Math.floor(px), y = Math.floor(py), z = Math.floor(pz);
    let ux = px - x, uy = py - y, uz = pz - z;
    ux = ux * ux * (3 - 2 * ux);
    uy = uy * uy * (3 - 2 * uy);
    uz = uz * uz * (3 - 2 * uz);
    const v = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 8; i++) {
      h33(x + (i & 1), y + ((i >> 1) & 1), z + (i >> 2));
      v[i * 3] = hx;
      v[i * 3 + 1] = hy;
      v[i * 3 + 2] = hz;
    }
    const m = (o) => {
      const a = v[o] + (v[o + 3] - v[o]) * ux, b = v[o + 6] + (v[o + 9] - v[o + 6]) * ux;
      const c = v[o + 12] + (v[o + 15] - v[o + 12]) * ux, d = v[o + 18] + (v[o + 21] - v[o + 18]) * ux;
      const s = a + (b - a) * uy, t = c + (d - c) * uy;
      return (s + (t - s) * uz) * 2 - 1;
    };
    rx = m(0);
    ry = m(1);
    rz = m(2);
  }

  const liscio = (a, b, x) => {
    const s = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return s * s * (3 - 2 * s);
  };

  return function quota(qx, qy, qz) {
    let px = qx * frequenza, py = qy * frequenza, pz = qz * frequenza;
    rumore3(px * 0.7 + 31.4, py * 0.7 + 31.4, pz * 0.7 + 31.4);
    px += piega * rx;
    py += piega * ry;
    pz += piega * rz;
    let fx = px, fy = py, fz = pz, a = 0.5, s = 0;
    for (let i = 0; i < 6; i++) {
      s += a * rumore(fx, fy, fz);
      // GIRA · p + 11,3: GIRA è scritta per colonne nello shader
      const nx = -1.616 * fy - 1.212 * fz + 11.3;
      const ny = 1.616 * fx + 0.7272 * fy - 0.9696 * fz + 11.3;
      const nz = 1.212 * fx - 0.9696 * fy + 1.2928 * fz + 11.3;
      fx = nx;
      fy = ny;
      fz = nz;
      a *= guadagno;
    }
    let h = s * scala;
    // le creste delle catene di montagne, dove la terra è già alta
    const c = 1 - Math.abs(rumore(px * 3.1 + 57, py * 3.1 + 57, pz * 3.1 + 57)) * 2.6;
    h += creste * liscio(mare, mare + 0.35, h) * (c * c - 0.4);
    return h - mare;
  };
}
