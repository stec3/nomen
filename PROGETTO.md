# Nomen — progetto

Progettazione del 10/11/2026, scritta da Claude Fable 5.2 perché il codice venga scritto seguendola (Claude Opus 5.5). `SPECIFICA.md` dice cos'è il progetto e quali regole non si rompono; questo file dice come si costruiscono le fasi 1-4, con le scelte già prese, i numeri e le formule. Dove i due non concordano vale questo, e la specifica va corretta.

## Cosa cambia rispetto alla specifica

- **Le strade ci sono.** Decisione di Stefano del 10/11: «senza strade» voleva dire che non si guida e non si scende al livello della strada, non che le strade mancano. Un mondo con la vita deve mostrare una civiltà vera: città, strade che le collegano, campi, luci.
- **La civiltà nasce dai criteri, non da un tiro di dado.** Quattro criteri di abitabilità, calcolati dai parametri del pianeta: se ci sono tutti, c'è una civiltà. La scheda li mostra, così si vedono anche i mondi a cui ne mancava uno solo.
- **«1 su N» è misurato, non moltiplicato.** I tratti non sono indipendenti (i mari che brillano vogliono mare e vita), quindi il prodotto delle probabilità direbbe il falso. N si legge da una tabella misurata su milioni di nomi.
- **La civiltà si costruisce una volta sul processore**, in JavaScript, e la scheda grafica la disegna leggendo due tabelle. Calcolata pixel per pixel non darebbe mai strade che collegano davvero le città.
- **Quota minima 0,006 raggi** (non 0,012). Più sotto i numeri a 32 bit non bastano senza coordinate relative alla camera: è lavoro da atterraggio.

Primo gesto: correggere in `SPECIFICA.md` il punto 3 della direzione, la tabella dei tratti, le città della fase 2, «Le strade non si fanno adesso» e «Più avanti, forse: le strade», e aggiungere il rimando a questo file (anche in `CLAUDE.md`).

## Ordine e tappe

Ogni tappa finisce con console pulita, `node --test` verde e un commit locale.

1. Fase 1 intera: particolari, criteri, rarità, scheda, nomi a caso, collaudi, `tests/oro.json`, più il seme dentro l'hash (2.1): sposta i continenti di ogni nome, quindi va fatto prima di fissare `oro.json`.
2. Fase 2a: camera e dettaglio a ogni quota (2.2-2.3).
3. Fase 2b: terreno in JavaScript, civiltà costruita, disegno di città e strade, etichette, misure (2.4-2.8).
4. Fase 3: universo.
5. Fase 4: documenti.

Regola per tutto il codice nuovo che decide qualcosa: **soglie, tratti e criteri si calcolano solo con + − × ÷, radice quadrata e interi.** `Math.sin`, `cos`, `exp`, `pow`, `log` possono dare un ultimo bit diverso da un browser all'altro: vanno bene per i numeri che si mostrano o si disegnano, mai per un confronto con una soglia.

## Fase 1 — Particolari, criteri, rarità

Prima del primo commit le chiavi esistenti si possono ancora cambiare: dopo `oro.json` no.

### 1.1 Cosa aggiunge `pianeta()`

```js
p.fisica  = { temperatura, raggio, densita, gravita, pressione, distanza, anno, giornoOre }
p.criteri = { acqua, clima, aria, terre }        // quattro booleani
p.vita    = 0..1
p.civilta = null | { livello: 1..5, capitale, abitanti }
p.tratti  = ['aurora', 'dueSoli', …]             // id dei tratti rari presenti
p.primati = ['lunaGigante', …]                   // estremi delle misure
p.titolo  = null | 'gemello'
p.scheda  = { superficie: [{ id, parte }], nubi, … }   // le parti sommano a 100
p.rarita  = { punti, livello: 0..5, unoSu, oltre }     // da valuta(), vedi 1.6
```

Spariscono `p.citta`, `p.aurora` (ora in `p.tratti`) e `terreno.spostamento` (vedi 2.1).

### 1.2 Fisica coerente

Chiavi nuove `fisica.*`. La temperatura si estrae per tipo, e il resto ne discende.

