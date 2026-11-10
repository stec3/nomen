// etichette.js — i nomi delle città sopra la tela, come su un mappamondo (PROGETTO.md, 2.6).
// A ogni fotogramma si proiettano le città più popolose tra quelle visibili, senza che si coprano;
// la capitale ha il suo segno. Si vedono solo scendendo sotto quota 0,5.
const MASSIMO = 14;

export function creaEtichette(contenitore, motore) {
  const voci = Array.from({ length: MASSIMO }, () => {
    const s = document.createElement('span');
    s.className = 'etichetta';
    s.hidden = true;
    contenitore.append(s);
    return s;
  });

  return function aggiorna() {
    const civ = motore.civilta();
    const { quota } = motore.stato();
    const chiaro = Math.min(1, Math.max(0, (0.5 - quota) / 0.15)); // entrano tra quota 0,5 e 0,35
    contenitore.style.opacity = chiaro.toFixed(2);
    let n = 0;
    if (civ && chiaro > 0) {
      const prese = [];
      // le città sono già in ordine di popolazione: la prima è la capitale
      for (const c of civ.citta) {
        if (n === MASSIMO) break;
        const pt = motore.proietta(c.c);
        if (!pt) continue;
        if (c.R < 1.2 * pt.px) break; // più piccola di un paio di pixel: da qui in giù lo sono tutte
        const largo = 7 * c.nome.length + 18, alto = 16;
        if (prese.some((r) => Math.abs(r.x - pt.x) < (r.largo + largo) / 2 && Math.abs(r.y - pt.y) < alto)) continue;
        prese.push({ x: pt.x, y: pt.y, largo });
        const s = voci[n++];
        s.textContent = c.nome;
        s.classList.toggle('capitale', c.rango === 1);
        s.style.transform = `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px) translate(-50%, -50%)`;
        s.hidden = false;
      }
    }
    for (let i = n; i < MASSIMO; i++) voci[i].hidden = true;
  };
}
