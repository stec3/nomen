#!/usr/bin/env python3
"""Server di sviluppo di Nomen.

Serve i file statici del progetto e, in più, salva dentro `docs/` gli
screenshot e le misure che le pagine di collaudo gli mandano. Serve solo
sul computer di chi sviluppa: ascolta su 127.0.0.1 e il sito pubblicato
non lo usa (è fatto di soli file statici).

Uso: python3 tools/serve.py [porta]      (porta predefinita: 4350)
"""

import json
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
CARTELLE = {"png": RADICE / "docs" / "img", "json": RADICE / "docs" / "misure"}
PESO_MASSIMO = 16 * 1024 * 1024
NOME_VALIDO = re.compile(r"^[a-z0-9][a-z0-9_-]{0,60}\.(png|json)$")
FIRMA_PNG = b"\x89PNG\r\n\x1a\n"


class Gestore(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(RADICE), **kwargs)

    def end_headers(self):
        # In sviluppo il browser non deve mai tenersi una copia vecchia dei file.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        # I file nascosti (.git, .claude…) non si servono.
        if any(pezzo.startswith(".") for pezzo in self.path.split("?")[0].split("/") if pezzo):
            self.send_error(404)
            return None
        return super().send_head()

    def do_POST(self):
        """POST /salva/<nome>.png oppure /salva/<nome>.json."""
        trovato = re.match(r"^/salva/([^/?#]+)$", self.path)
        peso = int(self.headers.get("Content-Length") or 0)
        origine = self.headers.get("Origin")
        porta = self.server.server_address[1]
        origini_buone = {f"http://127.0.0.1:{porta}", f"http://localhost:{porta}"}

        # Si accetta solo dalla pagina servita da qui, con un nome semplice e un peso sensato.
        if origine not in origini_buone:
            return self.send_error(403)
        if not trovato or not NOME_VALIDO.match(trovato.group(1)) or not 0 < peso <= PESO_MASSIMO:
            return self.send_error(400)

        nome = trovato.group(1)
        dati = self.rfile.read(peso)
        if nome.endswith(".png"):
            if not dati.startswith(FIRMA_PNG):
                return self.send_error(400)
        else:
            try:
                json.loads(dati)
            except ValueError:
                return self.send_error(400)

        cartella = CARTELLE[nome.rsplit(".", 1)[1]]
        cartella.mkdir(parents=True, exist_ok=True)
        (cartella / nome).write_bytes(dati)
        self.send_response(204)
        self.end_headers()

    def log_message(self, formato, *args):
        # Una riga corta per richiesta, senza l'indirizzo (è sempre 127.0.0.1).
        sys.stderr.write("%s\n" % (formato % args))


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 4350
    server = ThreadingHTTPServer(("127.0.0.1", porta), Gestore)
    print(f"Nomen in sviluppo: http://127.0.0.1:{porta}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
