# CLAUDE.md

Progetto di Stefano Carta. Il contesto a lungo termine (stato, decisioni, prossimi passi) vive nel vault Obsidian «Claude Brain»:

`20 Progetti/Personali/Nomen/Nomen.md` *(percorso relativo al vault; quello assoluto è definito nel `CLAUDE.md` globale della macchina e non va scritto nei repo pubblici)*

A inizio sessione leggi quella nota; a fine sessione aggiornala. Se il vault non è leggibile, tutto quello che serve per lavorare è in [`SPECIFICA.md`](SPECIFICA.md). Come si costruiscono le fasi, con numeri e formule, lo dice [`PROGETTO.md`](PROGETTO.md).

## Se il vault non è accessibile

Su VS Code (e su ogni app senza «Accesso completo al disco») macOS blocca iCloud Drive: l'errore è `Operation not permitted`. In quel caso non cercare percorsi alternativi: scrivi il riepilogo della sessione **in coda** a `.claude/session-log.md` qui nel repo e avvisa Stefano. Una sessione dell'app desktop lo porterà nel vault. Quel file è in `.gitignore` e non finisce su GitHub.

## Regole del progetto

- **Zero dipendenze.** Niente librerie, niente immagini, niente font o script esterni: solo HTML, CSS, JavaScript e GLSL scritti qui. È la promessa del progetto.
- **Un nome, un pianeta, per sempre.** `js/nome.js` decide il pianeta di ogni nome. I collaudi tengono fermi i valori di alcuni nomi (`tests/oro.json`): se un cambiamento li sposta, è una scelta da prendere con Stefano, non un effetto collaterale. Per aggiungere un parametro si usa una chiave nuova, che non tocca gli altri.
- **Niente dati.** Il nome resta nel frammento dell'indirizzo (`#Nome`) e non parte verso nessun server. Niente statistiche, niente cookie, nessuna richiesta di rete dopo il caricamento.
- **Niente di personale nel repo.** È pubblico: nomi di esempio comuni o mitologici, mai persone private.
- **Prima di un commit:** `node --test` deve passare e la pagina deve aprirsi senza errori in console.
- **Pubblicare** (push, GitHub Pages) solo quando Stefano lo dice.
- **Commenti:** uno breve per ogni blocco che non si capisce da solo, in italiano.

## Comandi

```bash
python3 tools/serve.py     # anteprima su http://127.0.0.1:4350/
node --test         # collaudi
```
