# Nomen — specifica

Questo file basta da solo per lavorare al progetto: cos'è, com'è fatto, cosa manca e in che ordine farlo. Chi riprende il lavoro parte da qui; come si costruiscono le fasi, con le scelte, i numeri e le formule, lo dice [`PROGETTO.md`](PROGETTO.md), e dove i due non concordano vale quello. Ultimo aggiornamento: 10/11/2026.

## Cos'è

Scrivi un nome e nasce il suo pianeta, in 3D, calcolato da quel nome: lo stesso nome dà sempre lo stesso mondo, su ogni dispositivo. Il nome viene da *nomen omen*, «il destino nel nome».

La direzione, decisa da Stefano il 10/11/2026:

1. **Un universo solo, navigabile.** I mondi non stanno in una galleria né in una griglia: ogni nome ha il suo posto nella galassia e da un mondo all'altro si viaggia.
2. **Ogni mondo ha i suoi particolari, e alcuni sono rari.** Lune, anelli, percentuali di acqua, terre, ghiacci, gas, vita: tutto casuale, cioè deciso dal nome, con cose comuni, rare e rarissime. È una caccia: si provano nomi per trovare proprio quel particolare.
3. **Dettaglio e zoom come su un mappamondo digitale.** Ci si avvicina dal pianeta intero fino a vedere le città, le strade che le collegano e i campi, sui mondi dove è nata una civiltà. Le strade ci sono ma non si guida: si guardano dall'alto, come su una mappa (decisione di Stefano del 10/11). Questi dettagli sono importanti.
4. **Atterraggio** col tramonto visto dal suolo: resta nel progetto, ma viene dopo.

Idea e direzione sono di Stefano Carta; il codice lo scrive Claude. I README lo dicono con onestà: quali modelli hanno scritto il codice, e i limiti.

## Regole che non si rompono

- **Zero dipendenze.** Solo HTML, CSS, JavaScript e GLSL scritti qui: niente librerie, immagini, font o script esterni.
- **Un nome, un pianeta, per sempre.** Lo decide `js/nome.js`. Dopo il primo commit con `tests/oro.json`, cambiare un parametro esistente è una scelta da prendere con Stefano. Per aggiungere si usa una chiave nuova (`d.tra('chiave.nuova', …)`): non sposta le altre.
- **Niente dati.** Il nome sta nel frammento dell'indirizzo (`#Nome`), che il browser non manda a nessun server. Niente statistiche, niente cookie, nessuna richiesta di rete dopo il caricamento.
- **Niente di personale nel repo.** È pubblico: esempi con nomi comuni o mitologici, mai persone private.
- **Quello che la scheda dice è vero.** Ogni numero mostrato viene dagli stessi parametri che disegnano il pianeta, e le probabilità dichiarate sono verificate dai collaudi.
- **Pubblicare** (push, GitHub Pages) solo quando Stefano lo dice. I commit locali vanno bene.
- **Commenti** in italiano, uno breve per ogni blocco che non si capisce da solo.

## Com'è fatto adesso

File statici, WebGL2 puro. Il pianeta non ha triangoli: un solo fragment shader lancia un raggio per pixel e calcola cosa incontra.