- **Temperatura media** in °C, uniforme: terrestre da −35 a 65, oceanico da −25 a 65, desertico da −60 a 100, ghiacciato da −230 a −45, lavico da 350 a 1500, gassoso da −210 a 700.
- **La temperatura si vede.** Per terrestre, oceanico e desertico le calotte non sono più un tiro libero: con `x = (T − Tmin) / (Tmax − Tmin)`, `poli = a + (b − a) · x^0.75 + (u('terreno.poli') − 0.5) · 0.03`, dove `x^0.75 = sqrt(x · sqrt(x))`: con le sole radici il conto è uguale ovunque, con (a, b) = (0,64, 0,97) terrestre, (0,70, 0,98) oceanico, (0,85, 0,995) desertico. Sopra i 45 °C niente calotte (`poli = 2`). Mondo freddo, calotte grandi.
- **Pressione** in atmosfere: `(forza / 0.65)³`, dove `forza` è `aria.forza`, lo stesso numero che disegna l'alone d'aria.
- **Stelle**: a `STELLE` si aggiungono luminosità e massa: rossa 0,04 e 0,4; arancione 0,3 e 0,75; gialla 1 e 1; bianca 5 e 1,5; azzurra 40 e 3.
- **Distanza** in unità astronomiche: `sqrt(lum) · (255 / Teq)²`, con `Teq = T + 273,15 − 33 · min(pressione, 3)^0.3` per i mondi con aria, `T + 273,15` per i gassosi, mai sotto 25. Controllo: 15 °C, 1 atmosfera, stella gialla dà 1.
- **Anno** in giorni: `365,25 · sqrt(distanza³ / massa)`. **Giorno** in ore: `p.giorno · 0,24` (gassosi `· 0,2`); la scheda dice anche i secondi veri della simulazione.
- **Raggio** in km: terrestre e oceanico 4500-9000, desertico 2800-7500, ghiacciato 1800-7000, lavico 3000-8500, gassoso 21000-80000. **Densità** in g/cm³: 5,0-5,8; oceanico 3,8-5,0; desertico 3,6-5,2; ghiacciato 1,6-3,0; lavico 5,2-7,0; gassoso 0,5-1,8. **Gravità** in g: `(densita / 5,51) · (raggio / 6371)`.

**Superficie** (le parti sommano a 100). Con `k = min(poli, 1)` e `F = Φ(mare / 0,33)`:

- con mare (terrestre, oceanico, desertico con falde): acqua `F · k`, terre `(1 − F) · k`, ghiacci `1 − k`;
- desertico senza falde: terre `k`, ghiacci `1 − k`; ghiacciato: ghiaccio 100; lavico: lava `F`, crosta `1 − F`;
- gassoso: idrogeno 75-92 (chiave nuova), tracce 0,2-2, elio il resto. Il gas in tracce dipende dalla tavolozza, perché è lui a dare il colore: ammoniaca, zolfo, metano, cristalli d'ammoniaca, toline, vapori di silicati, cloro, fosfina.

Φ senza `exp`, deterministica ovunque (Abramowitz e Stegun 26.2.19): per z ≥ 0, `Φ = 1 − 0,5 / s¹⁶` con `s = 1 + z(0,0498673470 + z(0,0211410061 + z(0,0032776263 + z(0,0000380036 + z(0,0000488906 + z · 0,0000053830)))))`, e `s¹⁶` fatto con quattro quadrati; per z < 0 è `1 − Φ(−z)`. Un collaudo controlla Φ(0) = 0,5, Φ(1) = 0,8413, Φ(2) = 0,9772.

### 1.3 Criteri, vita, civiltà

I quattro criteri, uguali per tutti i tipi:

1. **Acqua liquida**: il mondo ha un mare d'acqua (`liquido === 1`). Terrestri e oceanici sì. I desertici solo con le **falde**: `prob('falde', 0.4)`, che dà `liquido = 1`, `mare = tra('falde.mare', −0.75, −0.5)` (laghi salati, dall'1 al 6 % della superficie) e sostituisce le caselle 0 e 1 della tavolozza con due colori d'acqua (`0c2f3f`, `2e7f86`).
2. **Clima mite**: temperatura media tra −5 e 40 °C.
3. **Aria abbastanza densa**: pressione di almeno 0,2 atmosfere.
4. **Terre emerse**: almeno l'8 % della superficie.

**Vita**, con `n` = criteri soddisfatti e `u = u('vita')`: senza acqua vale 0 (mondo sterile); con 4 su 4 `0,6 + 0,4u`; con 3 su 4 `0,2 + 0,4u`; con meno `0,02 + 0,18u`. Si vede senza toccare lo shader: le caselle 3 e 4 (pianura, bosco) diventano `mix(spoglio, colore, smoothstep(0,05, 0,7, vita))`, con `spoglio = mix(casella 2, casella 5, 0,45)`.

