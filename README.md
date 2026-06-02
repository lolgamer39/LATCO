# LATCO

LATCO (Learn and train chess openings) e una prima base di applicazione per studiare aperture a scacchi.

## Avvio

```powershell
node server.mjs
```

Poi apri:

```text
http://127.0.0.1:4173
```

In alternativa puoi aprire `Apri LATCO.bat` con doppio click: avvia il server locale e apre LATCO in una finestra dedicata.

## Struttura

- `index.html`: pagina dell'app.
- `styles.css`: interfaccia e scacchiera responsive.
- `app.js`: navigazione, archivio aperture, esercitazione guidata e logica scacchiera.
- `server.mjs`: server locale senza dipendenze npm.
- `Apri LATCO.bat`: launcher Windows dell'app.
- `stockfish 18/`: motore Stockfish locale usato dal server.

Le aperture iniziali sono nel vettore `OPENINGS` in `app.js`; potranno essere sostituite o ampliate con il repertorio che fornirai.

La validazione delle mosse usa `chess.js` da CDN, per evitare di riscrivere a mano le regole degli scacchi. La scacchiera supporta click, trascinamento dei pezzi, animazione fluida delle mosse, frecce con tasto destro e una sezione Analisi collegata a Stockfish 18. Un clic sinistro sulla scacchiera cancella le frecce; un clic destro singolo dopo averle disegnate le rimuove. Le frecce della tastiera navigano tra le mosse: sinistra indietro, destra avanti.

## Motore

Il server espone:

- `GET /api/engine/status`: stato del motore.
- `POST /api/engine/analyze`: analisi UCI da FEN con MultiPV.
- `POST /api/engine/analyze-stream`: analisi progressiva in NDJSON con aggiornamenti a ogni profondita, anche in modalita illimitata.
- `POST /api/engine/move`: mossa del bot Stockfish con livello Elo selezionato.

La sezione Analisi mostra valutazione dinamica, migliori linee, freccia blu sulla miglior mossa suggerita e controllo del limite di profondita del motore.
La sezione Gioca include livelli bot da 200 a 3000 Elo, raggruppati per fascia.
