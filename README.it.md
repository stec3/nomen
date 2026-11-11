# Nomen

*Nomen omen*: scrivi un nome e ottieni il suo pianeta. [Read in English](README.md).

Ogni nome diventa un mondo 3D tutto suo, calcolato nel browser: oceani, montagne, nuvole, anelli e lune, e su alcuni mondi una civiltà con città, strade e campi in cui si scende dallo spazio fino alle vie, di giorno e di notte. Lo stesso nome dà sempre lo stesso pianeta. Scrivendo un altro nome si salta lì attraverso la galassia, partendo nella direzione in cui quel mondo si trova davvero nel cielo.

Niente librerie, niente immagini, niente server: uno shader WebGL2 e moduli JavaScript semplici. Il nome sta dopo il `#` nell'indirizzo, una parte che il browser non manda a nessuno.

## Come si avvia

```bash
python3 tools/serve.py
```

Poi si apre `http://127.0.0.1:4350/`. I collaudi si lanciano con `node --test`.

## Come funziona

- **Il nome è il seme.** Viene normalizzato e trasformato in un hash, e ogni particolare del pianeta legge dall'hash la sua chiave. I particolari nuovi hanno chiavi nuove, così i pianeti che esistono già non cambiano mai: lo controlla `tests/oro.json`.
- **Un solo shader disegna tutto** (`js/glsl.js`): il raggio incontra la sfera, il rumore procedurale fa terreno, clima, nuvole e aria, e il dettaglio cresce mentre la camera scende.
- **Le civiltà si costruiscono in JavaScript** (`js/civilta.js`) sullo stesso terreno e passano allo shader come due tabelle, da cui si disegnano città, strade e ponti. Da vicino una città ha isolati, lotti, giardini e ombre; di notte lampioni e finestre accese.
- **La galassia** (`js/universo.js`): ogni nome ha un posto in uno dei quattro bracci a spirale. Il cielo stellato e il salto tra i mondi vengono da lì.
- Risoluzione e qualità si adattano per restare fluide.

## Limiti

- Serve WebGL2.
- I pianeti sono generati, non simulati: clima, città e strade sono verosimili, non fisici.
- Da vicino le città seguono regole, non dati veri: isolati, lotti e luci, non i singoli edifici.
- Non si salva niente: il link è l'unica memoria di un mondo.

## Crediti

- Idea e direzione: Stefano Carta.
- Progettazione: Claude Fable 5.2 (Anthropic).
- Codice: Claude Opus 5.5 (Anthropic), tranne la prima versione dello shader, scritta da Claude Fable 5.2.

Licenza MIT.