**Civiltà**: c'è se e solo se i criteri sono 4 su 4. Il livello viene da `scegli('civilta.livello', [340, 360, 220, 74, 6])`: 1 villaggi, 2 città, 3 nazioni, 4 mondo connesso, 5 pianeta-città. Attese: 45 % dei terrestri, circa 30 % degli oceanici, circa 5 % dei desertici, in tutto circa un nome su sei; il numero vero lo misura lo script. `capitale` è un nome fatto di sillabe dal seme del pianeta; `abitanti` è un ordine di grandezza, `10^(5,5 + 1,1 · livello)` per un fattore del pianeta. Fino alla fase 2b la civiltà si vede con le luci di città di oggi (`uCitta = 1`).

### 1.4 Tratti rari

Ognuno ha il suo tiro (`prob('tratto.<id>', p)`) valido solo per chi può averlo, e qualcosa che si vede. La colonna «circa» è l'attesa: la scheda mostra il valore misurato.

| id | Chi può averlo | p | Circa 1 su | Cosa si vede |
|---|---|---|---|---|
| `aurora` | tutti | 0,12 | 8 | c'è già |
| `civilta` | criteri 4 su 4 | — | 6 | città, strade, campi, luci (fase 2b) |
| `asse` | tutti | 0,06 | 17 | asse sdraiato, c'è già |
| `dueSoli` | tutti | 0,03 | 33 | seconda stella nel cielo e una luce di taglio debole |
| `nebulosa` | tutti | 0,015 | 67 | il cielo attraversato da una nebulosa accesa |
| `mariLuce` | mare e vita ≥ 0,2 | 0,018 | 120 | i mari brillano sul lato notturno |
| `esagono` | gassosi | 0,04 | 125 | esagono al polo |
| `oceanoGlobale` | oceanici | 0,05 | 125 | nessuna terra: `mare = 1,2` |
| `cromatico` | tutti | 1/256 | 256 | tavolozza speciale del suo tipo |
| `pianetaCitta` | civiltà di livello 5 | — | 1000 | tutte le terre costruite |

Come si fanno:

- `dueSoli`: `uSole2` è `SOLE` ruotato di 10-25° attorno a un asse perpendicolare estratto; `uStella2Col` da un secondo tiro su `STELLE`, a metà forza. In `cielo()` lo stesso blocco della stella, col disco più piccolo. Sulla superficie una luce in più senza ombre: `alb · uStella2Col · 0,25 · max(dot(N, uSole2), 0)`.
- `nebulosa`: uniforme `uNebForza` (1 di norma, 7 col tratto) sulla via lattea, con la fascia larga il doppio.
- `mariLuce`: nel ramo del mare, `emiss += vec3(0,15, 0,9, 0,8) · 0,6 · notte · pow(max(rumore(q · 40 + deriva) · 2 + 0,3, 0), 2) · (1 − smoothstep(0, 0,12, −e))`.
- `esagono`: in `gassoso`, a un polo, il bordo della calotta è `abs(y) + 0,018 · cos(6 · atan(q.z, q.x))`: dentro più scuro, con un getto chiaro sottile lungo il bordo.
- `cromatico`: `CROMATICHE[tipo]`, una tavolozza in più per tipo, da disegnare e giudicare sulla griglia.

Facoltativi, per ultimi e solo se avanza tempo: `cometa` (p 0,02, coda opposta alla stella, in `cielo()`) e `fulmini` (p 0,05 sui mondi con nubi sopra 0,35 e sui gassosi: lampi nelle nuvole del lato notturno).

### 1.5 Primati e titoli

I **primati** sono le code di misure che esistono già, senza codice di disegno: `lunaGigante` (prima luna con raggio oltre 0,13), `anelliImmensi` (`u('anelli.larghezza') > 0,88`), `giornoLampo` e `giornoEterno` (`u('giorno')` sotto 0,04 e sopra 0,96), `colosso` e `minuscolo` (`u('fisica.raggio')` sopra 0,96 e sotto 0,04), `rigoglio` (vita ≥ 0,95), `treCicloni`, `cieloCoperto` (`u('nubi.copertura') > 0,95` su terrestri e oceanici).