- `index.html`, `css/stile.css` — tela a tutto schermo, marchio, scheda in basso (nome, riga descrittiva, rarità, casella), bottone «Copia il link».
- `js/nome.js` — modulo puro, usato dalla pagina e da Node. `ripulisci`, `normalizza` (spazi, maiuscole, accenti: «Stefano», « stefano » e «STÉFANO» sono lo stesso nome), `impronta` (64 bit), `pianeta(nome)`, `descrivi(p, lingua)`, costanti `SOLE` e `CAMERA`. Sei archetipi coi pesi 26/16/16/13/9/20: terrestre, oceanico, desertico, ghiacciato, lavico, gassoso. Tavolozze curate in `TAVOLOZZE` (12 caselle, l'ordine è nel commento). Anelli, da zero a tre lune, colore della stella, cicloni. Dalla fase 1: i quattro criteri per la vita (acqua, clima, aria, terre), la vita da 0 a 1, la civiltà (livelli 1-5, capitale, abitanti) solo con quattro criteri su quattro; dieci tratti (`ELENCO_TRATTI`), i primati (`colosso`, `rigoglio`…) e i titoli («Mondo incoronato», «Notte accesa»…); le sei tavolozze `CROMATICHE`, una su 256; punteggio, livello e «1 su N» dalle tabelle misurate di `js/rarita.js`. Senza vita le caselle 3 e 4 si mescolano verso sabbia e roccia: i mondi spogli non sono verdi.
- `js/glsl.js` — `VERTICI` e `SPAZIO`, fatto dei pezzi INTESTAZIONE, `RUMORE`, `ARIA`, ANELLI, `SUPERFICIE`, CIELO, PRINCIPALE. Dentro: raggio-sfera col bordo senza scalette; rumore a gradiente con hash interi (uguale su ogni scheda grafica); terreno con piega del dominio e creste; mare col riflesso; calotte, crepe, lava, luci di città; nuvole con zone di maltempo, ombre e cicloni a spirale; giganti gassosi a fasce con venti, filamenti e tempeste; aria con diffusione Rayleigh e Mie integrata lungo il raggio; anelli con le formule dello strato sottile e i solchi; ombre anelli-pianeta nei due versi; lune con eclissi; stelle, via lattea, la stella col suo alone; curva ACES; grana contro le bande. Il seme intero `uSemeI` entra nell'hash attraverso la globale `gSeme`, che vale zero mentre si disegna il cielo. Uniformi della fase 1: `uSole2`, `uSole2Col` e `uStella2Col` (la seconda stella: direzione, luce che dà, come si vede), `uNebForza` (la via lattea, molto più forte col cielo di nebulosa), `uMariLuce`, `uEsagono`. La civiltà ha `uCiv` (il livello, 0-5), `uCivPronta` (la dissolvenza) e le due tabelle `uCivIndice` e `uCivDati`; le luci di sotto (città, mari, lava) passano attenuate dalle nuvole.
- Camera e dettaglio (fase 2a, commit `81f6171`) — `cam.quota` è l'altezza sul suolo in raggi, da 0,006 a `2,2 · dist0 − 1`. Rotella e pizzico moltiplicano la quota e lo zoom va verso il cursore (`suoloSotto`, con tre giri di correzione); trascinando, i radianti per pixel sono `2 · TAN_FOV · quota / altezza`, così il suolo segue il dito; sotto quota 2 la camera gira insieme al pianeta (`cam.aggancio`). Nello shader `dettaglio()` continua la serie del terreno dall'ottava n fino alla 17 con `rumored` (valore e derivata), con un tetto di 12, 9 o 6 ottave fini secondo la qualità; la normale è la base con le differenze più 0,7 volte la pendenza fine. Correzione al progetto: la matrice delle derivate fini parte da GIRA elevata alla n, non dall'identità, altrimenti le pendenze fini verrebbero circa 68 volte troppo deboli. Le nuvole si aprono sotto quota 0,09 lasciando le ombre; le crepe di ghiaccio e lava hanno due livelli più fini.
- `js/terreno.js` (2.4) — `creaTerreno(p)` restituisce `quota(x, y, z)`: la quota di base dello shader (piega, 6 ottave, creste) meno il mare, con soli interi e aritmetica. `tools/confronto.html` la confronta con lo shader su 16 nomi: scarto massimo 3,4 · 10⁻⁵, soglia 0,002 (`docs/misure/confronto.json`). Un pianeta da solo si scosta dalla parte di mare della scheda anche di 7 punti, perché ha pochi continenti grandi: il collaudo dei 4.000 punti confronta la media di 40 pianeti.
- `js/civilta.js` (2.5) — `costruisci(p)` segue `PROGETTO.md`, con due ritocchi tarati guardando: il punteggio di una città ha in più `min(1, e / 0,02)`, perché sulla riva metà città finiva in mare, e il bonus di costa guarda il mare entro 0,012 invece di 0,006. `r^−0,9` si fa col metodo di Newton, senza `pow`. Le tabelle sono in RGBA32F: indice 384 × 64, dati larghi 512; in ogni cella vengono prima le città, dalla più grande, poi le strade, dalla più importante. Si costruisce in `prepara()` del motore, nel buio della dissolvenza, e poi entra in dissolvenza con `uCivPronta`: livello 3 in 64-93 ms nel browser, pianeta-città in 108 ms a motore caldo e 233 la prima volta. Il Worker per ora non serve. `improntaTabelle(civ)` dà l'impronta che `tests/oro.json` fissa per i nomi con civiltà.
- Disegno (2.6) — `civTerra` in `roccioso` disegna città dal bordo irregolare, vie a isolati con i quartieri girati a pezzi, il centro più scuro, case lungo le strade vicino alle città, campi a mosaico dal livello 2 (il campo, il gruppo di 8 × 8 campi, il colore medio), strade che sbiadiscono quando sono più sottili di un pixel, e di notte vie accese, isolati fiochi, un filo di luci sulle autostrade; le città lontane diventano punti, e le grandi hanno un alone. Costruito e campi appiattiscono il rilievo. `civMare` disegna i ponti. Il pianeta-città costruisce su tutte le terre abitabili, a quartieri di 0,01.
- `js/etichette.js` — fino a 14 nomi di città sopra la tela, sotto quota 0,5, la capitale col ◆; il motore offre `proietta`, `civilta()` e `ogniFotogramma`.
- Misure (2.8, `docs/misure/fotogrammi.json`) — la civiltà costa circa un fotogramma al secondo; a piena risoluzione (quasi 3 milioni di pixel) da vicino si fanno 21-26 fotogrammi, con la scala automatica a 0,75 se ne fanno 34.
- `js/motore.js` — `uniformi(p)` (pura, da collaudare) e `creaMotore(tela)`, che dà `mostra(p)`, `imposta({subito, fermo, tempo, qualita, scala, giro, alzo, zoom})`, `stato()`, `misura(n)` (tempo vero per fotogramma, con `readPixels`), `disegna()`. Trascinamento con inerzia, pizzico, rotella; risoluzione e qualità che si adattano (mai provate sotto sforzo).
- `js/main.js` — lingua italiana o inglese dal browser, nome nel frammento, pianeta predefinito «Nomen», `window.nomen = { motore, pianeta, mostra }` per i collaudi. La scheda: nome, riga, pillola del livello con «1 su N» e titolo, al massimo due pastiglie più «+n»; «Particolari» apre un foglio che scorre (criteri, civiltà, barra della superficie, righe), e a foglio aperto le pastiglie in alto si nascondono. Il dado pesca un nome da `js/nomi.js`.
- `js/rarita.js` — le tabelle `FREQUENZE` e `CODA` del «1 su N». Le scrive `tools/rarita.js`: a mano non si tocca.
- `js/nomi.js` — i nomi del dado, comuni o mitologici.
- `tools/serve.py` — server di sviluppo su 127.0.0.1:4350. `POST /salva/<nome>.png` scrive in `docs/img/`, `POST /salva/<nome>.json` in `docs/misure/` (solo stessa origine, nomi `[a-z0-9_-]`).
- `tools/griglia.html` — **banco di prova, non fa parte del sito**: disegna più pianeti fermi in un foglio solo (`griglia([...], {...})` dalla console, `salva('nome')` per il PNG). Ogni cella accetta `giro`, `alzo`, `zoom`, `tempo`, `qualita` e `ritocca(p)` per provare una variante senza toccare il codice.
- `tools/elenco.js` — `node tools/elenco.js Gaia Marte` stampa che pianeta esce da ogni nome; senza argomenti usa una lista di nomi mitologici.
- `tools/rarita.js` — misura 3 milioni di nomi (`r0`, `r1`…) in circa 23 secondi e riscrive `js/rarita.js` e `docs/misure/rarita.json`. `tools/oro.js` riscrive `tests/oro.json`. Ogni ritocco a `js/nome.js` vuole i tre comandi in fila: `node tools/rarita.js`, `node tools/oro.js`, `node --test`. I ritocchi al solo shader non toccano i collaudi.
- `tests/nome.test.js` — dodici collaudi (vedi «Fase 1»); `tests/oro.json` fissa i valori di `pianeta()` per dodici nomi mitologici, non le uniformi. Con Node 25 si lancia `node --test`: `node --test tests/` non funziona più.
- `docs/misure/rarita.json` — le misure dell'ultima corsa di `tools/rarita.js`.
- Mancano i README. Git su `main`, solo locale: nessun push.

### Numeri misurati e scelte già tarate

- Il rumore a gradiente ha deviazione 0,1905. Il terreno è portato a deviazione 0,33 con `3.4646 * sqrt(1 - guadagno²)`: un livello del mare `s` copre circa Φ(s / 0,33) della superficie (Φ = gaussiana cumulata).
- Nuvole: `d = 0.72 * sistemi + 0.68 * trama`, deviazione 0,34 (calcolata, non ancora misurata). Soglia `quantile(1 - copertura) * 0.34 - 0.09`: 0,09 è metà della rampa di 0,18 dello `smoothstep`.
- Calotte: `abs(q.y) > uPoli`, quindi coprono circa `1 - poli` della sfera.
- Stelle: luminosità `s0 * u^(-2/3)`, la legge del cielo vero (tantissime deboli, pochissime forti), con `s0` 0,02 e 0,007 nei due strati; raggio di un pixel. Prima erano macchie larghe otto pixel: il raggio non deve avere un minimo in radianti.
- Luce della stella a parità di luminosità: `1 + K * (c / luminanza - 1)`, con K = 0,3 per la luce (`uSoleCol`: sotto una stella rossa le nuvole restano quasi bianche) e K = 0,8 per la stella vista nel cielo (`uStellaCol`).
- Camera: `TAN_FOV` 0,25; il pianeta sta più in alto del centro (`uCentro`) per lasciare posto alla scheda. La stella è fissa in `SOLE`, a circa 40° dalla camera iniziale: pianeta quasi pieno, col terminatore a destra.
- Prima del rifacimento del 10/11: circa 105 fotogrammi al secondo a 1328×1926 su MacBook Pro M4 (media letta dal motore). Dopo non è stato rimisurato.

### Cosa resta da rifinire nel pianeta visto dallo spazio

Visto sugli screenshot del 10/11: Gaia (terrestre) e Nettuno (oceanico, coi cicloni) sono belli; Ermes (ghiaccio) e Zeus (lava) vanno bene; «Nomen» è molto migliorato ma non è ancora da bocca aperta.

- Gigante gassoso (Giove): pallido, poco contrasto tra le fasce, tempeste che non si notano.
- Desertico (Marte): con la tavolozza grigia sembra una luna, non un deserto. Guardare le altre tavolozze (Atlante, Pandora).
- Nuvole: sotto la stella rossa restano un po' color pesca (provare K 0,22) e la superficie è troppo «a bozzi» (provare `rilievo` 1,2 → 0,9).
- Stelle: a risoluzione piena forse ora sono troppo deboli (provare `s0` 0,03).
- Guardati il 10/11 sera: lato notturno, luci di città, mari che brillano, esagono (si vede dall'alto, trascinando in verticale), le sei tavolozze cromatiche (la più tenue è il deserto bianco), il foglio «Particolari» su telefono. Restano da guardare: aurora, la stella che spunta dal bordo (`giro` tra 2,4 e 3,6), anelli sui giganti (Luna, Ulisse).
- Due soli: la seconda stella sta a 10-25° dalla prima e dalla vista iniziale quasi non si nota, anche con la luce rinforzata (0,45, tinta quasi piena). Messa dietro il pianeta non entra nell'inquadratura. Idea da provare: metterla dove la camera la vede in cielo, accanto al pianeta. Cambia `dueSoli.direzione`: dopo il primo commit si fa solo con una chiave nuova.
- Mai provati: scrivere un nome e premere Invio, il pizzico, lo schermo largo, le qualità 0 e 1, l'adattamento sotto sforzo.

## Piano di lavoro

Le fasi sono in ordine. Ognuna finisce con: nessun errore in console, `node --test` verde, un commit locale. Dopo la fase 1 si rilancia `node tools/elenco.js`, perché i nomi di prova cambiano.

### Fase 1 — Particolari e rarità (fatta il 10/11)

Va fatta **prima** di fissare `tests/oro.json`: dopo, cambiare le probabilità sposterebbe i pianeti.

1. **I particolari, in `js/nome.js`**, restituiti dentro `pianeta()` (per esempio `p.scheda`). Tutti veri, cioè calcolati dai parametri che disegnano:
   - superficie dei mondi rocciosi: acqua = Φ(mare / 0,33) × poli, terre = il resto × poli, ghiacci = 1 − poli (somma 100); il ghiacciato è tutto ghiaccio, il desertico non ha acqua, per il lavico al posto dell'acqua c'è la lava;
   - giganti gassosi: idrogeno, elio e un gas in tracce legato alla tavolozza (è lui a dare il colore);
   - nubi (la `copertura`), inclinazione dell'asse, durata del giorno, lune, anelli, stella;
   - numeri di contorno coerenti tra loro: raggio in km, gravità, temperatura media (dipende da tipo e stella), durata dell'anno;
   - **vita** (chiave nuova `vita`, da 0 a 1), con una distribuzione per tipo: alta su terrestri e oceanici, bassa sui desertici, quasi nulla sui ghiacciati, zero su lava e gas salvo i casi rarissimi. La vita si deve vedere: più vita, più verde sulle terre.
   - **civiltà** (chiave nuova): solo dove c'è abbastanza vita. Proposta: 45 % dei terrestri, 25 % degli oceanici, 6 % dei desertici, cioè circa un nome su sei. Ha un livello (da pochi villaggi a metropoli) che decide quante città si vedono. Sostituisce la rarità `citta` di oggi.
2. **I tratti rari**, ognuno con la sua probabilità dichiarata e con qualcosa che si vede davvero. Proposta di partenza, da tarare:

   | Tratto | Circa 1 su | Cosa si vede |
   |---|---|---|
   | Aurore ai poli | 8 | c'è già |
   | Luci di città | 6 | città di giorno e luci di notte (fase 2) |
   | Asse sdraiato | 17 | c'è già (`asse.estremo`) |
   | Due soli | 35 | una seconda stella nel cielo |
   | Mari che brillano di notte | 120 | bagliore azzurro sul lato notturno, solo con mare e vita |
   | Esagono polare | 120 | sui giganti gassosi, al polo |
   | Mondo cromatico | 256 | una tavolozza speciale per tipo, come gli esemplari rari dei videogiochi |
   | Pianeta-città | 1000 | tutte le terre costruite, la notte è una rete di luci |

   Più i **titoli**, cioè combinazioni che hanno un nome: per esempio «mondo-giardino» (vita oltre il 95 %) o «gemello della Terra» (terrestre, acqua tra 65 e 75 %, molta vita, una luna, stella gialla). Nomi generici, mai marchi o opere altrui.
3. **Il livello di rarità.** N = prodotto di 1/p dei tratti rari presenti (quelli con p ≤ 0,15, compresi gli estremi delle misure, come il 5 % più alto della vita). Sei livelli: comune, non comune, raro, epico, leggendario, mitico. Le soglie di N si tarano misurando: uno script con Node su 200.000 nomi casuali, e si spostano finché le quote sono circa 55 / 27 / 12 / 4,5 / 1,3 / 0,2 %. La tabella misurata va in `docs/misure/rarita.json`.
4. **La scheda nella pagina**: livello col suo colore, «1 su N», i tratti rari ognuno col suo «1 su n», e i particolari in una forma compatta che si apre con un tocco. Niente tabelle fitte: poche righe, leggibili dal telefono. In italiano e in inglese.
5. **Un nome a caso**: un bottone che pesca un nome da una lista interna di nomi comuni e mitologici. È la leva del gioco.
6. **Collaudi** (`tests/nome.test.js`): stesso nome stessi parametri; normalizzazione; su 100.000 nomi la frequenza di ogni tratto sta entro la tolleranza attorno alla probabilità dichiarata, gli archetipi rispettano i pesi, le percentuali della scheda sommano a 100 e nessun valore di `uniformi(p)` è fuori scala o non finito; nessuna collisione dell'impronta.

Finita quando: la scheda mostra livello, «1 su N» e particolari per ogni nome, i collaudi passano, la tabella misurata è salvata.

### Fase 2 — Zoom fino alle città e alle strade

L'obiettivo: avvicinarsi senza salti dal pianeta intero fino a qualche millesimo di raggio dal suolo, col dettaglio che resta nitido a ogni passo, e vedere le città.

Le trappole, in ordine di importanza:

1. **Precisione dei numeri.** Lo shader lavora a 32 bit. Oggi il seme del pianeta è uno spostamento fino a ±90 sommato alle coordinate (`uSeme`): con numeri così grandi restano precise solo 9 ottave circa, e da vicino il rumore diventa a blocchi. Rimedio: il seme va sommato **dentro l'hash, come intero** (`uniform ivec3`, aggiunto alle coordinate del reticolo in `h33`), e le coordinate restano piccole. Così ogni pianeta ha il suo rumore e 15 ottave restano precise. In `motore.js` `manda()` oggi non sa spedire vettori di interi: va aggiunto.
2. **Ottave secondo la distanza.** `fbm` deve ricevere un numero di ottave frazionario calcolato dalla larghezza del pixel sul suolo (`px`, già passato a `roccioso`): si scende finché la lunghezza d'onda supera due pixel, e l'ultima ottava entra in dissolvenza per non scattare. Minimo 4, massimo 15.
3. **Il passo del rilievo.** In `roccioso` c'è `eps = max(px * 1.5, 0.002)`: quel minimo va tolto, altrimenti da vicino il rilievo è sfocato.
4. **Confini che restano nitidi.** Oggi i passaggi tra sabbia, pianura, bosco, roccia e neve sono rampe larghe in quota: da vicino diventano sfumature infinite. Alla quota usata per i colori va sommato un rumore fine a tutte le scale (guadagno alto, circa 0,7), e alla costa un po' di rumore ruvido, così i bordi restano frastagliati a ogni zoom.
5. **Il suolo non deve scappare.** Il pianeta gira su sé stesso in 70-150 secondi: da vicino il suolo sfreccerebbe via. Avvicinandosi la camera deve agganciarsi al suolo: la sua direzione ruota attorno a `p.asse` insieme al pianeta, con un peso che va da 0 (lontano) a 1 (vicino). Il bello: da vicino si vede arrivare la sera e accendersi le città.
6. **La camera.** Lo zoom oggi moltiplica la distanza (`cam.zoom` tra 0,42 e 2,2). Deve lavorare sull'altezza dal suolo, in modo esponenziale, fino a circa 0,012 raggi. Il trascinamento deve muovere il suolo quanto si muove il dito (velocità proporzionale all'altezza). `uCentro` torna a zero da vicino. Meglio se lo zoom punta dove sta il cursore o il pizzico.
7. **Le nuvole** da vicino sono nebbia: sotto una certa altezza si dissolvono, come quando le si attraversa.

Le **città** e le **strade** sono fatte (10/11, commit `17af0db`): come si costruiscono e si disegnano lo dicono `PROGETTO.md` (2.4-2.6) e «Com'è fatto adesso». Da giudicare a occhio: la forza del rilievo fine da vicino, le vie a quota minima e la notte vista dallo spazio, che ora è fatta di punti, con l'alone delle città grandi, invece che di macchie.

Finita quando: si zooma senza salti dallo spazio alle città su un mondo con civiltà, il dettaglio resta nitido, il suolo sta fermo, le città si vedono di giorno e di notte, e i fotogrammi al secondo a tre altezze sono in `docs/misure/fotogrammi.json` (almeno 30 al secondo a qualità piena sul Mac di sviluppo).

### Fase 3 — Universo navigabile

1. **Un posto per ogni nome**: coordinate nella galassia da chiavi nuove (`posto.*`), più un indirizzo da leggere (il braccio, la distanza dal centro).
2. **Il viaggio**: scrivendo un nome la camera lascia l'orbita, si gira verso la direzione vera del mondo di arrivo, le stelle si allungano in scie, e a metà del salto, quando lo schermo è fatto solo di scie, si cambiano i parametri del pianeta. Poi l'arrivo in orbita e la scheda che si rivela. Durata tra 1,5 e 4 secondi.
3. **I mondi visitati sono la collezione.** Stanno nel frammento dell'indirizzo, uno dopo l'altro separati da `/` (il primo è quello dove si è), così il link porta con sé la collezione. Nel cielo di ogni mondo compaiono come stelle con l'etichetta, ognuna nella sua direzione vera: toccandone una si parte.
4. **La vista della galassia** (facoltativa): allontanandosi oltre il massimo si vede la galassia coi mondi della collezione.

Finita quando: da un mondo si vola a un altro scrivendo il nome o toccando la sua stella, e il link ricostruisce la collezione.

### Fase 4 — Documenti e primo giro completo

Misure dei fotogrammi su sei pianeti, `README.md` in inglese e `README.it.md` (con l'immagine dei pianeti fatta da `tools/griglia.html`, nomi comuni o mitologici, e la sezione sui limiti), questa specifica aggiornata.

### Dopo

- **Atterraggio**: tocco su un punto, discesa tra le nuvole, vista dal suolo con un secondo shader che riusa `RUMORE`, `ARIA` e `SUPERFICIE`, tramonto col colore della stella, anelli e lune nel cielo.
- **Cartolina** in PNG del proprio mondo.
- **Pubblicazione** su GitHub e GitHub Pages: solo col sì di Stefano, dopo aver controllato che nel repo non ci sia niente di personale.
- **Più avanti, forse**: una galassia comune dove ogni nome lascia il suo mondo visibile a tutti (vuole un server e la raccolta dei nomi, quindi soldi e dati).

## Come si lavora

- Anteprima: `python3 tools/serve.py` e poi `http://127.0.0.1:4350/`. Il server manda `Cache-Control: no-store`; dopo una modifica si ricarica la pagina.
- Per giudicare un cambiamento allo shader si usa `tools/griglia.html` con sei nomi, uno per archetipo: uno screenshot solo per giro. Per una variante, `ritocca(p)` nella cella. Sempre controllare che la console non abbia errori.
- GLSL ES 3.00 è severo: niente conversioni implicite tra interi e decimali.
- Le tre qualità (`uQual` 0, 1, 2) devono continuare a funzionare.
- Per salvare un'immagine: `disegna()` e subito, nello stesso blocco, la copia della tela, perché il buffer non viene conservato.

## Decisioni prese

- Il nome è Nomen. Licenza MIT. Sito in italiano e inglese, scelti dal browser.
- Zero dipendenze, nessun server, nessuna raccolta di nomi.
- Niente griglia o galleria nel sito: i mondi stanno in un universo solo.
- Le strade ci sono, viste dall'alto: non si guida e non si scende al livello della strada.

## Decisioni aperte

- L'ordine delle fasi (proposto in `PROGETTO.md`: 1, 2a, 2b, 3, 4; l'atterraggio dopo).
- L'indirizzo email dei commit: quello personale o il «noreply» di GitHub. Finché non c'è un push si può ancora cambiare senza conseguenze.
- La collezione si ricorda anche sul dispositivo (`localStorage`, che non esce dal dispositivo) oltre che nel link?