I **titoli** sono combinazioni con un nome: se ne mostra uno solo, il più raro, con la sua frequenza misurata, e non entrano nel punteggio. «Gemello della Terra» (terrestre o oceanico, perché i terrestri da soli arrivano al 64 % d'acqua; acqua tra 60 e 78 %, civiltà, una luna, stella gialla, niente anelli); «Notte accesa» (civiltà, aurore e mari che brillano); «Sotto due soli» (civiltà e due soli); «Civiltà del deserto»; «Mondo incoronato» (anelli e tre lune); «Mondo-giardino»; «Perla» (oceano globale con gli anelli). Nomi generici, mai marchi o opere altrui.

### 1.6 Punteggio, livello, «1 su N»

- `tools/rarita.js` genera 3.000.000 di nomi (`r0`, `r1`, …), conta la frequenza `f` di ogni tratto, primato e titolo, e assegna a ognuno un peso intero in centesimi di bit, `round(100 · log2(1 / f))`. Entrano nel punteggio solo quelli con `f ≤ 0,2`.
- I **punti** di un mondo sono la somma intera dei pesi dei suoi tratti e primati. Tutto intero: nessun arrotondamento può cambiare il livello.
- La **coda**: per ogni soglia di punti (passo 25), la parte dei nomi che ne ha almeno altrettanti. «1 su N» è l'inverso di quella parte: vuol dire «un nome su N ha un mondo raro almeno quanto questo», ed è vero per costruzione. Dove la coda ha meno di 30 nomi nel campione la scheda dice «oltre 1 su M».
- I **livelli** (comune, non comune, raro, epico, leggendario, mitico) sono cinque soglie di punti, scelte dallo script perché le quote vengano il più vicino possibile a 55 / 27 / 12 / 4,5 / 1,3 / 0,2 %.
- Lo script scrive `js/rarita.js` (solo dati: `FREQUENZE`, `PESI`, `SOGLIE`, `CODA`, `CAMPIONE`) e `docs/misure/rarita.json`. `nome.js` lo importa e `valuta(p)` riempie `p.rarita`. Lo script usa solo i tratti, quindi non c'è giro vizioso: la prima volta il file esiste con valori di comodo.

### 1.7 La scheda e i nomi a caso

`descrivi(p, lingua)` restituisce dati, non HTML: `{ riga, livello, unoSu, titolo, tratti: [{ nome, unoSu }], criteri: [{ nome, ok, valore }], civilta, superficie: [{ nome, parte, colore }], particolari: [{ etichetta, valore }] }`. `main.js` li mette in pagina.

```html
<main id="scheda">
  <h1 id="nome">  <p id="riga">        <!-- tipo · stella -->
  <p id="rango">                        <!-- pillola del livello · 1 su N · titolo -->
  <ul id="tratti">                      <!-- una pastiglia per tratto: nome · 1 su n -->
  <details id="particolari">            <!-- chiuso all'arrivo -->
    <summary>Particolari</summary>
    criteri (quattro segni ✓ ✗ col valore), civiltà, barra della superficie, righe
  </details>
  <form id="forma"> casella · vai · <button id="caso">   <!-- il dado -->
</main>
```

- Chiusa mostra nome, riga, livello con «1 su N», titolo e al massimo due pastiglie più «+n». Aperta è un foglio alto al massimo il 46 % dello schermo, che scorre. La scheda resta `pointer-events: none`, con `auto` solo sui pezzi che si toccano.
- Niente tabelle: la superficie è una barra a segmenti colorati con la legenda sotto; i particolari sono righe «etichetta valore» su due colonne (temperatura, giorno, anno, raggio, gravità, lune, anelli, nubi, inclinazione, stella, distanza).
- Colori dei livelli: `#aab2c5`, `#7ee0a1`, `#6cb8ff`, `#c58bff`, `#ffc857`, mitico in sfumatura `#ff7ad9 → #ffd36e → #7af0ff`.
- La rivelazione è il momento del gioco: il livello compare 0,6 secondi dopo il pianeta, con un bagliore tanto più forte quanto più è alto. Solo CSS, spento con `prefers-reduced-motion`.
- `js/nomi.js`: una lista di circa 300 nomi mitologici e comuni di più culture (mai persone private) e `nomeACaso()`, che metà delle volte pesca dalla lista e metà compone due o tre sillabe dolci («Velora», «Kandri»). Così i nomi da provare non finiscono mai.

### 1.8 Collaudi (`tests/nome.test.js`)

Stesso nome, stessi parametri; normalizzazione; nessuna collisione dell'impronta su 200.000 nomi; pesi degli archetipi; le parti della superficie sommano a 100; ogni valore di `uniformi(p)` è finito e in scala. Su 200.000 nomi diversi da quelli dello script (`t0`, `t1`, …): la frequenza di ogni tratto sta entro `4 · sqrt(f(1 − f) / n) + 0,0001` da `FREQUENZE`, le quote dei livelli entro un punto, e la coda misurata concorda con `CODA` fino a 1 su 10.000. Civiltà se e solo se quattro criteri. `tests/oro.json`: dodici nomi mitologici con tipo, tratti, livello e tutti i valori di `pianeta()` arrotondati a sei decimali. Non le uniformi: come si disegna si può ancora rifinire, cosa esce da un nome no.

## Fase 2 — Zoom, città, strade

Si guarda sempre verso il centro del pianeta: da vicino è una vista dall'alto, come un mappamondo digitale. Niente orizzonte da gestire.

### 2.1 Il seme dentro l'hash

- `p.terreno.semi`: tre interi sotto 2²⁰ presi dall'impronta. Uniforme `ivec3 uSemeI`; in `manda()` una forma nuova per `gl.uniform3iv`.
- `h33(ivec3 p)` somma `uSemeI` prima di `pcg3`; `h11` somma `uSemeI.x`. Per le stelle del cielo una copia senza seme (`h33c`): il cielo non deve dipendere dal pianeta (serve alla fase 3).
- Sparisce `uSeme`. Dove serviva a separare due campi (`uSeme.yzx`, `.zxy`) basta una costante piccola diversa per campo (`+ vec3(17, 5, 29)`).
- Controllo sulla griglia dei sei: i continenti cambiano, lo stile no.

### 2.2 La camera

- Stato `cam.quota` = altezza sul suolo in raggi; distanza = 1 + quota. Minimo 0,006, massimo `2,2 · dist0 − 1`, partenza `dist0 − 1`. Rotella e pizzico moltiplicano la quota.
- **Il suolo segue il dito** a ogni altezza con una formula sola: radianti per pixel = `2 · TAN_FOV · quota / tela.clientHeight` (da lontano dà i 3,2 di oggi); il giro si divide per `max(cos(alzo), 0,2)`.
- **Aggancio al suolo**: peso `w = 1 − smoothstep(0,3, 2,0, quota)`. A ogni fotogramma `cam.aggancio += w · 2π / giorno · dt`, e i tre assi della camera ruotano di quell'angolo attorno a `p.asse` (formula di Rodrigues), nello stesso verso del pianeta. Prova: a quota 0,05, col tempo che scorre, un punto del suolo resta fermo sullo schermo. Da vicino si vede arrivare la sera.
- `uCentro` si moltiplica per `smoothstep(0,5, 3,0, quota)`.
- **Zoom dove sta il cursore**: `suoloSotto(x, y)` in JavaScript fa lo stesso conto raggio-sfera dello shader; dopo il cambio di quota la camera ruota quanto serve perché quel punto resti sotto il cursore. Lo stesso col centro del pizzico.
- Uniforme nuova `uQuota`. `imposta({ quota })`, e `zoom` resta per compatibilità. In `tools/griglia.html` le celle accettano `quota`.

### 2.3 Dettaglio a ogni quota

`px` = larghezza del pixel sul suolo: `pix · tP / max(dot(−rd, pw), 0,2)`.

- **La base non si tocca**: le prime 6 ottave (5 e 4 alle qualità basse) con la piega e le creste restano come oggi, e la normale di base si fa ancora con le differenze, `eps = max(px · 1,5, 0,0015)`. Così il pianeta visto dallo spazio resta quello già tarato.
- **Il dettaglio fine continua la stessa serie**, dall'ottava 6 alla 17, una sola valutazione per ottava con la derivata analitica. L'ottava `k` ha lunghezza d'onda `λ = 1 / (uFreq · 2,02^k)` ed entra col peso `smoothstep(2, 4, λ / px)`; al primo peso nullo il ciclo si ferma. Tetto di 12 ottave fini a qualità 2, 9 a qualità 1, 6 a qualità 0. Diciassette è il limite dei 32 bit: per questo la quota minima è 0,006.
- Nel ciclo si accumulano tre cose: l'altezza (`a · w · n.x`), la pendenza (`a · w · transpose(m) · n.yzw`, con `m` che parte dall'identità e a ogni ottava diventa `GIRA · m`) e il **frastaglio** (`a2 · w · n.x`, con `a2` che parte da 1 e cala di 0,72 per ottava). La pendenza rispetto a `q` è `uFreq` per quella accumulata, tolta la parte lungo `q`: la piega si trascura, da vicino non si nota.
- Normale: `normalize(q − uRilievo · (pendenzaBase + 0,7 · pendenzaFine))`. Il 0,7 si tara guardando.
- **Confini nitidi**: alla quota usata per i colori si somma `0,012 · frastaglio`, alla costa `0,003 · frastaglio`, all'albedo `· (1 + 0,10 · frastaglio)`. La `grana` di oggi resta per la vista da lontano.
- **Nuvole**: l'opacità si moltiplica per `smoothstep(0,025, 0,09, uQuota)`, ma le ombre sul suolo restano: scesi sotto le nuvole si vedono passare le loro ombre. Avvicinandosi, fino a 3 ottave in più.
- **Crepe** di ghiaccio e lava: due livelli più fini (frequenza per 4 e per 16, linee più sottili) che entrano con `px`.

Il rumore con la derivata (quintico, stessi gradienti di `rumore`):

```glsl
vec4 rumored(vec3 p) {            // x = valore, yzw = derivata
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
```

### 2.4 Il terreno in JavaScript (`js/terreno.js`)

`creaTerreno(p)` restituisce `quota(q)`: la stessa `quota` di base dello shader (piega, 6 ottave, creste), meno il livello del mare. Si traducono `pcg3`, `h33`, `rumore`, `rumore3`, `fbm` e `GIRA` con le stesse costanti. Gli interi con `Math.imul`, `>>> 0` e `>>> 16`; `floor` e poi il seme. Solo aritmetica e radice, quindi lo stesso risultato su ogni dispositivo.

Controllo obbligato, perché una traduzione sbagliata mette le città in mare: `tools/confronto.html` compila un piccolo programma con `RUMORE` e `SUPERFICIE` che disegna la quota su una mappa, la rilegge con `readPixels` e la confronta con `terreno.js`. Scarto massimo sotto 0,002, salvato in `docs/misure/confronto.json`. In più un collaudo: su 4.000 punti la parte sotto il mare concorda con `F` della scheda entro 3 punti.

### 2.5 La civiltà costruita (`js/civilta.js`)

`costruisci(p, terreno)` gira una volta quando si mostra un mondo con civiltà. I tiri usano `mischia` su interi (seme, faccia, cella): niente `Math.random`, niente trigonometria.

**Città.**

- Candidati: per ognuna delle 6 facce di un cubo una griglia 40×40, un punto spostato a caso per cella, portato sulla sfera con la radice. Sono 9.600.
- Abitabile se `0,004 < e < 0,26` e fuori dalla calotta (`abs(y) < poli − 0,03`).
- Punteggio: tiro casuale × `(1 − e / 0,26)` × 1,8 se entro 0,006 c'è mare (sei campioni attorno: città di costa).
- Quante: le migliori `N · terre / 0,30`, con N = 50, 180, 480, 1100 per i livelli da 1 a 4.
- Grandezza secondo la legge di Zipf, come le città vere: la città di rango `r` ha popolazione `r^−0,9` e raggio `Rcap · sqrt(pop)`, con Rcap = 0,0022, 0,0042, 0,0065, 0,0085 e minimo 0,00025. Una capitale, poche grandi, tantissimi paesi. Si scarta chi sta a meno di 1,2 volte la somma dei raggi da una città più grande.
- Ogni città ha un angolo (l'orientamento delle sue vie), un seme e un nome di sillabe.

**Strade.**

- a) Ogni città si collega alla più vicina tra quelle più grandi di lei: è l'ossatura, con le strade che convergono sui centri maggiori.
- b) Ogni città si collega alle due più vicine, se non distano più di 2,5 volte la più vicina: nascono gli anelli.
- c) Si toglie il tratto i-k se esiste j con `d(i,j) + d(j,k) < 1,15 · d(i,k)`: ci si passa già.
- Lunghezza massima 0,05, 0,12, 0,2, 0,3 per livello.
- Classi: 3 autostrada (tutti e due i capi nel 12 % più popoloso, solo dal livello 3), 2 statale (un capo nel 35 %), 1 locale. Larghezze 0,000009, 0,0000055, 0,0000035 raggi: un po' più larghe del vero, per vederle.
- Il mare: si campiona ogni 0,004. Se l'acqua è al massimo il 12 % del percorso e mai più di 0,012 di fila, la strada passa ed è un **ponte**; altrimenti niente strada.
- Le curve: una spezzata da 1 a 5 tratti. Ogni punto interno prova tre posti (dritto e ±10 % della lunghezza di lato) e sceglie il più basso, restando dritto se il vantaggio è sotto 0,03: le strade girano attorno ai monti.

**Indice per la scheda grafica.**

- Una griglia 64×64 per faccia di cubo. La faccia è l'asse più grande in valore assoluto, con la stessa regola di parità in JavaScript e in GLSL.
- Tabella `indice`, 384×64 in `RGBA32F`: per ogni cella inizio e numero degli elementi. Tabella `dati`, larga 512: due caselle per elemento. Città: `(centro, raggio)` e `(popolazione, angolo, seme, 0)`. Tratto di strada: `(a, larghezza)` e `(b, classe)`.
- Una città entra in tutte le celle toccate dal suo raggio per 4 (la zona dei campi); un tratto in tutte le celle che attraversa, con un margine. Al massimo 20 elementi per cella: se sono di più escono per prime le strade locali.
- Le texture a 32 bit lette con `texelFetch` e filtro `NEAREST` sono nel WebGL2 di base: nessuna estensione.

Obiettivo: sotto 120 ms sul Mac di sviluppo per un livello 4. Se è di più, in un Worker: il pianeta appare subito e la civiltà entra in dissolvenza (`uCivPronta`). Il pianeta-città usa la rete del livello 4 e mette costruito su tutte le terre abitabili.

Collaudi: stesso nome, stessa civiltà (impronta delle tabelle in `oro.json`); ogni città sulla terra e fuori dalle calotte; ogni strada dentro il limite d'acqua; ogni città si ritrova nella cella del suo centro.

### 2.6 Il disegno

In `roccioso`, dopo i colori del suolo e prima della luce, se `uCiv > 0`: si legge la cella di `q` e si scorrono i suoi elementi.

- **Distanza da un tratto**: `t = clamp(dot(q − a, b − a) / dot(b − a, b − a), 0, 1)`, punto `c = normalize(mix(a, b, t))`, distanza `length(q − c)`.
- **Città, di giorno.** Bordo irregolare: `Rb = R · (0,75 + 0,5 · rumore(q · 3 / R))`; costruito `1 − smoothstep(0,55 · Rb, Rb, d)`, più una striscia lungo le strade vicine, perché le case seguono le strade. Colore tra `(0,42, 0,41, 0,40)` e `(0,55, 0,53, 0,50)`, tinto al 15 % dal suolo. Mai sull'acqua né sul ghiaccio: le città di costa finiscono sulla riva da sole.
- **Le vie.** Coordinate locali sul piano tangente della città, ruotate del suo angolo, divise per l'isolato `B = 0,000024` (a quota minima sono 10 pixel). Via dove `fract` è vicino al bordo, viale ogni quattro isolati; ogni quartiere di 8 isolati ha una piccola rotazione sua, come le città cresciute a pezzi. Ogni isolato ha il suo tono (±25 %), il 7 % sono parchi, il centro (entro 0,3 R) è più scuro e più alto. Sotto 1,5 pixel per isolato il disegno sfuma nel colore medio.
- **Strade.** Copertura `clamp((largo / 2 − d) / px + 0,5, 0, 1) · min(1, largo / px)`: più sottile di un pixel, la strada sbiadisce in proporzione, e da lontano scompare come nella realtà. Grigio chiaro, le autostrade più chiare. Nel ramo del mare si disegnano solo le classi 2 e 3: i ponti.
- **Campi** (dal livello 2): attorno alle città, tra `1,5 · Rb` e `4 · Rb`, solo in pianura. Una scacchiera ruotata per quartiere, passo 0,00007, ogni campo col suo colore tra pianura e sabbia, qualcuno a terra nuda. Da media quota resta un alone a mosaico attorno alle città: è il segno più riconoscibile di una civiltà vista dall'alto.
- **Notte.** Luci del colore della casella 10: nelle città `costruito^1,5`, più fitte lungo le vie quando si distinguono; lungo le autostrade un filo di luci, a punti da vicino; campi bui. Quando una città è più piccola di 1,5 pixel diventa un punto la cui luce si conserva: energia `∝ R² / px²`, con un tetto. Così da lontano la notte è fatta di punti, e scendendo diventano reticoli.
- **Pianeta-città**: costruito ovunque sulle terre abitabili; orientamento e seme delle vie vengono da una griglia globale di passo 0,01.
- **Etichette** (`js/etichette.js`): i nomi delle città come su un mappamondo. A ogni fotogramma si proiettano le più popolose tra quelle visibili (soglia di popolazione che scende con la quota, al massimo 14); la capitale ha un segno. Sono `<span>` sopra la tela, non toccabili, visibili sotto quota 0,5.

Sostituisce `uCitta` e le righe «città» di oggi. Uniformi nuove: `uCiv` (0-5), `uCivPronta`, `uCivIndice`, `uCivDati`. Senza civiltà si lega una texture 1×1.

### 2.7 Se avanza: i fiumi

Linee sottili dove un rumore lento e piegato passa per lo zero, solo tra `0 < e < 0,3`, più larghe verso la costa (la tecnica delle crepe). Non scorrono davvero in discesa, ma dall'alto reggono; nel punteggio delle città, vicino a un fiume vale 1,5. Solo dopo che città e strade funzionano.

### 2.8 Misure e fine

`docs/misure/fotogrammi.json`: fotogrammi al secondo a quota 5,9, 0,3 e 0,01 su un mondo con civiltà, qualità 2 a risoluzione piena; almeno 30. Se non ci si arriva: tetto delle ottave fini a 9, poi scala di risoluzione. Finita quando dallo spazio alle vie si scende senza salti, il suolo sta fermo, e città, strade e campi si vedono di giorno e di notte.

## Fase 3 — Universo

- **Il posto** (`posto.*`): la galassia ha quattro bracci a spirale. Braccio da `scegli`, distanza dal centro `2 + 24 · u^0,7` migliaia di anni luce, angolo lungo la spirale logaritmica più uno scarto, altezza sul piano piccola. L'indirizzo si legge: «Braccio della Lira · 12.400 anni luce dal centro». Nomi di fantasia generici.
- **Il cielo coerente**: la fascia della via lattea è il piano della galassia visto da lì; verso il centro è più luminosa, tanto più quanto si è vicini. Viaggiando il cielo cambia davvero.
- **Il salto**, da 1,5 a 4 secondi secondo la distanza. Primo quarto: la camera si gira verso la direzione vera del mondo di arrivo, il campo visivo si allarga (`uTanFov` da 0,25 a 0,45), le stelle si allungano. A metà un lampo, e lì si cambia pianeta. Poi il mondo nuovo arriva da lontano (distanza da 40 al valore normale, in frenata) e la scheda si rivela all'85 %.
- **Le scie**: con `uSalto > 0`, in `cielo()` si sommano 6 campioni delle stelle lungo la direzione radiale rispetto alla rotta: `normalize(rd + (rd − rotta · dot(rd, rotta)) · s · uSalto · 0,6)`.
- **La collezione** sta nell'indirizzo: `#Attuale/Altro/Altro…`, al massimo 40, senza doppioni (si confronta la chiave normalizzata). Ogni mondo visitato è una stella con l'etichetta nella sua direzione vera, col colore del suo livello; nascosta se sta dietro il pianeta; toccandola si parte.
- **Il registro**: un pannello coi mondi trovati, in ordine di rarità, col più raro in cima. È il diario della caccia.
- Memoria sul dispositivo (`localStorage`) solo se Stefano dice sì: una copia della collezione, che non lascia mai il dispositivo.
- Facoltativa: la vista della galassia allontanandosi oltre il massimo.

## Fase 4 — Documenti

Come in `SPECIFICA.md`. I crediti, onesti: idea e direzione di Stefano Carta; progettazione di Claude Fable 5.2; codice di Claude Opus 5.5, tranne la prima versione dello shader, di Fable 5.2. Nella sezione dei limiti: le strade non seguono le pendenze vere, i fiumi non scorrono in discesa, il rilievo è luce e non forma, sotto 0,006 raggi non si scende.

## Rischi e ripieghi

- La normale analitica dà guai: differenze finite anche per il dettaglio fine, solo sotto quota 0,5, e si lascia lavorare la scala di risoluzione.
- La costruzione della civiltà è lenta sui telefoni: Worker, e livelli 3 e 4 con metà delle città sotto una certa potenza.
- Troppi elementi per cella nelle zone fitte: griglia a 96 per faccia prima di alzare il tetto di 20.
- Sfarfallio delle luci al bordo del pianeta: le luci si spengono con `dot(−rd, pw)` sotto 0,15.

## Cosa non fare

Niente guida e niente vista dal livello della strada. Niente dipendenze. Nessuna chiave esistente cambiata dopo `oro.json`. Nessun nome di persona privata negli esempi. Nessuna quota sotto 0,006 senza coordinate relative alla camera.
