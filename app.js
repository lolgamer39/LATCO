import {
  BRILLIANT_CONFIG,
  classifyBrilliantMove,
  detectMaterialSacrifice,
  isEndgamePosition,
} from "./brilliant-classifier.mjs";

const CHESS_JS_URL =
  "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/dist/esm/chess.js";
const ENGINE_DEFAULT_DEPTH_LIMIT = 18;
const ENGINE_MAX_DEPTH_LIMIT = 99;
const ENGINE_MULTIPV = 3;
const ENGINE_MAX_MULTIPV = 5;
const ENGINE_DOM_UPDATE_MS = 80;
const MOVE_ANIMATION_MS = 240;
const BOT_MIN_THINK_MS = 900;
const SAVED_GAMES_KEY = "latco.savedGames.v1";
const MAX_SAVED_GAMES = 80;
const OPENING_BOOK_FILES = [
  "chess-openings/a.tsv",
  "chess-openings/b.tsv",
  "chess-openings/c.tsv",
  "chess-openings/d.tsv",
  "chess-openings/e.tsv",
];
const ANALYSIS_REVIEW_ID = "analysis-review-session";
const REVIEW_DEFAULT_PROFILE = "medium";
const REVIEW_DEFAULT_PLAYER_ELO = 1500;
const REVIEW_CLASSIFICATION_VERSION = 5;
const REVIEW_PROFILES = [
  {
    id: "rapid",
    label: "Rapida",
    shortLabel: "5s",
    depth: 8,
    multipv: 2,
    description: "Revisione veloce, pensata per un controllo rapido.",
  },
  {
    id: "medium",
    label: "Media",
    shortLabel: "10s",
    depth: 12,
    multipv: 3,
    description: "Equilibrio tra velocita e qualita del giudizio.",
  },
  {
    id: "long",
    label: "Lunga",
    shortLabel: "profonda",
    depth: 18,
    multipv: 4,
    description: "Analisi piu profonda per giudizi piu affidabili.",
  },
];

const REVIEW_CATEGORIES = [
  { id: "geniale", label: "Geniale", symbol: "symbol/geniale.svg", weight: 100 },
  { id: "grande", label: "Grande", symbol: "symbol/grande.svg", weight: 100 },
  { id: "da_libro", label: "Da libro", symbol: "symbol/da_libro.svg", weight: 100 },
  { id: "forzata", label: "Forzata", symbol: "symbol/forzata.svg", weight: 100 },
  { id: "migliore", label: "Migliore", symbol: "symbol/migliore.svg", weight: 99 },
  { id: "ottima", label: "Ottima", symbol: "symbol/ottima.svg", weight: 94 },
  { id: "buona", label: "Buona", symbol: "symbol/buona.svg", weight: 84 },
  { id: "imprecisione", label: "Imprecisione", symbol: "symbol/imprecisione.svg", weight: 63 },
  { id: "errore", label: "Errore", symbol: "symbol/errore.svg", weight: 35 },
  { id: "mossa_mancata", label: "Mossa mancata", symbol: "symbol/mossa_mancata.svg", weight: 22 },
  { id: "errore_grave", label: "Errore grave", symbol: "symbol/errore_grave.svg", weight: 8 },
];

const REVIEW_CATEGORY_BY_ID = Object.fromEntries(REVIEW_CATEGORIES.map((item) => [item.id, item]));
const REVIEW_TABLE_ORDER = [
  "geniale",
  "grande",
  "da_libro",
  "forzata",
  "migliore",
  "ottima",
  "buona",
  "imprecisione",
  "errore",
  "mossa_mancata",
  "errore_grave",
];

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

const BOT_LEVEL_GROUPS = [
  { name: "Principiante", range: "200-500", levels: [200, 300, 400, 500] },
  { name: "Base", range: "600-1000", levels: [600, 700, 800, 900, 1000] },
  { name: "Intermedio", range: "1100-1500", levels: [1100, 1200, 1300, 1400, 1500] },
  { name: "Avanzato", range: "1600-2000", levels: [1600, 1700, 1800, 1900, 2000] },
  { name: "Esperto", range: "2100-2500", levels: [2100, 2200, 2300, 2400, 2500] },
  { name: "Maestro", range: "2600-3000", levels: [2600, 2700, 2800, 2900, 3000] },
];

const TIME_CONTROL_GROUPS = [
  {
    name: "Bullet",
    controls: [
      { id: "1+0", label: "1 min" },
      { id: "1+1", label: "1 | 1" },
      { id: "2+1", label: "2 | 1" },
    ],
  },
  {
    name: "Blitz",
    controls: [
      { id: "3+2", label: "3 | 2" },
      { id: "5+0", label: "5 min" },
      { id: "5+5", label: "5 | 5" },
    ],
  },
  {
    name: "Rapid",
    controls: [
      { id: "10+0", label: "10 min" },
      { id: "15+10", label: "15 | 10" },
      { id: "30+0", label: "30 min" },
    ],
  },
];

const PIECE_NAMES = {
  k: "re",
  q: "donna",
  r: "torre",
  b: "alfiere",
  n: "cavallo",
  p: "pedone",
};

const PIECE_ASSET_NAMES = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

const OPENINGS = [
  {
    id: "italiana",
    name: "Partita Italiana",
    eco: "C50",
    family: "Aperte",
    focus: "Sviluppo rapido e pressione su f7.",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"],
  },
  {
    id: "spagnola",
    name: "Partita Spagnola",
    eco: "C60",
    family: "Aperte",
    focus: "Controllo del centro e pressione sul cavallo in c6.",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"],
  },
  {
    id: "siciliana",
    name: "Difesa Siciliana",
    eco: "B20",
    family: "Semiaperte",
    focus: "Squilibrio immediato e gioco attivo contro 1.e4.",
    moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"],
  },
  {
    id: "francese",
    name: "Difesa Francese",
    eco: "C00",
    family: "Semiaperte",
    focus: "Catena pedonale solida e lotta per d4/e5.",
    moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6"],
  },
  {
    id: "caro-kann",
    name: "Difesa Caro-Kann",
    eco: "B10",
    family: "Semiaperte",
    focus: "Struttura robusta e sviluppo pulito dell'alfiere chiaro.",
    moves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4"],
  },
  {
    id: "gambetto-donna",
    name: "Gambetto di Donna",
    eco: "D06",
    family: "Chiuse",
    focus: "Pressione su d5 e sviluppo armonico dei pezzi.",
    moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6"],
  },
  {
    id: "indiana-re",
    name: "Difesa Indiana di Re",
    eco: "E60",
    family: "Indiane",
    focus: "Fianchetto, centro flessibile e contrattacco sul re.",
    moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4"],
  },
  {
    id: "nimzoindiana",
    name: "Difesa Nimzoindiana",
    eco: "E20",
    family: "Indiane",
    focus: "Controllo delle case scure e pressione sul cavallo c3.",
    moves: ["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"],
  },
  {
    id: "slava",
    name: "Difesa Slava",
    eco: "D10",
    family: "Chiuse",
    focus: "Centro stabile e alfiere c8 libero.",
    moves: ["d2d4", "d7d5", "c2c4", "c7c6", "g1f3", "g8f6"],
  },
  {
    id: "inglese",
    name: "Apertura Inglese",
    eco: "A10",
    family: "Fianco",
    focus: "Controllo di d5 e sviluppo elastico.",
    moves: ["c2c4", "e7e5", "b1c3", "g8f6", "g2g3", "d7d5"],
  },
  {
    id: "londra",
    name: "Sistema Londra",
    eco: "D02",
    family: "Sistema",
    focus: "Schema stabile con alfiere in f4 e pedoni su d4/e3.",
    moves: ["d2d4", "d7d5", "g1f3", "g8f6", "c1f4", "e7e6", "e2e3"],
  },
  {
    id: "scandinava",
    name: "Difesa Scandinava",
    eco: "B01",
    family: "Semiaperte",
    focus: "Sfida immediata al pedone e4.",
    moves: ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3", "d5a5"],
  },
];

const OPENING_STUDIES = {
  italiana: {
    id: "italiana",
    title: "Partita Italiana",
    eco: "C50-C59",
    family: "Aperte",
    introMoves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
    introText:
      "La posizione base nasce da 1.e4 e5 2.Nf3 Nc6 3.Bc4: il Bianco sviluppa rapidamente e punta f7.",
    goals: [
      "Sviluppa i pezzi prima di cercare tatticismi.",
      "Controlla d4: spesso e il cuore della lotta.",
      "Guarda sempre f7/f2: e il punto piu sensibile nelle aperte.",
      "Scegli tra gioco calmo con d3 e centro diretto con c3-d4.",
    ],
    variants: [
      {
        id: "giuoco-piano",
        name: "Giuoco Piano classico",
        eco: "C50-C53",
        reply: "3...Bc5",
        focus: "Sviluppo naturale, pressione sul centro e scelta tra d3 calmo o c3-d4.",
        moves: ["f8c5", "c2c3", "g8f6", "d2d4", "e5d4", "c3d4", "c5b4", "b1c3"],
        plansWhite: [
          "Prepara d4 con c3 e guadagna spazio centrale.",
          "Arrocca presto se il centro si apre.",
          "Dopo ...Bb4, sviluppa Nc3 e valuta e5 o Qb3 secondo la pressione su f7.",
        ],
        plansBlack: [
          "Sviluppa ...Nf6 e attacca e4.",
          "Quando il Bianco gioca d4, decidi se cambiare e tenere pressione sul centro.",
          "Il tema ...Bb4 inchioda e rallenta lo sviluppo bianco.",
        ],
        guidance: [
          { move: "f8c5", idea: "Il Nero sviluppa l'alfiere sulla diagonale attiva e guarda f2." },
          { move: "c2c3", idea: "Il Bianco prepara d4 senza esporre subito il centro." },
          { move: "g8f6", idea: "Il Nero attacca e4 e aumenta la pressione centrale." },
          { move: "d2d4", idea: "Il Bianco apre il centro quando ha abbastanza pezzi pronti." },
          { move: "e5d4", idea: "Il Nero accetta la sfida e prova a creare attivita." },
          { move: "c3d4", idea: "Il Bianco ricostruisce il centro e libera la casa c3." },
        ],
      },
      {
        id: "pianissimo",
        name: "Giuoco Pianissimo",
        eco: "C50-C54",
        reply: "3...Bc5 4.d3",
        focus: "Sviluppo lento, re al sicuro e miglioramento graduale dei pezzi.",
        moves: ["f8c5", "d2d3", "g8f6", "b1c3", "d7d6", "c1e3", "c8e6", "e1g1"],
        plansWhite: [
          "Gioca d3, Nc3, Be3 e arrocco: prima stabilita, poi espansione.",
          "Valuta h3 e Re1 per preparare d4 al momento giusto.",
          "Evita di aprire il centro se il re non e ancora al sicuro.",
        ],
        plansBlack: [
          "Rispondi simmetricamente con ...Nf6 e ...d6.",
          "Cambia su e3 solo se ottieni tempi o indebolimenti.",
          "Prepara ...a6/...h6 oppure ...Be6 secondo la posizione.",
        ],
        guidance: [
          { move: "f8c5", idea: "Il Nero sceglie lo sviluppo classico." },
          { move: "d2d3", idea: "Il Bianco protegge e4 e sceglie una struttura solida." },
          { move: "g8f6", idea: "Il Nero sviluppa senza rompere subito il centro." },
          { move: "b1c3", idea: "Il Bianco aumenta il controllo su d5/e4." },
          { move: "d7d6", idea: "Il Nero stabilizza e5 e prepara lo sviluppo armonico." },
        ],
      },
      {
        id: "evans",
        name: "Gambetto Evans",
        eco: "C51-C52",
        reply: "3...Bc5 4.b4",
        focus: "Sacrificio di pedone per tempi di sviluppo e centro forte.",
        moves: ["f8c5", "b2b4", "c5b4", "c2c3", "b4a5", "d2d4", "e5d4", "e1g1"],
        plansWhite: [
          "Offri b4 per guadagnare tempi sull'alfiere nero.",
          "Costruisci c3-d4 e porta rapidamente i pezzi verso il re nero.",
          "Non cercare subito di recuperare il pedone: il compenso e lo sviluppo.",
        ],
        plansBlack: [
          "Se accetti, devi restituire tempi con attenzione.",
          "L'alfiere spesso torna in a5 o b6.",
          "Il Nero deve sviluppare e arroccare senza restare schiacciato dal centro bianco.",
        ],
        guidance: [
          { move: "f8c5", idea: "La diagonale classica permette il gambetto." },
          { move: "b2b4", idea: "Il Bianco sacrifica un pedone per cacciare l'alfiere e accelerare c3-d4." },
          { move: "c5b4", idea: "Il Nero accetta: ora deve dimostrare di reggere il centro." },
          { move: "c2c3", idea: "Il Bianco guadagna un tempo e prepara d4." },
          { move: "b4a5", idea: "L'alfiere si salva, ma il Bianco ha ottenuto iniziativa." },
        ],
      },
      {
        id: "due-cavalli",
        name: "Difesa dei Due Cavalli",
        eco: "C55-C59",
        reply: "3...Nf6",
        focus: "Il Nero contrattacca e4 invece di copiare con ...Bc5.",
        transposition: {
          name: "Difesa dei Due Cavalli",
          openingId: null,
          note: "Questa linea diventa una famiglia teorica propria: quando la inseriremo tra le aperture, potrai studiarla in una sezione dedicata.",
        },
        moves: ["g8f6", "d2d4", "e5d4", "e1g1", "f8c5", "e4e5", "d7d5", "e5f6"],
        plansWhite: [
          "Il Bianco puo scegliere linee taglienti con d4 o Ng5.",
          "Arrocca rapidamente se il centro si apre.",
          "Quando il Nero spinge ...d5, calcola bene catture e scacchi.",
        ],
        plansBlack: [
          "Il Nero non difende soltanto: attacca e4 con ...Nf6.",
          "...d5 e il colpo liberatorio tipico.",
          "Non restare passivo: se il Bianco attacca f7, contrattacca il centro.",
        ],
        guidance: [
          { move: "g8f6", idea: "Il Nero entra in una linea autonoma: contrattacca e4." },
          { move: "d2d4", idea: "Il Bianco apre il centro per sfruttare lo sviluppo." },
          { move: "e5d4", idea: "Il Nero accetta la tensione e costringe il Bianco a coordinarsi." },
          { move: "e1g1", idea: "Il Bianco mette il re al sicuro prima di proseguire l'attacco." },
        ],
      },
      {
        id: "ungherese",
        name: "Difesa Ungherese",
        eco: "C50",
        reply: "3...Be7",
        focus: "Il Nero sceglie prudenza e limita tattiche immediate su f7.",
        transposition: {
          name: "Difesa Ungherese",
          openingId: null,
          note: "E una sottofamiglia piu difensiva della Partita Italiana: la tratteremo come modulo specifico quando amplieremo il repertorio.",
        },
        moves: ["f8e7", "d2d4", "e5d4", "c2c3", "g8f6", "e4e5", "f6e4", "c3d4"],
        plansWhite: [
          "Occupa il centro con d4 e c3.",
          "L'alfiere nero in e7 e solido ma meno attivo: usa spazio e sviluppo.",
          "Evita sacrifici automatici su f7: qui il Nero e piu compatto.",
        ],
        plansBlack: [
          "Sviluppo sicuro: ...Be7, ...Nf6 e arrocco.",
          "Cerca cambi centrali per ridurre l'iniziativa bianca.",
          "Non concedere d4 senza reagire.",
        ],
        guidance: [
          { move: "f8e7", idea: "Il Nero evita linee tattiche immediate e prepara l'arrocco." },
          { move: "d2d4", idea: "Il Bianco usa il vantaggio di spazio." },
          { move: "e5d4", idea: "Il Nero riduce il centro." },
          { move: "c2c3", idea: "Il Bianco riapre la lotta centrale e sviluppa con tempi." },
        ],
      },
    ],
  },
};

const state = {
  view: "home",
  search: "",
  family: "Tutte",
  orientation: "w",
  selected: null,
  targets: [],
  lastMove: null,
  pendingAnimation: null,
  redoMoves: [],
  arrows: [],
  arrowDraft: null,
  dragFrom: null,
  dragOver: null,
  savedGames: loadSavedGamesFromStorage(),
  currentGameId: null,
  review: {
    activeGameId: null,
    record: null,
    mainline: [],
    cursor: 0,
    mode: "mainline",
    variationStart: null,
    variationMoves: [],
    variationMoveReviews: [],
    isAnalyzing: false,
    progress: 0,
    profile: REVIEW_DEFAULT_PROFILE,
  },
  feedback: {
    tone: "",
    text: "Seleziona un pezzo, oppure trascinalo sulla casa di destinazione.",
  },
  analysisSettings: {
    analysisEnabled: true,
    moveComments: true,
    evalBar: true,
    suggestionArrows: true,
    engineSuggestions: true,
    showLegalMoves: true,
  },
  analysisSettingsOpen: false,
  analysisMoveReviews: [],
  analysisMoveReviewPendingPly: null,
  analysisMoveReviewPendingUci: null,
  analysisLine: {
    mainline: [],
    variations: [],
    activeVariationId: null,
  },
  openingBook: {
    status: "idle",
    positions: new Map(),
    lastInfo: null,
    rows: 0,
    namedPositions: 0,
    errors: 0,
    message: "Libro aperture non caricato.",
  },
  trainerSide: "w",
  progress: 0,
  openingId: null,
  openingStudy: {
    selectedVariantId: null,
    mode: "choose",
    introPlaying: false,
    introProgress: 0,
  },
  play: {
    started: false,
    botElo: 800,
    sideChoice: "w",
    humanSide: "w",
    botSide: "b",
    timeControl: "none",
    botThinking: false,
    hintThinking: false,
    expandedGroup: null,
    optionsOpen: false,
    settingsOpen: false,
    analysisSettings: {
      analysisEnabled: false,
      moveComments: true,
      evalBar: true,
      suggestionArrows: true,
      engineSuggestions: true,
      showLegalMoves: true,
    },
    clock: null,
    result: null,
    premoves: [],
  },
  engine: {
    available: false,
    status: "loading",
    name: "Stockfish 18",
    message: "Controllo motore...",
    depth: 0,
    depthLimit: ENGINE_DEFAULT_DEPTH_LIMIT,
    depthMode: "infinite",
    lines: [],
    score: null,
    bestmove: null,
    fen: null,
    multiPv: ENGINE_MULTIPV,
  },
};

let ChessEngine = null;
let game = null;
let dragState = null;
let arrowState = null;
let suppressNextClick = false;
let suppressNextContextMenu = false;
let engineRequestId = 0;
let engineTimer = null;
let engineAbortController = null;
let engineDomUpdateTimer = null;
let analysisMoveReviewRequestId = 0;
let botMoveRequestId = 0;
let clockTickerHandle = null;
let openingStudyTimer = null;
let openingStudyRunId = 0;

const app = document.querySelector("#app");

document.addEventListener("contextmenu", handleGlobalContextMenu);
document.addEventListener("pointerdown", handleGlobalPointerDown, true);
document.addEventListener("keydown", handleKeyboardNavigation);

try {
  const chessModule = await import(CHESS_JS_URL);
  ChessEngine = chessModule.Chess;
  game = new ChessEngine();
  render();
  loadOpeningBook();
  checkEngineStatus();
} catch (error) {
  app.className = "boot-screen";
  app.innerHTML = `
    <div class="boot-card">
      <p class="eyebrow">LATCO</p>
      <h1>Scacchiera non caricata</h1>
      <p>Non riesco a caricare chess.js. Controlla la connessione e riavvia il server locale.</p>
      <p class="muted">${escapeHtml(error.message)}</p>
    </div>
  `;
}

function render() {
  if (dragState && Date.now() - dragState.createdAt >= 10000) {
    cleanupPieceDrag();
    clearSelection();
  }

  const preservedScroll = capturePreservedScroll();
  app.className = "";
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="stage">
        ${renderView()}
      </main>
      ${renderGameResultOverlay()}
    </div>
  `;
  bindEvents();
  restorePreservedScroll(preservedScroll);
  playPendingMoveAnimation();
  syncClockTicker();
}

function capturePreservedScroll() {
  return [...app.querySelectorAll("[data-preserve-scroll]")].map((element) => ({
    key: element.dataset.preserveScroll,
    top: element.scrollTop,
    atBottom: element.scrollTop + element.clientHeight >= element.scrollHeight - 6,
  }));
}

function restorePreservedScroll(items) {
  for (const item of items) {
    const element = app.querySelector(`[data-preserve-scroll="${item.key}"]`);
    if (!element) {
      continue;
    }

    element.scrollTop = item.atBottom ? element.scrollHeight : item.top;
  }
}

function renderTopbar() {
  return `
    <header class="topbar">
      <button class="brand-button" type="button" data-view="home" aria-label="Torna alla home LATCO">
        <img class="brand-title-image" src="assets/title.svg" alt="LATCO" onerror="this.onerror=null;this.src='title.png';">
      </button>
      <nav class="topnav" aria-label="Navigazione principale">
        <button class="nav-button ${state.view === "home" ? "is-active" : ""}" type="button" data-view="home">Home</button>
        <button class="nav-button ${["openings", "trainer"].includes(state.view) ? "is-active" : ""}" type="button" data-view="openings">Aperture</button>
        <button class="nav-button ${state.view === "analysis" ? "is-active" : ""}" type="button" data-view="analysis">Analisi</button>
        <button class="nav-button ${state.view === "archive" ? "is-active" : ""}" type="button" data-view="archive">Archivio</button>
      </nav>
    </header>
  `;
}

function renderView() {
  if (state.view === "openings") {
    return renderOpeningsView();
  }

  if (state.view === "trainer") {
    return renderTrainerView();
  }

  if (state.view === "play") {
    return renderPlayView();
  }

  if (state.view === "analysis") {
    return renderAnalysisView();
  }

  if (state.view === "archive") {
    return renderArchiveView();
  }

  return renderHomeView();
}

function renderHomeView() {
  return `
    <section class="home-stack" aria-labelledby="home-title">
      <div class="home-layout">
        <div class="home-board-band">
          ${renderBoard()}
        </div>
        <div class="home-actions">
          <h1 id="home-title" class="sr-only">LATCO</h1>
          <div class="action-grid" aria-label="Azioni principali">
            <button class="primary-button" type="button" data-view="play">Gioca</button>
            <button class="primary-button secondary" type="button" data-view="openings">Aperture</button>
            <button class="primary-button tertiary" type="button" data-view="analysis">Analisi</button>
            <button class="primary-button quaternary" type="button" data-view="archive">Archivio</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderArchiveView() {
  return `
    <section class="archive-layout" aria-labelledby="archive-title">
      <div class="view-heading">
        <div>
          <p class="eyebrow">Archivio</p>
          <h1 id="archive-title">Partite</h1>
          <p>Rivedi le partite salvate e apri la revisione con Stockfish.</p>
        </div>
        <button class="ghost-button" type="button" data-view="home">Home</button>
      </div>
      ${renderSavedGamesSection()}
    </section>
  `;
}

function renderSavedGamesSection() {
  const games = [...state.savedGames].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  return `
    <section class="home-games-section" aria-labelledby="saved-games-title">
      <div class="home-games-heading">
        <div>
          <p class="eyebrow">Archivio</p>
          <h2 id="saved-games-title">Partite</h2>
        </div>
        <span>${games.length ? `${games.length} salvate` : "Nessuna partita"}</span>
      </div>
      ${
        games.length
          ? `<div class="saved-games-list">${games.slice(0, 12).map(renderSavedGameRow).join("")}</div>`
          : `<div class="empty-state compact">Le partite giocate contro il bot appariranno qui.</div>`
      }
    </section>
  `;
}

function renderSavedGameRow(record) {
  return `
    <article class="saved-game-row">
      <div class="saved-game-time">
        <strong>${escapeHtml(getTimeControlLabel(record.timeControl))}</strong>
        <span>${escapeHtml(record.humanSide === "b" ? "Nero" : "Bianco")}</span>
      </div>
      <div class="saved-game-bot">
        <span class="turn-dot ${record.botSide === "b" ? "black" : ""}" aria-hidden="true"></span>
        <strong>Bot ${escapeHtml(record.botElo)} Elo</strong>
      </div>
      <div class="saved-game-result ${getSavedGameResultTone(record)}">${escapeHtml(formatSavedGameResult(record))}</div>
      <button class="saved-game-review" type="button" data-review-game="${escapeHtml(record.id)}">Analisi</button>
      <div class="saved-game-moves">${escapeHtml(getSavedGameMoveCount(record))}</div>
      <div class="saved-game-date">${escapeHtml(formatSavedGameDate(record.createdAt))}</div>
    </article>
  `;
}

function renderOpeningsView() {
  const families = getFamilies();
  const openings = getFilteredOpenings();

  return `
    <section aria-labelledby="openings-title">
      <div class="view-heading">
        <div>
          <p class="eyebrow">Archivio aperture</p>
          <h1 id="openings-title">Aperture</h1>
          <p>Scegli una linea e passa alla sezione di esercitazione.</p>
        </div>
        <button class="ghost-button" type="button" data-view="home">Home</button>
      </div>
      <div class="openings-layout">
        <aside class="tool-panel" aria-label="Filtri aperture">
          <div class="field">
            <label for="opening-search">Cerca</label>
            <input id="opening-search" type="search" value="${escapeHtml(state.search)}" placeholder="Nome, ECO o famiglia" data-action="search-openings">
          </div>
          <div class="panel-section">
            <span class="panel-title">Famiglia</span>
            <div class="chip-list">
              ${families
                .map(
                  (family) => `
                    <button class="segmented-button ${state.family === family ? "is-active" : ""}" type="button" data-family="${escapeHtml(family)}">${escapeHtml(family)}</button>
                  `,
                )
                .join("")}
            </div>
          </div>
          <div class="empty-state">
            La Partita Italiana ha gia uno studio guidato con varianti, piani e ripasso. Le altre aperture verranno arricchite con lo stesso modello.
          </div>
        </aside>
        <div>
          ${
            openings.length
              ? `<div class="opening-grid">${openings.map(renderOpeningCard).join("")}</div>`
              : `<div class="empty-state">Nessuna apertura trovata con questi filtri.</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderOpeningCard(opening) {
  const line = describeLine(opening);
  return `
    <button class="opening-card" type="button" data-opening="${escapeHtml(opening.id)}">
      <div class="card-meta">
        <span>${escapeHtml(opening.family)}</span>
        <span class="eco">${escapeHtml(opening.eco)}</span>
      </div>
      <h2>${escapeHtml(opening.name)}</h2>
      <p>${escapeHtml(opening.focus)}</p>
      <p class="muted">${escapeHtml(line)}</p>
    </button>
  `;
}

function renderTrainerView() {
  const opening = getCurrentOpening();
  if (!opening) {
    state.view = "openings";
    return renderOpeningsView();
  }

  const study = getOpeningStudy(opening.id);
  if (study) {
    return renderOpeningStudyView(opening, study);
  }

  const moves = getMoveDescriptors(opening);
  const currentMove = moves[state.progress];
  const percent = Math.round((state.progress / opening.moves.length) * 100);
  const finished = state.progress >= opening.moves.length;

  return `
    <section class="training-layout" aria-labelledby="trainer-title">
      <div class="board-area">
        <div class="board-header">
          ${renderTurnIndicator()}
          ${renderBoardToolbar("training")}
        </div>
        ${renderBoard()}
        ${renderFeedback()}
      </div>
      <aside class="training-panel">
        <div>
          <p class="eyebrow">${escapeHtml(opening.family)} - ${escapeHtml(opening.eco)}</p>
          <h2 id="trainer-title">${escapeHtml(opening.name)}</h2>
          <p class="muted">${escapeHtml(opening.focus)}</p>
        </div>
          <span class="panel-title">Allenati come</span>
          <div class="segmented" role="group" aria-label="Lato di esercitazione">
            <button class="segmented-button ${state.trainerSide === "w" ? "is-active" : ""}" type="button" data-side="w">Bianco</button>
            <button class="segmented-button ${state.trainerSide === "b" ? "is-active" : ""}" type="button" data-side="b">Nero</button>
            <button class="segmented-button ${state.trainerSide === "both" ? "is-active" : ""}" type="button" data-side="both">Entrambi</button>
          </div>
        </div>
        <div class="panel-section">
          <span class="panel-title">Progresso</span>
          <div class="progress-bar" aria-label="Progresso esercitazione">
            <span style="width: ${percent}%"></span>
          </div>
          <p class="muted">${
            finished
              ? "Linea completata. Puoi resettare o scegliere un'altra apertura."
              : `Prossima mossa: ${escapeHtml(formatMovePrompt(currentMove))}`
          }</p>
        </div>
        <div class="panel-section">
          <span class="panel-title">Linea</span>
          <div class="line-moves">
            ${moves.map((move, index) => renderMoveChip(move, index)).join("")}
          </div>
        </div>
      </aside>
    </section>
  `;
}

function renderMoveChip(move, index) {
  return `
    <span class="move-chip ${index < state.progress ? "is-done" : ""} ${index === state.progress ? "is-current" : ""}">
      <span class="move-number">${move.moveNumber}${move.color === "b" ? "..." : "."}</span>
      ${escapeHtml(move.san)}
    </span>
  `;
}

function renderPlayView() {
  if (!state.play.started) {
    return renderPlaySetupView();
  }

  return renderPlayGameView();
}

function renderPlaySetupView() {
  const activeGroup = getBotGroupForElo(state.play.botElo);

  return `
    <section class="play-setup-layout" aria-labelledby="play-title">
      <div class="play-setup-board">
        <div class="setup-player-strip setup-player-strip-top">
          <span class="turn-dot black" aria-hidden="true"></span>
          <strong>Bot ${state.play.botElo}</strong>
          <span>${escapeHtml(activeGroup?.name || "Livello")}</span>
        </div>
        ${renderBoard()}
        <div class="setup-player-strip">
          <span class="turn-dot" aria-hidden="true"></span>
          <strong>Tu</strong>
          <span>${escapeHtml(formatOptionsSummary())}</span>
        </div>
      </div>
      <aside class="play-setup-panel" aria-label="Impostazioni partita">
        <div class="play-setup-header">
          <p class="eyebrow">Gioca</p>
          <h2 id="play-title">Scegli il bot</h2>
          <p class="muted">${escapeHtml(getPlayStatusText())}</p>
        </div>
        <div class="play-setup-scroll">
          ${renderBotLevelGroups()}
          ${renderOptionsBlock()}
        </div>
        <button class="start-game-button" type="button" data-action="start-bot-game">Gioca</button>
      </aside>
    </section>
  `;
}

function renderPlayGameView() {
  const finished = Boolean(state.play.result) || isGameFinished();
  const topSide = state.play.humanSide === "w" ? "b" : "w";
  const bottomSide = state.play.humanSide;

  return `
    <section class="play-game-layout" aria-labelledby="play-game-title">
      <div class="board-area play-board-area">
        ${renderPlaySideBar(topSide, "top")}
        ${renderBoard()}
        ${renderPlaySideBar(bottomSide, "bottom")}
      </div>
      <aside class="play-game-panel">
        <div>
          <p class="eyebrow">Partita</p>
          <h2 id="play-game-title">Bot ${state.play.botElo} Elo</h2>
          <p class="muted">${escapeHtml(formatPlayGameSummary())}</p>
        </div>
        ${state.play.settingsOpen ? renderPlaySettingsBanner() : ""}
        ${renderPlayAnalysisPanel()}
        <div class="panel-section">
          <span class="panel-title">Formulario</span>
          ${renderPlayMoveSheet()}
        </div>
        <div class="play-command-grid">
          <button class="small-button danger-button" type="button" data-action="resign-game" ${finished ? "disabled" : ""}>Abbandona</button>
          <button class="small-button restart-button" type="button" data-action="restart-game">Ricomincia</button>
          <button class="small-button settings-button ${state.play.settingsOpen ? "is-active" : ""}" type="button" data-action="play-settings">Impostazioni</button>
          <button class="small-button hint-button" type="button" data-action="request-hint" ${state.play.hintThinking || state.play.botThinking || finished ? "disabled" : ""}>Suggerimento</button>
        </div>
      </aside>
    </section>
  `;
}

function renderPlaySettingsBanner() {
  return `
    <section class="analysis-settings-banner play-settings-banner" aria-label="Impostazioni partita">
      <div class="analysis-settings-banner-top">
        <span class="panel-title">Impostazioni gioco</span>
        ${renderPlayAnalysisEnabledToggle()}
      </div>
      ${renderAnalysisSettingsControls("play")}
    </section>
  `;
}

function renderPlayAnalysisEnabledToggle() {
  const enabled = state.play.analysisSettings.analysisEnabled;
  return `
    <button
      class="analysis-toggle-button ${enabled ? "is-active" : ""}"
      type="button"
      data-action="toggle-play-analysis-enabled"
      aria-pressed="${enabled ? "true" : "false"}"
    >
      <span>Analisi in partita</span>
      <strong>${enabled ? "Attiva" : "Disattiva"}</strong>
    </button>
  `;
}

function renderPlayAnalysisPanel() {
  const settings = state.play.analysisSettings;
  if (!settings.analysisEnabled) {
    return "";
  }

  const scoreText = state.engine.score?.display || "+0.00";

  return `
    <section class="play-analysis-panel">
      ${settings.moveComments ? renderCurrentMoveSummary() : ""}
      ${settings.evalBar ? `<div class="analysis-score">
        <div>
          <span>Valutazione</span>
          <small data-engine-depth-label>${escapeHtml(formatEngineDepthLabel())}</small>
        </div>
        <strong data-engine-score>${escapeHtml(scoreText)}</strong>
      </div>` : ""}
      ${settings.engineSuggestions ? `<div class="panel-section">
        <span class="panel-title">Suggerimenti motore</span>
        <div data-engine-candidates>${renderEngineCandidates()}</div>
      </div>` : ""}
    </section>
  `;
}

function renderPlaySideBar(side, position) {
  const clock = state.play.clock;
  const isHuman = side === state.play.humanSide;
  const name = isHuman ? "Tu" : `Bot ${state.play.botElo}`;
  const colorLabel = side === "w" ? "Bianco" : "Nero";
  const clockMs = clock ? getClockMs(side) : null;
  const isActive = clock && state.play.started && !state.play.result && clock.activeSide === side;
  const isLow = clockMs !== null && clockMs <= 10000;
  const clockHtml = clock
    ? `<div class="play-clock ${isActive ? "is-active" : ""} ${isLow ? "is-low" : ""}" data-clock="${side}">${formatClock(clockMs)}</div>`
    : "";

  return `
    <div class="play-side-bar" data-position="${position}">
      <div class="play-side-info">
        <span class="turn-dot ${side === "b" ? "black" : ""}" aria-hidden="true"></span>
        <span class="play-side-name">${escapeHtml(name)}</span>
        <span class="play-side-meta">${escapeHtml(colorLabel)}</span>
        ${renderCapturedPieces(side)}
      </div>
      ${clockHtml}
    </div>
  `;
}

function renderPlaySideControls() {
  const options = [
    { value: "w", label: "Bianco", icon: '<span class="side-icon white" aria-hidden="true">&#9812;</span>' },
    { value: "random", label: "Casuale", icon: '<span class="side-icon random" aria-hidden="true">?</span>' },
    { value: "b", label: "Nero", icon: '<span class="side-icon black" aria-hidden="true">&#9818;</span>' },
  ];

  return `
    <div class="options-side-row" role="group" aria-label="Lato giocatore">
      ${options
        .map(
          (option) => `
            <button
              class="side-btn ${state.play.sideChoice === option.value ? "is-active" : ""}"
              type="button"
              data-play-side="${option.value}"
              aria-pressed="${state.play.sideChoice === option.value ? "true" : "false"}"
            >${option.icon}<span>${escapeHtml(option.label)}</span></button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTimeControls() {
  return `
    <div class="time-control-list">
      <button class="time-button wide ${state.play.timeControl === "none" ? "is-active" : ""}" type="button" data-time-control="none">Senza orologio</button>
      ${TIME_CONTROL_GROUPS.map(
        (group) => `
          <section class="time-group" aria-label="${escapeHtml(group.name)}">
            <h3>${escapeHtml(group.name)}</h3>
            <div class="time-grid">
              ${group.controls
                .map(
                  (control) => `
                    <button
                      class="time-button ${state.play.timeControl === control.id ? "is-active" : ""}"
                      type="button"
                      data-time-control="${escapeHtml(control.id)}"
                    >${escapeHtml(control.label)}</button>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      ).join("")}
    </div>
  `;
}

function renderOptionsBlock() {
  const open = state.play.optionsOpen;
  const summary = formatOptionsSummary();
  return `
    <section class="collapsible ${open ? "is-open" : ""}" data-options="root">
      <button class="collapsible-header" type="button" data-action="toggle-options" aria-expanded="${open ? "true" : "false"}">
        <span class="collapsible-title">
          <strong>Opzioni</strong>
          <span class="range">${escapeHtml(summary)}</span>
        </span>
        <span class="collapsible-chev" aria-hidden="true">&#9662;</span>
      </button>
      <div class="collapsible-body" tabindex="${open ? "0" : "-1"}" aria-label="Opzioni partita">
        <div class="options-block">
          <div>
            <span class="panel-title">Lato</span>
            ${renderPlaySideControls()}
          </div>
          <div>
            <span class="panel-title">Cadenza</span>
            ${renderTimeControls()}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderOpeningBookPanel() {
  const book = state.openingBook;

  if (book.status === "loading" || book.status === "idle") {
    return `
      <section class="opening-book-card">
        <span class="panel-title">Apertura</span>
        <strong>Caricamento libro...</strong>
        <p>${escapeHtml(book.message)}</p>
      </section>
    `;
  }

  if (book.status === "error") {
    return `
      <section class="opening-book-card is-error">
        <span class="panel-title">Apertura</span>
        <strong>Libro non disponibile</strong>
        <p>${escapeHtml(book.message)}</p>
      </section>
    `;
  }

  const info = getOpeningInfo(game.fen());

  return `
    <section class="opening-book-card">
      <span class="panel-title">Apertura</span>
      ${
        info
          ? `<strong><span>${escapeHtml(info.eco)}</span> ${escapeHtml(info.name)}</strong>`
          : `<strong>Fuori libro</strong>`
      }
    </section>
  `;
}

function renderPlayMoveSheet() {
  const history = game.history({ verbose: true });

  if (!history.length) {
    return `<div class="empty-state compact">Posizione iniziale</div>`;
  }

  return `
    <div class="play-move-sheet">
      ${history
        .map((move, index) => {
          const prefix = move.color === "w" ? `${Math.floor(index / 2) + 1}.` : "";
          return `
            <span class="play-move-cell ${move.color === "w" ? "white-move" : "black-move"}">
              <em>${prefix}</em>${escapeHtml(move.san)}
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderBotLevelGroups() {
  return `
    <div class="bot-level-groups">
      ${BOT_LEVEL_GROUPS.map((group) => {
        const open = state.play.expandedGroup === group.name;
        const containsActive = group.levels.includes(state.play.botElo);
        const subtitle = `${group.levels.length} livelli`;
        return `
          <section class="collapsible difficulty-card ${open ? "is-open" : ""} ${containsActive ? "has-selection" : ""}" data-bot-group="${escapeHtml(group.name)}">
            <button class="collapsible-header" type="button" data-action="toggle-bot-group" data-group-name="${escapeHtml(group.name)}" aria-expanded="${open ? "true" : "false"}">
              <span class="difficulty-mark" aria-hidden="true">${escapeHtml(group.name.slice(0, 1))}</span>
              <span class="collapsible-title">
                <strong>${escapeHtml(group.name)}</strong>
                <span class="range">${escapeHtml(subtitle)}</span>
              </span>
              <span class="difficulty-range">${escapeHtml(containsActive ? `${state.play.botElo} Elo` : group.range)}</span>
              <span class="collapsible-chev" aria-hidden="true">&#9662;</span>
            </button>
            <div class="collapsible-body">
              <div class="elo-grid">
                ${group.levels
                  .map(
                    (elo) => `
                      <button
                        class="elo-button ${state.play.botElo === elo ? "is-active" : ""}"
                        type="button"
                        data-bot-elo="${elo}"
                        aria-pressed="${state.play.botElo === elo ? "true" : "false"}"
                      >${elo}</button>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderAnalysisView() {
  const history = game.history();
  const score = state.engine.score;
  const scoreText = score?.display || "+0.00";
  const scoreBar = Number.isFinite(score?.bar) ? score.bar : 50;
  const analysisEnabled = state.analysisSettings.analysisEnabled;
  const showEval = analysisEnabled && state.analysisSettings.evalBar;
  const showSuggestions = analysisEnabled && state.analysisSettings.engineSuggestions;

  return `
    <section class="analysis-layout ${analysisEnabled ? "" : "analysis-disabled"}" aria-labelledby="analysis-title">
      <div class="board-area">
        ${renderAnalysisBoardHeader()}
        ${state.analysisSettingsOpen ? renderAnalysisSettingsBanner() : ""}
        <div class="analysis-board-row">
          ${showEval ? renderEvaluationBar(scoreText, scoreBar) : ""}
          ${renderBoard()}
        </div>
        ${analysisEnabled && isReviewActive() ? renderReviewTimeline(getActiveReviewRecord()) : ""}
        ${analysisEnabled && showSuggestions ? `<div class="board-analysis-tools">
          <div class="panel-section">
            ${renderEngineCandidatesHeader()}
            <div data-engine-candidates>${renderEngineCandidates()}</div>
          </div>
        </div>` : ""}
      </div>
      ${analysisEnabled ? `<aside class="analysis-panel">
        <div>
          <p class="eyebrow">Analisi</p>
          <h2 id="analysis-title">Mosse migliori</h2>
          <p class="muted" data-engine-status>${escapeHtml(getEngineStatusText())}</p>
        </div>
        ${state.analysisSettings.moveComments ? renderCurrentMoveSummary() : ""}
        ${showEval ? `<div class="analysis-score">
          <div>
            <span>Valutazione</span>
            <small data-engine-depth-label>${escapeHtml(formatEngineDepthLabel())}</small>
          </div>
          <strong data-engine-score>${scoreText}</strong>
        </div>` : ""}
        ${isReviewActive() ? renderGameReviewPanel(getActiveReviewRecord()) : ""}
        <div class="panel-section">
          ${renderAnalysisEnabledToggle()}
        </div>
        <div class="panel-section">
          <span class="panel-title">Profondita motore</span>
          ${renderEngineDepthControls()}
        </div>
        <div class="panel-section">
          <span class="panel-title">Tipo revisione</span>
          ${renderReviewProfileControls()}
          <button
            class="primary-button review-start-button"
            type="button"
            data-action="${isReviewActive() ? "start-game-review" : "start-analysis-review"}"
            ${history.length && !state.review.isAnalyzing ? "" : "disabled"}
          >${isReviewActive() ? "Ricalcola revisione" : "Revisione partita"}</button>
        </div>
      </aside>` : ""}
      <aside class="analysis-moves-panel" data-preserve-scroll="analysis-moves">
        ${renderOpeningBookPanel()}
        <div class="panel-section">
          <span class="panel-title">Mosse giocate</span>
          ${renderPlayedMovesPanel(history)}
        </div>
      </aside>
    </section>
  `;
}

function renderAnalysisBoardHeader() {
  return `
    <div class="analysis-board-header">
      <div class="analysis-player-pills" aria-label="Giocatori analisi">
        ${renderAnalysisPlayerPill("w")}
        ${renderAnalysisPlayerPill("b")}
      </div>
      <div class="analysis-board-actions">
        <button class="small-button" type="button" data-action="flip-board">Gira</button>
        <button
          class="icon-button analysis-settings-button ${state.analysisSettingsOpen ? "is-active" : ""}"
          type="button"
          data-action="toggle-analysis-settings"
          aria-label="Impostazioni analisi"
          aria-pressed="${state.analysisSettingsOpen ? "true" : "false"}"
        >&#9881;</button>
      </div>
    </div>
  `;
}

function renderAnalysisPlayerPill(side) {
  const label = side === "w" ? "Bianco" : "Nero";
  return `
    <div class="analysis-player-pill ${side === "w" ? "white" : "black"}">
      <span class="analysis-avatar" aria-hidden="true"></span>
      <strong>${label}</strong>
    </div>
  `;
}

function renderAnalysisSettingsBanner() {
  return `
    <section class="analysis-settings-banner" aria-label="Impostazioni analisi">
      <div class="analysis-settings-banner-top">
        <span class="panel-title">Impostazioni analisi</span>
        ${renderAnalysisEnabledToggle()}
      </div>
      ${renderAnalysisSettingsControls()}
    </section>
  `;
}

function renderAnalysisEnabledToggle() {
  const enabled = state.analysisSettings.analysisEnabled;
  return `
    <button
      class="analysis-toggle-button ${enabled ? "is-active" : ""}"
      type="button"
      data-action="toggle-analysis-enabled"
      aria-pressed="${enabled ? "true" : "false"}"
    >
      <span>Analisi</span>
      <strong>${enabled ? "Attiva" : "Disattiva"}</strong>
    </button>
  `;
}

function renderBoardToolbar(mode) {
  if (mode === "analysis") {
    return `
      <div class="toolbar">
        <button class="small-button" type="button" data-action="flip-board">Gira</button>
      </div>
    `;
  }

  const resetAction =
    mode === "training"
      ? "reset-training"
      : mode === "analysis"
        ? "reset-analysis"
        : "reset-free";

  return `
    <div class="toolbar">
      <button class="small-button" type="button" data-action="${resetAction}">Reset</button>
      <button class="small-button" type="button" data-action="flip-board">Gira</button>
      <button class="small-button" type="button" data-action="clear-arrows">Cancella frecce</button>
      ${mode === "training" ? `<button class="small-button" type="button" data-view="openings">Lista aperture</button>` : ""}
    </div>
  `;
}

function renderEvaluationBar(scoreText, scoreBar = 50) {
  return `
    <div class="eval-meter" aria-label="Barra valutazione">
      <div class="eval-track" data-eval-track style="--eval-fill: ${scoreBar}%">
        <span class="eval-fill"></span>
        <span class="eval-center"></span>
      </div>
      <strong data-engine-score>${scoreText}</strong>
    </div>
  `;
}

function renderCurrentMoveSummary() {
  const history = game.history({ verbose: true });
  const latestMove = history[history.length - 1];
  const reviewMove = getCurrentMoveJudgment();
  const pending = !reviewMove && latestMove && state.analysisMoveReviewPendingPly === history.length;
  const category = reviewMove ? REVIEW_CATEGORY_BY_ID[reviewMove.category] : null;
  const san = reviewMove?.san || latestMove?.san || "Posizione iniziale";
  const label = category ? category.label : pending ? "Calcolo giudizio" : latestMove ? "In analisi" : "Nessuna mossa";
  const categoryClass = category ? ` review-${category.id}` : "";
  const comment = pending
    ? "Stockfish sta valutando la mossa appena giocata."
    : getMoveComment(reviewMove, latestMove);

  return `
    <div class="current-move-card${categoryClass}">
      <span>Mossa attuale</span>
      <strong>${escapeHtml(san)}</strong>
      <em>${escapeHtml(label)}</em>
      <p>${escapeHtml(comment)}</p>
    </div>
  `;
}

function getMoveComment(reviewMove, latestMove) {
  if (!latestMove && !reviewMove) {
    return "Nessuna mossa giocata in questa linea.";
  }

  if (!reviewMove) {
    return "La posizione e in analisi libera. Avvia la revisione per ottenere il giudizio preciso della mossa.";
  }

  const lossText = Number.isFinite(reviewMove.loss) && reviewMove.loss > 0 ? ` Perdita stimata: ${reviewMove.loss} centipawn.` : "";
  const comments = {
    geniale: "Mossa brillante: trova una risorsa difficile, spesso tattica o basata su un sacrificio, senza peggiorare la posizione.",
    grande: "Grande mossa: in questa posizione c'era pochissimo margine e hai trovato una delle risorse critiche.",
    da_libro: "Mossa teorica: segue una linea di apertura nota e affidabile.",
    forzata: "Mossa forzata: le alternative pratiche erano assenti o molto limitate.",
    migliore: "Migliore mossa: coincide con la scelta principale del motore.",
    ottima: "Ottima mossa: quasi equivalente alla migliore, con una perdita minima.",
    buona: "Buona mossa: mantiene la posizione sana, anche se il motore preferiva altro.",
    imprecisione: "Imprecisione: concede qualcosa, ma la posizione resta ancora giocabile.",
    errore: "Errore: peggiora sensibilmente la valutazione e concede controgioco.",
    mossa_mancata: "Mossa mancata: c'era una possibilita concreta piu forte nella posizione.",
    errore_grave: "Errore grave: cambia nettamente il valore della posizione.",
  };

  return `${comments[reviewMove.category] || "Giudizio disponibile per questa mossa."}${lossText}`;
}

function renderReviewProfileControls() {
  return `
    <div class="review-profile-row" role="group" aria-label="Tipo revisione">
      ${REVIEW_PROFILES.map((profile) => {
        const active = getReviewProfile().id === profile.id;
        return `
          <button
            class="review-profile-button ${active ? "is-active" : ""}"
            type="button"
            data-review-profile="${escapeHtml(profile.id)}"
            aria-pressed="${active ? "true" : "false"}"
            title="${escapeHtml(profile.description)}"
          >
            <strong>${escapeHtml(profile.label)}</strong>
            <span>${escapeHtml(profile.shortLabel)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderAnalysisSettingsControls(scope = "analysis") {
  const settingsState = scope === "play" ? state.play.analysisSettings : state.analysisSettings;
  const dataAttribute = scope === "play" ? "data-play-analysis-setting" : "data-analysis-setting";
  const settings = [
    { key: "moveComments", label: "Commenti mosse" },
    { key: "evalBar", label: "Barra di valutazione" },
    { key: "suggestionArrows", label: "Frecce suggerimento" },
    { key: "engineSuggestions", label: "Suggerimenti motore" },
    { key: "showLegalMoves", label: "Mosse disponibili" },
  ];

  return `
    <div class="analysis-settings-list">
      ${settings
        .map(
          (setting) => `
            <label class="analysis-setting-row">
              <span>${escapeHtml(setting.label)}</span>
              <input
                type="checkbox"
                ${dataAttribute}="${escapeHtml(setting.key)}"
                ${settingsState[setting.key] ? "checked" : ""}
              />
            </label>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderOpeningStudyView(opening, study) {
  const variant = getSelectedStudyVariant(study);
  const introPercent = Math.round((state.openingStudy.introProgress / study.introMoves.length) * 100);
  const lineMoves = variant?.moves || [];
  const linePercent = variant ? Math.round((state.progress / Math.max(1, lineMoves.length)) * 100) : introPercent;

  return `
    <section class="opening-study-layout" aria-labelledby="trainer-title">
      <div class="board-area opening-study-board">
        <div class="board-header">
          ${renderOpeningStudyStatus(study, variant)}
          ${renderOpeningStudyToolbar()}
        </div>
        ${renderBoard()}
        ${variant ? renderStudySuggestionCard(study, variant) : renderOpeningStudyIntroCard(study)}
        ${renderFeedback()}
      </div>
      <aside class="training-panel opening-study-panel">
        <div class="opening-study-heading">
          <p class="eyebrow">${escapeHtml(study.family)} - ${escapeHtml(study.eco)}</p>
          <h2 id="trainer-title">${escapeHtml(study.title)}</h2>
          <p class="muted">${escapeHtml(study.introText)}</p>
        </div>
        <div class="panel-section">
          <span class="panel-title">${variant ? "Progresso variante" : "Introduzione"}</span>
          <div class="progress-bar" aria-label="Progresso studio apertura">
            <span style="width: ${linePercent}%"></span>
          </div>
          <p class="muted">${escapeHtml(getOpeningStudyProgressText(study, variant))}</p>
        </div>
        ${variant ? renderStudyVariantPanel(study, variant) : renderStudyVariantChooser(study)}
      </aside>
    </section>
  `;
}

function renderOpeningStudyStatus(study, variant) {
  const label = state.openingStudy.introPlaying
    ? "Introduzione automatica"
    : variant
      ? `Studia: ${variant.name}`
      : "Scegli una variante";

  return `
    <div class="turn-indicator opening-study-status">
      <span class="turn-dot" aria-hidden="true"></span>
      <strong>${escapeHtml(label)}</strong>
    </div>
  `;
}

function renderOpeningStudyToolbar() {
  return `
    <div class="toolbar">
      <button class="small-button" type="button" data-study-action="replay-intro">Rivedi intro</button>
      <button class="small-button" type="button" data-action="reset-training">Reset</button>
      <button class="small-button" type="button" data-action="flip-board">Gira</button>
      <button class="small-button" type="button" data-view="openings">Lista aperture</button>
    </div>
  `;
}

function renderOpeningStudyIntroCard(study) {
  const moves = getMoveDescriptorsFromUci(study.introMoves);
  return `
    <section class="study-board-card">
      <span class="panel-title">Posizione base</span>
      <div class="line-moves">
        ${moves.map((move, index) => `
          <span class="move-chip ${index < state.openingStudy.introProgress ? "is-done" : ""} ${index === state.openingStudy.introProgress ? "is-current" : ""}">
            <span class="move-number">${move.moveNumber}${move.color === "b" ? "..." : "."}</span>
            ${escapeHtml(move.san)}
          </span>
        `).join("")}
      </div>
    </section>
  `;
}

function renderStudySuggestionCard(study, variant) {
  const nextMove = getCurrentStudyMoveDescriptor(variant);
  const guide = nextMove ? getStudyGuidanceForMove(variant, nextMove.uci) : null;

  return `
    <section class="study-board-card">
      <span class="panel-title">Mossa suggerita</span>
      ${
        nextMove
          ? `<strong>${escapeHtml(formatMovePrompt(nextMove))}</strong>
             <p>${escapeHtml(guide?.idea || "Gioca la prossima mossa della linea e osserva come cambia il piano.")}</p>`
          : `<strong>Linea completata</strong>
             <p>Riparti dalla variante o cambia linea per confrontare un altro piano.</p>`
      }
    </section>
  `;
}

function renderStudyVariantChooser(study) {
  return `
    <div class="opening-study-chooser">
      <div class="panel-section">
        <span class="panel-title">Piani generali</span>
        <div class="study-plan-list">
          ${study.goals.map((goal) => `<span>${escapeHtml(goal)}</span>`).join("")}
        </div>
      </div>
      <div class="panel-section">
        <span class="panel-title">Varianti disponibili da 3.Bc4</span>
        <div class="study-variant-list">
          ${study.variants.map((variant) => renderStudyVariantButton(variant)).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderStudyVariantButton(variant) {
  return `
    <button class="study-variant-button" type="button" data-study-variant="${escapeHtml(variant.id)}">
      <span>
        <strong>${escapeHtml(variant.name)}</strong>
        <small>${escapeHtml(variant.reply)} - ${escapeHtml(variant.eco)}</small>
      </span>
      <em>${escapeHtml(variant.focus)}</em>
    </button>
  `;
}

function renderStudyVariantPanel(study, variant) {
  return `
    <div class="opening-study-detail">
      <div class="study-selected-card">
        <span class="panel-title">Variante selezionata</span>
        <h3>${escapeHtml(variant.name)}</h3>
        <p>${escapeHtml(variant.focus)}</p>
        ${variant.transposition ? renderStudyTranspositionNotice(variant.transposition) : ""}
      </div>
      <div class="segmented" role="group" aria-label="Modalita studio variante">
        ${[
          ["guide", "Guidata"],
          ["plans", "Piani"],
          ["review", "Ripasso"],
        ]
          .map(([mode, label]) => `
            <button class="segmented-button ${state.openingStudy.mode === mode ? "is-active" : ""}" type="button" data-study-mode="${mode}">${label}</button>
          `)
          .join("")}
      </div>
      ${renderStudyModeContent(study, variant)}
      <div class="panel-section">
        <span class="panel-title">Altre varianti</span>
        <div class="study-variant-mini-list">
          ${study.variants
            .filter((item) => item.id !== variant.id)
            .map((item) => `<button type="button" data-study-variant="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`)
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderStudyModeContent(study, variant) {
  if (state.openingStudy.mode === "plans") {
    return renderStudyPlans(variant);
  }

  if (state.openingStudy.mode === "review") {
    return renderStudyReviewLine(variant);
  }

  return renderStudyGuidedLine(study, variant);
}

function renderStudyGuidedLine(_study, variant) {
  const nextMove = getCurrentStudyMoveDescriptor(variant);
  const guide = nextMove ? getStudyGuidanceForMove(variant, nextMove.uci) : null;

  return `
    <div class="panel-section">
      <span class="panel-title">Allenati come</span>
      <div class="segmented" role="group" aria-label="Lato di esercitazione">
        <button class="segmented-button ${state.trainerSide === "w" ? "is-active" : ""}" type="button" data-side="w">Bianco</button>
        <button class="segmented-button ${state.trainerSide === "b" ? "is-active" : ""}" type="button" data-side="b">Nero</button>
        <button class="segmented-button ${state.trainerSide === "both" ? "is-active" : ""}" type="button" data-side="both">Entrambi</button>
      </div>
      <div class="study-guidance-card">
        <span>${nextMove ? "Prossima mossa" : "Completata"}</span>
        <strong>${nextMove ? escapeHtml(formatMovePrompt(nextMove)) : "Linea finita"}</strong>
        <p>${escapeHtml(guide?.idea || "Hai completato questa variante. Ripassala oppure scegline un'altra.")}</p>
      </div>
      <button class="primary-button compact-primary" type="button" data-study-action="reset-variant">Riparti dalla variante</button>
    </div>
  `;
}

function renderStudyPlans(variant) {
  return `
    <div class="study-plan-columns">
      <section>
        <span class="panel-title">Piano del Bianco</span>
        <div class="study-plan-list">
          ${variant.plansWhite.map((plan) => `<span>${escapeHtml(plan)}</span>`).join("")}
        </div>
      </section>
      <section>
        <span class="panel-title">Piano del Nero</span>
        <div class="study-plan-list">
          ${variant.plansBlack.map((plan) => `<span>${escapeHtml(plan)}</span>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderStudyReviewLine(variant) {
  const moves = getMoveDescriptorsFromUci(variant.moves, getOpeningStudyIntroPosition());
  return `
    <div class="panel-section">
      <span class="panel-title">Ripasso linea</span>
      <div class="line-moves">
        ${moves.map((move, index) => renderMoveChip(move, index)).join("")}
      </div>
      <p class="muted">Ripeti la linea fino a riconoscere non solo la mossa, ma anche il motivo della mossa.</p>
      <button class="primary-button compact-primary" type="button" data-study-action="reset-variant">Riparti ripasso</button>
    </div>
  `;
}

function renderStudyTranspositionNotice(transposition) {
  return `
    <div class="study-transposition">
      <strong>Rientro teorico: ${escapeHtml(transposition.name)}</strong>
      <p>${escapeHtml(transposition.note)}</p>
    </div>
  `;
}

function renderEngineCandidatesHeader() {
  return `
    <div class="engine-candidates-header">
      <span class="panel-title">Suggerimenti motore</span>
      ${renderEngineLineCountControls()}
    </div>
  `;
}

function renderEngineLineCountControls() {
  return `
    <div class="line-count-control" role="group" aria-label="Numero linee motore">
      ${Array.from({ length: ENGINE_MAX_MULTIPV }, (_, index) => index + 1)
        .map(
          (count) => `
            <button
              class="line-count-button ${state.engine.multiPv === count ? "is-active" : ""}"
              type="button"
              data-engine-multipv="${count}"
              aria-pressed="${state.engine.multiPv === count ? "true" : "false"}"
            >${count}</button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderEngineDepthControls() {
  const isInfinite = state.engine.depthMode === "infinite";

  return `
    <div class="engine-depth-controls">
      <label class="toggle-row">
        <input type="checkbox" data-action="engine-infinite" ${isInfinite ? "checked" : ""} />
        <span>Illimitata</span>
      </label>
      <label class="depth-field ${isInfinite ? "is-disabled" : ""}">
        <span>Limite</span>
        <input
          type="number"
          min="1"
          max="${ENGINE_MAX_DEPTH_LIMIT}"
          step="1"
          value="${state.engine.depthLimit}"
          data-engine-depth-limit
          ${isInfinite ? "disabled" : ""}
        />
      </label>
    </div>
  `;
}

function renderHistoryMove(move, index) {
  const descriptor =
    typeof move === "string"
      ? {
          san: move,
          color: index % 2 === 0 ? "w" : "b",
          uci: "",
        }
      : move;
  const number = Math.floor(index / 2) + 1;
  const prefix = descriptor.color === "w" ? `${number}.` : `${number}...`;
  const reviewMove = isReviewActive() ? getReviewMoveByPly(index + 1) : null;
  const category = reviewMove ? REVIEW_CATEGORY_BY_ID[reviewMove.category] : null;
  const activePly = getActiveDisplayedPly();
  const isActive = activePly === index + 1;
  return `
    <span class="history-move ${category ? `review-${category.id}` : ""} ${isActive ? "is-current" : ""}">
      <span>${prefix}</span>${escapeHtml(descriptor.san)}
      ${category ? `<img class="move-review-symbol" src="${escapeHtml(category.symbol)}" alt="${escapeHtml(category.label)}">` : ""}
    </span>
  `;
}

function renderPlayedMovesPanel(history) {
  if (isReviewActive()) {
    return renderReviewPlayedMovesPanel();
  }

  if (state.view === "analysis") {
    return renderAnalysisPlayedMovesPanel(history);
  }

  if (!history.length) {
    return `<div class="empty-state compact">Nessuna mossa.</div>`;
  }

  const descriptors = history.map((san, index) => ({
    san,
    color: index % 2 === 0 ? "w" : "b",
    uci: "",
  }));
  return renderMoveGrid(descriptors);
}

function renderReviewPlayedMovesPanel() {
  const descriptors = getReviewMoveDescriptors();

  if (!descriptors.length) {
    return `<div class="empty-state compact">Nessuna mossa.</div>`;
  }

  return renderMoveGrid(descriptors);
}

function renderAnalysisPlayedMovesPanel(history) {
  const descriptors = getAnalysisMainlineDescriptors(history);

  if (!descriptors.length) {
    return `<div class="empty-state compact">Nessuna mossa.</div>`;
  }

  const rows = [];
  const rootVariations = state.analysisLine.variations.filter((variation) => !variation.parentVariationId);

  if (rootVariations.some((variation) => variation.parentPly === 0)) {
    rows.push(renderAnalysisVariationsAfter(rootVariations.filter((variation) => variation.parentPly === 0)));
  }

  for (let index = 0; index < descriptors.length; index += 2) {
    const rowMoves = descriptors.slice(index, index + 2);
    rows.push(`
      <div class="history-row">
        <div class="history-cell">${renderHistoryMove(rowMoves[0], index)}</div>
        <div class="history-cell">${rowMoves[1] ? renderHistoryMove(rowMoves[1], index + 1) : ""}</div>
      </div>
    `);

    const afterWhitePly = index + 1;
    const afterBlackPly = index + 2;
    const rowVariations = rootVariations.filter(
      (variation) => variation.parentPly === afterWhitePly || variation.parentPly === afterBlackPly,
    );
    if (rowVariations.length) {
      rows.push(renderAnalysisVariationsAfter(rowVariations));
    }
  }

  return `<div class="history-grid analysis-variation-grid">${rows.join("")}</div>`;
}

function renderMoveGrid(descriptors) {
  const rows = [];
  for (let index = 0; index < descriptors.length; index += 2) {
    rows.push(`
      <div class="history-row">
        <div class="history-cell">${renderHistoryMove(descriptors[index], index)}</div>
        <div class="history-cell">${descriptors[index + 1] ? renderHistoryMove(descriptors[index + 1], index + 1) : ""}</div>
      </div>
    `);
  }

  return `<div class="history-grid">${rows.join("")}</div>`;
}

function renderAnalysisVariationsAfter(variations) {
  return variations.map((variation) => renderAnalysisVariationLine(variation)).join("");
}

function renderAnalysisVariationLine(variation) {
  const basePly = getVariationBasePly(variation);
  const activePath = getAnalysisLinePathFromHistory();
  const depth = Math.max(0, variation.depth || 0);
  const children = state.analysisLine.variations.filter((child) => child.parentVariationId === variation.id);
  const parts = [];

  for (let index = 0; index < variation.moves.length; index += 1) {
    const descriptor = variation.moves[index];
    const ply = basePly + index + 1;
    const number = Math.floor((ply - 1) / 2) + 1;
    const prefix = descriptor.color === "w" ? `${number}.` : `${number}...`;
    const isActive = activePath?.variationId === variation.id && activePath.localPly === index + 1;
    parts.push(`
      <span class="variation-move ${isActive ? "is-current" : ""}">
        <span>${prefix}</span>${escapeHtml(descriptor.san)}
      </span>
    `);

    const nested = children.filter((child) => child.parentLocalPly === index + 1);
    if (nested.length) {
      parts.push(renderAnalysisVariationsAfter(nested));
    }
  }

  return `
    <div class="analysis-variation-line" style="--variation-depth: ${depth}">
      <span class="variation-rail" aria-hidden="true"></span>
      <div class="variation-moves">${parts.join("")}</div>
    </div>
  `;
}

function getActiveDisplayedPly() {
  if (isReviewActive()) {
    if (state.review.mode === "variation") {
      return state.review.variationStart || null;
    }
    return state.review.cursor || null;
  }

  if (state.view !== "analysis") {
    return null;
  }

  const path = getAnalysisLinePathFromHistory();
  return path?.type === "mainline" ? path.ply : null;
}

function getReviewMoveDescriptors() {
  const record = getActiveReviewRecord();
  const moves = state.review.mainline || [];
  const san = record?.san || [];

  if (!moves.length) {
    return [];
  }

  return buildMoveDescriptors(moves, san);
}

function getAnalysisMainlineDescriptors(history = game.history()) {
  if (state.analysisLine.mainline.length) {
    return state.analysisLine.mainline;
  }

  return history.map((san, index) => ({
    uci: "",
    san,
    color: index % 2 === 0 ? "w" : "b",
  }));
}

function buildMoveDescriptors(moves, sanMoves = []) {
  const preview = new ChessEngine();

  return moves.map((uci, index) => {
    const move = playPreviewMove(preview, uci);
    return {
      uci,
      san: sanMoves[index] || move?.san || uci,
      color: move?.color || (index % 2 === 0 ? "w" : "b"),
      from: move?.from || uci.slice(0, 2),
      to: move?.to || uci.slice(2, 4),
    };
  });
}

function descriptorFromMove(move) {
  return {
    uci: moveToUci(move),
    san: move.san,
    color: move.color,
    from: move.from,
    to: move.to,
  };
}

function getVariationById(id) {
  return state.analysisLine.variations.find((variation) => variation.id === id) || null;
}

function getVariationBasePly(variation) {
  if (!variation?.parentVariationId) {
    return variation?.parentPly || 0;
  }

  const parent = getVariationById(variation.parentVariationId);
  return getVariationBasePly(parent) + (variation.parentLocalPly || 0);
}

function getMovesBeforeVariation(variation) {
  if (!variation) {
    return [];
  }

  if (!variation.parentVariationId) {
    return state.analysisLine.mainline.slice(0, variation.parentPly).map((move) => move.uci);
  }

  const parent = getVariationById(variation.parentVariationId);
  return [
    ...getMovesBeforeVariation(parent),
    ...parent.moves.slice(0, variation.parentLocalPly || 0).map((move) => move.uci),
  ];
}

function getAnalysisLinePathFromHistory() {
  if (state.view !== "analysis" || isReviewActive()) {
    return null;
  }

  return getAnalysisLinePathFromMoves(game.history({ verbose: true }).map(moveToUci));
}

function getAnalysisLinePathFromMoves(moves) {
  const mainline = state.analysisLine.mainline.map((move) => move.uci);

  if (!state.analysisLine.variations.length) {
    return { type: "mainline", ply: moves.length };
  }

  if (
    moves.length <= mainline.length &&
    moves.every((uci, index) => normalizeUci(uci) === normalizeUci(mainline[index]))
  ) {
    return { type: "mainline", ply: moves.length };
  }

  let bestMatch = null;
  for (const variation of state.analysisLine.variations) {
    const prefix = getMovesBeforeVariation(variation);
    if (moves.length < prefix.length) {
      continue;
    }

    const matchesPrefix = prefix.every((uci, index) => normalizeUci(uci) === normalizeUci(moves[index]));
    if (!matchesPrefix) {
      continue;
    }

    const localMoves = moves.slice(prefix.length);
    const matchesVariation = localMoves.every(
      (uci, index) => normalizeUci(uci) === normalizeUci(variation.moves[index]?.uci),
    );

    if (matchesVariation && (!bestMatch || prefix.length + localMoves.length > bestMatch.length)) {
      bestMatch = {
        type: "variation",
        variationId: variation.id,
        localPly: localMoves.length,
        length: prefix.length + localMoves.length,
      };
    }
  }

  return bestMatch || { type: "mainline", ply: moves.length };
}

function renderReviewSymbolBadge(square) {
  const reviewMove = getCurrentMoveJudgment();
  if (!reviewMove || reviewMove.to !== square) {
    return "";
  }

  const category = REVIEW_CATEGORY_BY_ID[reviewMove.category];
  if (!category) {
    return "";
  }

  return `
    <span class="piece-review-badge" title="${escapeHtml(category.label)}">
      <img src="${escapeHtml(category.symbol)}" alt="${escapeHtml(category.label)}">
    </span>
  `;
}

function renderGameReviewPanel(record) {
  if (!record) {
    return "";
  }

  if (state.review.isAnalyzing) {
    const total = Math.max(1, state.review.mainline.length);
    const percent = Math.round((state.review.progress / total) * 100);
    const profile = getReviewProfile();
    return `
      <section class="review-panel">
        <div class="review-panel-heading">
          <strong>Revisione ${escapeHtml(profile.label.toLowerCase())}</strong>
          <span>${state.review.progress}/${total}</span>
        </div>
        <div class="progress-bar"><span style="width: ${percent}%"></span></div>
        <p class="muted">Stockfish sta valutando le mosse a profondita ${profile.depth}.</p>
      </section>
    `;
  }

  if (!isReviewResultCurrent(record.review)) {
    return `
      <section class="review-panel">
        <div class="review-panel-heading">
          <strong>Revisione partita</strong>
          <span>Stockfish</span>
        </div>
        <p class="muted">Analizza la partita per ottenere precisione, categorie mosse e grafico.</p>
        <button class="primary-button review-start-button" type="button" data-action="start-game-review">Analizza partita</button>
      </section>
    `;
  }

  const review = record.review;
  const leftLabel = record.analysisOnly ? "Bianco" : "Tu";
  const rightLabel = record.analysisOnly ? "Nero" : `Bot ${record.botElo}`;
  return `
    <section class="review-panel">
      <div class="review-players">
        <div>
          <span>${escapeHtml(leftLabel)}</span>
          <strong>${formatAccuracy(review.accuracy?.[record.humanSide])}</strong>
        </div>
        <div>
          <span>${escapeHtml(rightLabel)}</span>
          <strong>${formatAccuracy(review.accuracy?.[record.botSide])}</strong>
        </div>
      </div>
      <div class="review-performance">
        <span>Punteggio partita</span>
        <strong>${escapeHtml(review.performance?.[record.humanSide] || "--")}</strong>
        <strong>${escapeHtml(review.performance?.[record.botSide] || "--")}</strong>
      </div>
      ${renderReviewCategoryTable(record)}
      ${renderReviewPhases(record)}
      <button class="secondary-action-button" type="button" data-action="review-to-analysis">Analisi</button>
    </section>
  `;
}

function renderReviewCategoryTable(record) {
  const review = record.review;
  const left = record.humanSide;
  const right = record.botSide;

  return `
    <div class="review-category-table">
      ${REVIEW_TABLE_ORDER.map((id) => {
        const category = REVIEW_CATEGORY_BY_ID[id];
        return `
          <div class="review-category-row">
            <span>${escapeHtml(category.label)}</span>
            <strong>${review.counts?.[left]?.[id] || 0}</strong>
            <img src="${escapeHtml(category.symbol)}" alt="${escapeHtml(category.label)}">
            <strong>${review.counts?.[right]?.[id] || 0}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderReviewPhases(record) {
  const phases = record.review?.phases || {};
  const rows = [
    ["opening", "Apertura"],
    ["middlegame", "Mediogioco"],
    ["endgame", "Finale"],
  ];

  return `
    <div class="review-phase-table">
      ${rows
        .map(([id, label]) => {
          const phase = phases[id] || {};
          return `
            <div class="review-phase-row">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(phase.label?.[record.humanSide] || "-")}</strong>
              <strong>${escapeHtml(phase.label?.[record.botSide] || "-")}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderReviewTimeline(record) {
  const moves = record?.review?.moves || [];
  if (!moves.length) {
    return "";
  }

  const width = 100;
  const points = moves
    .map((move, index) => {
      const x = moves.length === 1 ? 0 : (index / (moves.length - 1)) * width;
      const y = 100 - scoreToChartPercent(move.afterWhiteCp);
      return `${x},${y}`;
    })
    .join(" ");

  return `
    <div class="review-timeline" aria-label="Andamento valutazione partita">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x="0" y="0" width="100" height="100"></rect>
        <line x1="0" y1="50" x2="100" y2="50"></line>
        <polyline points="${points}"></polyline>
        ${moves
          .map((move, index) => {
            const x = moves.length === 1 ? 0 : (index / (moves.length - 1)) * width;
            const y = 100 - scoreToChartPercent(move.afterWhiteCp);
            return `<circle class="review-dot review-${escapeHtml(move.category)}" cx="${x}" cy="${y}" r="1.9"></circle>`;
          })
          .join("")}
      </svg>
    </div>
  `;
}

function renderBoard() {
  const squares = [];
  const ranks = getRanksForOrientation();
  const files = getFilesForOrientation();
  const currentReviewMove = state.view === "analysis" ? getCurrentMoveJudgment() : null;
  const currentReviewCategory = currentReviewMove ? REVIEW_CATEGORY_BY_ID[currentReviewMove.category] : null;

  for (const rank of ranks) {
    for (const file of files) {
      const square = `${file}${rank}`;
      const piece = game.get(square);
      const isLight = (FILES.indexOf(file) + rank) % 2 === 0;
      const isSelected = state.selected === square;
      const isTarget = state.targets.includes(square);
      const isLast = state.lastMove && [state.lastMove.from, state.lastMove.to].includes(square);
      const isDragOrigin = state.dragFrom === square;
      const isDragOver = state.dragOver === square;
      const isPremove = isPremoveSquare(square);
      const isReviewMoveSquare =
        currentReviewMove && [currentReviewMove.from, currentReviewMove.to].includes(square);
      const showRank = file === files[0];
      const showFile = rank === ranks[ranks.length - 1];

      squares.push(`
        <button
          class="square ${isLight ? "light" : "dark"} ${piece ? "has-piece" : ""} ${isSelected ? "is-selected" : ""} ${isTarget ? "is-target" : ""} ${isLast ? "is-last" : ""} ${isDragOrigin ? "is-drag-origin" : ""} ${isDragOver ? "is-drag-over" : ""} ${isPremove ? "is-premove" : ""} ${isReviewMoveSquare ? `is-review-move review-${currentReviewCategory?.id || ""}` : ""}"
          type="button"
          data-square="${square}"
          aria-label="${square}${piece ? ` ${piece.color === "w" ? "bianco" : "nero"} ${PIECE_NAMES[piece.type]}` : ""}"
        >
          ${showRank ? `<span class="coord rank">${rank}</span>` : ""}
          ${piece ? renderPiece(piece) : ""}
          ${renderReviewSymbolBadge(square)}
          ${showFile ? `<span class="coord file">${file}</span>` : ""}
        </button>
      `);
    }
  }

  return `
    <div class="board-shell" data-board aria-label="Scacchiera">
      <div class="chess-board">
        ${squares.join("")}
      </div>
      <svg class="arrow-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${renderArrows()}
      </svg>
    </div>
  `;
}

function renderPiece(piece) {
  const assetName = PIECE_ASSET_NAMES[piece.type];
  const assetPath = `pezzi/${assetName}-${piece.color}.svg`;

  return `
    <span class="piece ${piece.color === "w" ? "white" : "black"}" data-piece="${piece.color}${piece.type}" draggable="false">
      <img class="piece-img" src="${assetPath}" alt="" draggable="false" aria-hidden="true">
    </span>
  `;
}

function renderCapturedPieces(side) {
  const captured = getCapturedPiecesBySide(side);
  const pieces = captured.pieces;

  if (!pieces.length && captured.material === 0) {
    return "";
  }

  return `
    <span class="captured-pieces" aria-label="Pezzi catturati">
      ${pieces
        .map(
          (piece) => `
            <img
              class="captured-piece-img"
              src="pezzi/${PIECE_ASSET_NAMES[piece.type]}-${piece.color}.svg"
              alt=""
              aria-hidden="true"
            >
          `,
        )
        .join("")}
      ${captured.material > 0 ? `<span class="captured-material">+${captured.material}</span>` : ""}
    </span>
  `;
}

function getCapturedPiecesBySide(side) {
  const history = game.history({ verbose: true });
  const capturedBySide = [];
  const capturedAgainstSide = [];

  for (const move of history) {
    if (!move.captured) {
      continue;
    }

    const capturedPiece = {
      color: move.color === "w" ? "b" : "w",
      type: move.captured,
    };

    if (move.color === side) {
      capturedBySide.push(capturedPiece);
    } else {
      capturedAgainstSide.push(capturedPiece);
    }
  }

  const material =
    scoreCapturedMaterial(capturedBySide) - scoreCapturedMaterial(capturedAgainstSide);

  return {
    pieces: sortCapturedPieces(capturedBySide),
    material: Math.max(0, Math.round(material / 100)),
  };
}

function scoreCapturedMaterial(pieces) {
  return pieces.reduce((total, piece) => total + (PIECE_VALUES[piece.type] || 0), 0);
}

function sortCapturedPieces(pieces) {
  const order = { q: 0, r: 1, b: 2, n: 3, p: 4 };
  return [...pieces].sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
}

function queueMoveAnimation(move, options = {}) {
  if (!move || (!options.force && state.pendingAnimation)) {
    return;
  }

  const from = options.from || move.from;
  const to = options.to || move.to;

  if (!from || !to || from === to) {
    return;
  }

  state.pendingAnimation = {
    from,
    to,
    piece: options.piece || {
      color: move.color,
      type: move.promotion || move.piece,
    },
  };
}

function playPendingMoveAnimation() {
  const animation = state.pendingAnimation;

  if (!animation) {
    return;
  }

  state.pendingAnimation = null;
  window.requestAnimationFrame(() => animateMove(animation));
}

function animateMove(animation) {
  const fromSquare = app.querySelector(`[data-square="${animation.from}"]`);
  const toSquare = app.querySelector(`[data-square="${animation.to}"]`);
  const targetPiece = toSquare?.querySelector("[data-piece]");

  if (!fromSquare || !toSquare || !targetPiece) {
    return;
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const size = Math.min(fromRect.width, fromRect.height);
  const ghost = document.createElement("div");
  const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);

  ghost.className = "move-animation-piece";
  ghost.style.width = `${size}px`;
  ghost.style.height = `${size}px`;
  ghost.style.left = `${fromRect.left + fromRect.width / 2}px`;
  ghost.style.top = `${fromRect.top + fromRect.height / 2}px`;
  ghost.innerHTML = renderPiece(animation.piece);
  targetPiece.classList.add("is-animation-hidden");
  document.body.appendChild(ghost);

  const keyframes = [
    { transform: "translate(-50%, -50%) translate(0, 0)" },
    { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)` },
  ];
  const timing = {
    duration: MOVE_ANIMATION_MS,
    easing: "cubic-bezier(0.22, 0.8, 0.25, 1)",
    fill: "forwards",
  };
  const animationPlayer = ghost.animate(keyframes, timing);

  animationPlayer.addEventListener("finish", () => finishMoveAnimation(ghost, targetPiece), { once: true });
  animationPlayer.addEventListener("cancel", () => finishMoveAnimation(ghost, targetPiece), { once: true });
}

function finishMoveAnimation(ghost, targetPiece) {
  ghost.remove();
  targetPiece.classList.remove("is-animation-hidden");
}

function renderArrows() {
  const arrows = [
    ...state.arrows.map((arrow) => ({ ...arrow, draft: false })),
    ...(getActiveAnalysisSettings().analysisEnabled && getActiveAnalysisSettings().suggestionArrows ? getEngineSuggestionArrows() : []),
    ...(state.arrowDraft ? [{ ...state.arrowDraft, draft: true }] : []),
  ].filter((arrow) => arrow.from && arrow.to && arrow.from !== arrow.to);

  if (!arrows.length) {
    return "";
  }

  return arrows
    .map((arrow, index) => {
      const geometry = getArrowGeometry(arrow.from, arrow.to);
      const className = `board-arrow${arrow.draft ? " draft" : ""}${arrow.engine ? " engine" : ""}`;
      const color = getArrowColorValue(arrow.color);

      if (!geometry) {
        return "";
      }

      return `
        <g class="${className}" style="--arrow-color: ${color}" data-arrow="${index}">
          <line class="board-arrow-line" x1="${geometry.start.x}" y1="${geometry.start.y}" x2="${geometry.lineEnd.x}" y2="${geometry.lineEnd.y}" />
          <polygon class="board-arrow-head" points="${geometry.headPoints}" />
        </g>
      `;
    })
    .join("");
}

function renderTurnIndicator() {
  const turn = game.turn();
  return `
    <div class="turn-indicator">
      <span class="turn-dot ${turn === "b" ? "black" : ""}"></span>
      Muove il ${turn === "w" ? "Bianco" : "Nero"}
    </div>
  `;
}

function renderFeedback() {
  if (!state.feedback.text) {
    return "";
  }

  const tone = state.feedback.tone ? ` ${state.feedback.tone}` : "";
  return `<div class="board-note${tone}" role="status">${escapeHtml(state.feedback.text)}</div>`;
}

function renderEngineCandidates() {
  const lineCount = Math.max(1, Math.min(ENGINE_MAX_MULTIPV, state.engine.multiPv || ENGINE_MULTIPV));

  if (state.engine.status === "loading") {
    return `<div class="empty-state compact">Controllo disponibilita Stockfish...</div>`;
  }

  if (!state.engine.available) {
    return `<div class="empty-state compact">Stockfish non disponibile nella cartella locale.</div>`;
  }

  if (state.engine.status === "analyzing" && !state.engine.lines.length) {
    return `
      <div class="candidate-list">
        ${Array.from({ length: lineCount }, (_, index) => `
          <div class="candidate-row">
            <strong>${index + 1}</strong>
            <span>${index === 0 ? "Analisi in corso..." : "Calcolo variante"}</span>
            <em>${index === 0 ? escapeHtml(formatEngineDepthLabel()) : "--"}</em>
          </div>
        `).join("")}
      </div>
    `;
  }

  if (!state.engine.lines.length) {
    return `<div class="empty-state compact">Muovi un pezzo o attendi l'analisi iniziale.</div>`;
  }

  return `
    <div class="candidate-list">
      ${state.engine.lines
        .slice(0, lineCount)
        .map(
          (line) => `
            <div class="candidate-row">
              <strong>${line.multipv}</strong>
              <span>${escapeHtml(formatPvLine(line.pv, state.engine.fen))}</span>
              <em>${escapeHtml(line.score.display)}</em>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function getActiveAnalysisSettings() {
  return state.view === "play" ? state.play.analysisSettings : state.analysisSettings;
}

function shouldRunEngineAnalysis() {
  if (state.view === "analysis") {
    return state.analysisSettings.analysisEnabled;
  }

  return state.view === "play" && state.play.started && state.play.analysisSettings.analysisEnabled;
}

function isEngineStreamCurrent(requestId, fen) {
  return requestId === engineRequestId && shouldRunEngineAnalysis() && game.fen() === fen;
}

function formatEngineDepthLabel() {
  if (!getActiveAnalysisSettings().analysisEnabled) {
    return "Disattiva";
  }

  if (state.engine.status === "loading") {
    return "Controllo";
  }

  if (!state.engine.available) {
    return "Non disponibile";
  }

  if (!state.engine.depth) {
    return state.engine.depthMode === "infinite" ? "Illimitata" : `0/${state.engine.depthLimit}`;
  }

  return state.engine.depthMode === "infinite"
    ? `Prof. ${state.engine.depth}`
    : `${state.engine.depth}/${state.engine.depthLimit}`;
}

function getEnginePillText() {
  if (state.engine.status === "ready" || state.engine.status === "analyzing") {
    return `${state.engine.name} attivo`;
  }

  if (state.engine.status === "loading") {
    return "Motore in controllo";
  }

  return "Motore non disponibile";
}

function getEngineStatusText() {
  if (!getActiveAnalysisSettings().analysisEnabled) {
    return "Analisi motore disattivata.";
  }

  if (state.engine.status === "analyzing") {
    if (!state.engine.depth) {
      return state.engine.depthMode === "infinite"
        ? `${state.engine.name} sta iniziando l'analisi illimitata.`
        : `${state.engine.name} sta iniziando l'analisi fino a profondita ${state.engine.depthLimit}.`;
    }

    return state.engine.depthMode === "infinite"
      ? `${state.engine.name} sta analizzando senza limite a profondita ${state.engine.depth}.`
      : `${state.engine.name} sta analizzando a profondita ${state.engine.depth}/${state.engine.depthLimit}.`;
  }

  if (state.engine.status === "ready" && state.engine.score) {
    return `${state.engine.name} collegato. Migliore: ${formatBestMoveLabel()}. Profondita ${state.engine.depth || "--"}.`;
  }

  if (state.engine.status === "ready") {
    return `${state.engine.name} collegato e pronto per analizzare.`;
  }

  if (state.engine.status === "loading") {
    return "Controllo del motore Stockfish in corso.";
  }

  return state.engine.message || "Stockfish non disponibile.";
}

function getPlayStatusText() {
  if (!state.play.started) {
    return `Scegli bot, lato e tempo. Livello selezionato: ${state.play.botElo} Elo.`;
  }

  if (state.engine.status === "loading") {
    return "Collegamento a Stockfish in corso...";
  }

  if (!state.engine.available) {
    return "Stockfish non disponibile: puoi muovere i pezzi, ma il bot non rispondera.";
  }

  if (state.play.botThinking) {
    return `Stockfish ${state.play.botElo} Elo sta pensando.`;
  }

  if (game.turn() === state.play.botSide) {
    return `Tocca al bot ${state.play.botElo} Elo.`;
  }

  return `Giochi con il ${getSideLabel(state.play.humanSide)} contro Stockfish ${state.play.botElo} Elo.`;
}

function formatBestMoveLabel() {
  if (!state.engine.bestmove || !state.engine.fen) {
    return "--";
  }

  return formatPvLine([state.engine.bestmove], state.engine.fen);
}

function clampDepthLimit(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return ENGINE_DEFAULT_DEPTH_LIMIT;
  }

  return Math.max(1, Math.min(ENGINE_MAX_DEPTH_LIMIT, parsed));
}

function bindEvents() {
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      if (view === "play") {
        enterFreePlay();
      } else if (view === "openings") {
        cancelPendingBotMove();
        cancelOpeningStudyAnimation();
        state.view = "openings";
        clearSelection();
        render();
      } else if (view === "analysis") {
        enterAnalysis();
      } else if (view === "archive") {
        cancelPendingBotMove();
        cancelOpeningStudyAnimation();
        state.view = "archive";
        clearSelection();
        render();
      } else {
        enterHome();
      }
    });
  });

  app.querySelectorAll("[data-opening]").forEach((button) => {
    button.addEventListener("click", () => startOpening(button.dataset.opening));
  });

  app.querySelectorAll("[data-study-variant]").forEach((button) => {
    button.addEventListener("click", () => selectStudyVariant(button.dataset.studyVariant));
  });

  app.querySelectorAll("[data-study-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.openingStudy.mode = button.dataset.studyMode || "guide";
      render();
    });
  });

  app.querySelectorAll("[data-review-game]").forEach((button) => {
    button.addEventListener("click", () => enterGameReview(button.dataset.reviewGame));
  });

  app.querySelectorAll("[data-review-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      state.review.profile = getReviewProfile(button.dataset.reviewProfile).id;
      state.feedback = {
        tone: "",
        text: `Revisione ${getReviewProfile().label.toLowerCase()} selezionata.`,
      };
      render();
    });
  });

  app.querySelectorAll("[data-analysis-setting]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.analysisSetting;
      if (!Object.prototype.hasOwnProperty.call(state.analysisSettings, key)) {
        return;
      }

      state.analysisSettings[key] = input.checked;
      if (key === "suggestionArrows" && !input.checked) {
        state.arrows = state.arrows.filter((arrow) => !arrow.engine);
      }
      if (key === "moveComments" && input.checked) {
        queueLatestAnalysisMoveReview();
      }
      if (key === "showLegalMoves") {
        refreshSelectionTargets();
      }
      render();
      if (state.analysisSettings.analysisEnabled && (key === "evalBar" || key === "engineSuggestions")) {
        queueEngineAnalysis();
      }
    });
  });

  app.querySelectorAll("[data-play-analysis-setting]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.playAnalysisSetting;
      if (!Object.prototype.hasOwnProperty.call(state.play.analysisSettings, key)) {
        return;
      }

      state.play.analysisSettings[key] = input.checked;
      if (key === "suggestionArrows" && !input.checked) {
        state.arrows = state.arrows.filter((arrow) => !arrow.engine);
      }
      if (key === "showLegalMoves") {
        refreshSelectionTargets();
      }
      render();
      if (state.play.analysisSettings.analysisEnabled && (key === "evalBar" || key === "engineSuggestions" || key === "suggestionArrows")) {
        queueEngineAnalysis();
      }
    });
  });

  app.querySelectorAll("[data-family]").forEach((button) => {
    button.addEventListener("click", () => {
      state.family = button.dataset.family;
      render();
    });
  });

  const searchInput = app.querySelector("[data-action='search-openings']");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.search = event.target.value;
      render();
      const restored = app.querySelector("[data-action='search-openings']");
      if (restored) {
        restored.focus();
        restored.setSelectionRange(restored.value.length, restored.value.length);
      }
    });
  }

  const board = app.querySelector("[data-board]");
  if (board) {
    board.addEventListener("contextmenu", (event) => event.preventDefault());
    board.addEventListener("pointerdown", handleBoardPointerDown);
  }

  app.querySelectorAll("[data-square]").forEach((square) => {
    square.addEventListener("click", () => handleSquareClick(square.dataset.square));
  });

  app.querySelectorAll("[data-side]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trainerSide = button.dataset.side;
      resetTraining();
    });
  });

  app.querySelectorAll("[data-bot-elo]").forEach((button) => {
    button.addEventListener("click", () => {
      state.play.botElo = Number.parseInt(button.dataset.botElo, 10) || state.play.botElo;
      state.feedback = {
        tone: "",
        text: `Livello bot impostato a ${state.play.botElo} Elo.`,
      };
      render();
      queueBotMove();
    });
  });

  app.querySelectorAll("[data-action='toggle-bot-group']").forEach((button) => {
    button.addEventListener("click", () => {
      const groupName = button.dataset.groupName;
      state.play.expandedGroup =
        state.play.expandedGroup === groupName ? null : groupName;
      render();
    });
  });

  app.querySelectorAll("[data-play-side]").forEach((button) => {
    button.addEventListener("click", () => {
      state.play.sideChoice = button.dataset.playSide || "w";
      if (state.play.sideChoice === "b") {
        state.orientation = "b";
      } else if (state.play.sideChoice === "w") {
        state.orientation = "w";
      }
      render();
    });
  });

  app.querySelectorAll("[data-time-control]").forEach((button) => {
    button.addEventListener("click", () => {
      state.play.timeControl = button.dataset.timeControl || "none";
      render();
    });
  });

  const depthInput = app.querySelector("[data-engine-depth-limit]");
  if (depthInput) {
    depthInput.addEventListener("input", (event) => {
      const parsed = Number.parseInt(event.target.value, 10);

      if (!Number.isFinite(parsed)) {
        return;
      }

      state.engine.depthLimit = clampDepthLimit(parsed);

      if (state.engine.depthMode === "fixed") {
        queueEngineAnalysis();
      }
    });

    depthInput.addEventListener("change", (event) => {
      state.engine.depthLimit = clampDepthLimit(event.target.value);
      event.target.value = state.engine.depthLimit;

      if (state.engine.depthMode === "fixed") {
        queueEngineAnalysis();
      }
    });
  }

  app.querySelectorAll("[data-engine-multipv]").forEach((button) => {
    button.addEventListener("click", () => {
      const count = Number.parseInt(button.dataset.engineMultipv, 10);
      state.engine.multiPv = Math.max(1, Math.min(ENGINE_MAX_MULTIPV, Number.isFinite(count) ? count : ENGINE_MULTIPV));
      render();
      queueEngineAnalysis();
    });
  });

  app.querySelectorAll("[data-action]").forEach((button) => {
    const action = button.dataset.action;
    if (action === "engine-infinite") {
      button.addEventListener("change", (event) => {
        state.engine.depthMode = event.target.checked ? "infinite" : "fixed";
        render();
        queueEngineAnalysis();
      });
    }
    if (action === "flip-board") {
      button.addEventListener("click", () => {
        state.orientation = state.orientation === "w" ? "b" : "w";
        render();
      });
    }
    if (action === "toggle-analysis-settings") {
      button.addEventListener("click", () => {
        state.analysisSettingsOpen = !state.analysisSettingsOpen;
        render();
      });
    }
    if (action === "toggle-analysis-enabled") {
      button.addEventListener("click", () => {
        state.analysisSettings.analysisEnabled = !state.analysisSettings.analysisEnabled;

        if (!state.analysisSettings.analysisEnabled) {
          abortActiveEngineAnalysis();
          state.engine.lines = [];
          state.engine.score = null;
          state.engine.bestmove = null;
          state.engine.fen = null;
          state.engine.status = state.engine.available ? "ready" : state.engine.status;
          state.arrows = state.arrows.filter((arrow) => !arrow.engine);
        }

        render();

        if (state.analysisSettings.analysisEnabled) {
          queueEngineAnalysis();
        }
      });
    }
    if (action === "toggle-play-analysis-enabled") {
      button.addEventListener("click", () => {
        state.play.analysisSettings.analysisEnabled = !state.play.analysisSettings.analysisEnabled;

        if (!state.play.analysisSettings.analysisEnabled) {
          abortActiveEngineAnalysis();
          state.engine.lines = [];
          state.engine.score = null;
          state.engine.bestmove = null;
          state.engine.fen = null;
          state.engine.status = state.engine.available ? "ready" : state.engine.status;
          state.arrows = state.arrows.filter((arrow) => !arrow.engine);
        }

        render();

        if (state.play.analysisSettings.analysisEnabled) {
          queueEngineAnalysis();
        }
      });
    }
    if (action === "clear-arrows") {
      button.addEventListener("click", () => {
        clearArrows();
        render();
      });
    }
    if (action === "reset-free") {
      button.addEventListener("click", enterFreePlay);
    }
    if (action === "reset-analysis") {
      button.addEventListener("click", enterAnalysis);
    }
    if (action === "reset-training") {
      button.addEventListener("click", resetTraining);
    }
    if (action === "replay-intro") {
      button.addEventListener("click", playOpeningStudyIntro);
    }
    if (action === "reset-variant") {
      button.addEventListener("click", () => resetOpeningStudy());
    }
    if (action === "start-bot-game") {
      button.addEventListener("click", startBotGame);
    }
    if (action === "resign-game") {
      button.addEventListener("click", resignBotGame);
    }
    if (action === "restart-game") {
      button.addEventListener("click", startBotGame);
    }
    if (action === "play-settings") {
      button.addEventListener("click", () => {
        state.play.settingsOpen = !state.play.settingsOpen;
        render();
      });
    }
    if (action === "request-hint") {
      button.addEventListener("click", requestPlayHint);
    }
    if (action === "toggle-options") {
      button.addEventListener("click", () => {
        state.play.optionsOpen = !state.play.optionsOpen;
        render();
      });
    }
    if (action === "result-restart") {
      button.addEventListener("click", () => {
        state.play.result = null;
        startBotGame();
      });
    }
    if (action === "result-review") {
      button.addEventListener("click", () => {
        if (!state.currentGameId || !enterGameReview(state.currentGameId)) {
          enterReview();
        }
      });
    }
    if (action === "result-home") {
      button.addEventListener("click", enterHome);
    }
    if (action === "start-game-review") {
      button.addEventListener("click", () => startGameReviewAnalysis());
    }
    if (action === "start-analysis-review") {
      button.addEventListener("click", () => startAnalysisLineReview());
    }
    if (action === "review-to-analysis") {
      button.addEventListener("click", convertReviewToAnalysis);
    }
  });
}

async function checkEngineStatus(retryCount = 0) {
  const maxRetries = 6;
  try {
    const response = await fetch("/api/engine/status", { cache: "no-store" });

    if (!response.ok) {
      throw new Error("endpoint non disponibile");
    }

    const status = await response.json();
    state.engine.available = Boolean(status.available);
    state.engine.name = status.name || "Stockfish 18";
    state.engine.status = status.available ? "ready" : "missing";
    state.engine.message = status.available
      ? `${state.engine.name} collegato.`
      : "Stockfish non trovato nella cartella locale.";
  } catch (error) {
    state.engine.available = false;
    state.engine.status = "missing";
    state.engine.message = `Motore non disponibile: ${error.message}`;

    if (retryCount < maxRetries) {
      window.setTimeout(() => checkEngineStatus(retryCount + 1), 700);
    }
  }

  render();
  queueEngineAnalysis();
  queueBotMove();
}

function queueEngineAnalysis() {
  window.clearTimeout(engineTimer);
  abortActiveEngineAnalysis();

  if (!shouldRunEngineAnalysis()) {
    return;
  }

  if (!state.engine.available) {
    state.engine.lines = [];
    state.engine.score = null;
    state.engine.bestmove = null;
    return;
  }

  engineTimer = window.setTimeout(runEngineAnalysis, 180);
}

async function runEngineAnalysis() {
  if (!shouldRunEngineAnalysis() || !state.engine.available) {
    return;
  }

  const requestId = ++engineRequestId;
  const fen = game.fen();
  const controller = new AbortController();
  const depthMode = state.engine.depthMode;
  const depthLimit = clampDepthLimit(state.engine.depthLimit);

  engineAbortController = controller;
  state.engine.depthLimit = depthLimit;

  state.engine.status = "analyzing";
  state.engine.depth = 0;
  state.engine.lines = [];
  state.engine.bestmove = null;
  state.engine.fen = fen;
  state.engine.message =
    depthMode === "infinite"
      ? `${state.engine.name} sta analizzando senza limite...`
      : `${state.engine.name} sta salendo fino a profondita ${depthLimit}...`;
  render();

  try {
    const response = await fetch("/api/engine/analyze-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        depth: depthMode === "fixed" ? depthLimit : null,
        depthMode,
        fen,
        multipv: Math.max(1, Math.min(ENGINE_MAX_MULTIPV, state.engine.multiPv || ENGINE_MULTIPV)),
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || "analisi non riuscita");
    }

    if (!response.body) {
      throw new Error("stream analisi non disponibile");
    }

    await readEngineStream(response.body, requestId, fen, controller);

    if (isEngineStreamCurrent(requestId, fen)) {
      state.engine.status = "ready";
      state.engine.message = `${state.engine.name} collegato.`;
      render();
    }
  } catch (error) {
    if (requestId !== engineRequestId || error.name === "AbortError") {
      return;
    }

    state.engine.status = "error";
    state.engine.lines = [];
    state.engine.score = null;
    state.engine.bestmove = null;
    state.engine.message = `Errore Stockfish: ${error.message}`;
    render();
  } finally {
    if (engineAbortController === controller) {
      engineAbortController = null;
    }
  }
}

function abortActiveEngineAnalysis() {
  if (engineAbortController) {
    engineAbortController.abort();
    engineAbortController = null;
  }

  if (engineDomUpdateTimer) {
    window.clearTimeout(engineDomUpdateTimer);
    engineDomUpdateTimer = null;
  }
}

async function readEngineStream(body, requestId, fen, controller) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!handleEngineStreamLine(line, requestId, fen, controller)) {
        return;
      }
    }
  }

  if (buffer.trim()) {
    handleEngineStreamLine(buffer, requestId, fen, controller);
  }
}

function handleEngineStreamLine(line, requestId, fen, controller) {
  if (!isEngineStreamCurrent(requestId, fen)) {
    controller.abort();
    return false;
  }

  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }

  let payload;

  try {
    payload = JSON.parse(trimmed);
  } catch (_error) {
    return true;
  }

  if (payload.type === "error") {
    throw new Error(payload.error || "analisi non riuscita");
  }

  applyEnginePayload(payload, fen);
  scheduleEngineDomUpdate(payload.type === "final");
  return true;
}

function applyEnginePayload(payload, fen) {
  const lines = Array.isArray(payload.lines) ? payload.lines : state.engine.lines;

  state.engine.status = payload.type === "final" ? "ready" : "analyzing";
  state.engine.depth = Number.isFinite(payload.depth) ? payload.depth : state.engine.depth;
  state.engine.lines = lines;
  state.engine.score = payload.score || lines[0]?.score || state.engine.score;
  state.engine.bestmove = payload.bestmove || state.engine.bestmove;
  state.engine.fen = payload.fen || fen;
  state.engine.message =
    payload.type === "final"
      ? `${state.engine.name} collegato.`
      : getEngineStatusText();
}

function scheduleEngineDomUpdate(immediate = false) {
  if (immediate) {
    if (engineDomUpdateTimer) {
      window.clearTimeout(engineDomUpdateTimer);
      engineDomUpdateTimer = null;
    }
    applyEngineDomUpdate();
    return;
  }

  if (engineDomUpdateTimer) {
    return;
  }

  engineDomUpdateTimer = window.setTimeout(() => {
    engineDomUpdateTimer = null;
    applyEngineDomUpdate();
  }, ENGINE_DOM_UPDATE_MS);
}

function applyEngineDomUpdate() {
  if (!shouldRunEngineAnalysis()) {
    return;
  }

  const score = state.engine.score;
  const scoreText = score?.display || "+0.00";
  const scoreBar = Number.isFinite(score?.bar) ? score.bar : 50;
  const evalTrack = app.querySelector("[data-eval-track]");
  const status = app.querySelector("[data-engine-status]");
  const depthLabel = app.querySelector("[data-engine-depth-label]");
  const candidates = app.querySelector("[data-engine-candidates]");

  if (evalTrack) {
    evalTrack.style.setProperty("--eval-fill", `${scoreBar}%`);
  }

  app.querySelectorAll("[data-engine-score]").forEach((element) => {
    element.textContent = scoreText;
  });

  if (status) {
    status.textContent = getEngineStatusText();
  }

  if (depthLabel) {
    depthLabel.textContent = formatEngineDepthLabel();
  }

  if (candidates) {
    candidates.innerHTML = renderEngineCandidates();
  }

  renderArrowLayer();
}

function handleBoardPointerDown(event) {
  const squareElement = event.target.closest("[data-square]");
  if (!squareElement || !isBoardInteractive()) {
    return;
  }

  const square = squareElement.dataset.square;

  if (event.button === 2) {
    startArrowDraft(square, event);
    return;
  }

  if (event.button !== 0) {
    return;
  }

  if (state.arrows.length || state.arrowDraft) {
    event.preventDefault();
    clearArrows();
    clearSelection();
    render();
    return;
  }

  const piece = game.get(square);
  if (!piece) {
    return;
  }

  if (state.selected === square) {
    return;
  }

  if (state.view === "trainer" && !canUserMoveNow()) {
    return;
  }

  if (state.view === "play" && isPremoveContext()) {
    if (piece.color !== state.play.humanSide) {
      return;
    }
    startPieceDrag(square, piece, event);
    return;
  }

  if (piece.color !== game.turn()) {
    return;
  }

  if (state.view === "play" && !canPlayHumanMoveNow()) {
    return;
  }

  startPieceDrag(square, piece, event);
}

function startPieceDrag(square, piece, event) {
  event.preventDefault();
  suppressNextClick = true;

  selectSquare(square);
  state.dragFrom = square;
  state.dragOver = square;
  render();

  const boardElement = app.querySelector("[data-board]");
  const squareElement = app.querySelector(`[data-square="${square}"]`);
  const squareSize = squareElement?.getBoundingClientRect().width || 72;
  const ghost = document.createElement("div");

  ghost.className = "drag-piece";
  ghost.style.width = `${squareSize}px`;
  ghost.style.height = `${squareSize}px`;
  ghost.innerHTML = renderPiece(piece);
  document.body.appendChild(ghost);

  dragState = {
    from: square,
    piece,
    ghost,
    boardElement,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    over: square,
    createdAt: Date.now(),
  };

  document.body.classList.add("is-piece-dragging");
  positionDragGhost(event.clientX, event.clientY);

  document.addEventListener("pointermove", handlePieceDragMove);
  document.addEventListener("pointerup", handlePieceDragEnd, { once: true });
  document.addEventListener("pointercancel", handlePieceDragCancel, { once: true });
}

function handlePieceDragMove(event) {
  if (!dragState) {
    return;
  }

  const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
  dragState.moved = dragState.moved || distance > 4;
  positionDragGhost(event.clientX, event.clientY);
  updateDragOver(getSquareFromPoint(event.clientX, event.clientY));
}

function handlePieceDragEnd(event) {
  if (!dragState) {
    return;
  }

  const dropSquare = getSquareFromPoint(event.clientX, event.clientY);
  const from = dragState.from;
  const moved = dragState.moved;

  cleanupPieceDrag();

  if (moved && dropSquare && dropSquare !== from) {
    if (isPremoveContext()) {
      queuePremove(from, dropSquare);
      return;
    }
    attemptMove(from, dropSquare, { animate: false });
    return;
  }

  if (moved) {
    clearSelection();
  }
  render();
}

function handlePieceDragCancel() {
  if (!dragState) {
    return;
  }

  cleanupPieceDrag();
  clearSelection();
  render();
}

function cleanupPieceDrag() {
  document.removeEventListener("pointermove", handlePieceDragMove);
  document.removeEventListener("pointercancel", handlePieceDragCancel);
  document.body.classList.remove("is-piece-dragging");
  dragState?.ghost.remove();
  state.dragFrom = null;
  state.dragOver = null;
  dragState = null;
  releaseClickSuppressionSoon();
}

function waitForPieceDragEnd() {
  if (!dragState) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      if (!dragState) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > 10000) {
        cleanupPieceDrag();
        clearSelection();
        resolve();
        return;
      }

      window.setTimeout(tick, 16);
    };
    tick();
  });
}

function positionDragGhost(clientX, clientY) {
  if (!dragState) {
    return;
  }

  dragState.ghost.style.left = `${clientX}px`;
  dragState.ghost.style.top = `${clientY}px`;
}

function releaseClickSuppressionSoon() {
  window.setTimeout(() => {
    suppressNextClick = false;
  }, 0);
}

function updateDragOver(square) {
  if (!dragState || dragState.over === square) {
    return;
  }

  if (dragState.over) {
    app.querySelector(`[data-square="${dragState.over}"]`)?.classList.remove("is-drag-over");
  }

  dragState.over = square;
  state.dragOver = square;

  if (square) {
    app.querySelector(`[data-square="${square}"]`)?.classList.add("is-drag-over");
  }
}

function startArrowDraft(square, event) {
  event.preventDefault();
  state.arrowDraft = { from: square, to: square, color: getArrowColor(event) };
  renderArrowLayer();

  arrowState = {
    from: square,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };

  document.addEventListener("pointermove", handleArrowDraftMove);
  document.addEventListener("pointerup", handleArrowDraftEnd, { once: true });
  document.addEventListener("pointercancel", handleArrowDraftCancel, { once: true });
}

function handleArrowDraftMove(event) {
  if (!arrowState || !state.arrowDraft) {
    return;
  }

  const distance = Math.hypot(event.clientX - arrowState.startX, event.clientY - arrowState.startY);
  arrowState.moved = arrowState.moved || distance > 4;

  const square = getSquareFromPoint(event.clientX, event.clientY);
  if (!square || state.arrowDraft.to === square) {
    return;
  }

  state.arrowDraft.to = square;
  renderArrowLayer();
}

function handleArrowDraftEnd(event) {
  if (!arrowState || !state.arrowDraft) {
    return;
  }

  const to = getSquareFromPoint(event.clientX, event.clientY);
  if (arrowState.moved && to && to !== arrowState.from) {
    toggleArrow(arrowState.from, to, state.arrowDraft.color);
  } else if (state.arrows.length) {
    clearArrows();
  }

  state.arrowDraft = null;
  arrowState = null;
  document.removeEventListener("pointermove", handleArrowDraftMove);
  document.removeEventListener("pointercancel", handleArrowDraftCancel);
  renderArrowLayer();
}

function handleArrowDraftCancel() {
  state.arrowDraft = null;
  arrowState = null;
  document.removeEventListener("pointermove", handleArrowDraftMove);
  document.removeEventListener("pointercancel", handleArrowDraftCancel);
  renderArrowLayer();
}

function renderArrowLayer() {
  const layer = app.querySelector(".arrow-layer");
  if (layer) {
    layer.innerHTML = renderArrows();
  }
}

function toggleArrow(from, to, color = "green") {
  const index = state.arrows.findIndex((arrow) => arrow.from === from && arrow.to === to);
  if (index >= 0) {
    state.arrows.splice(index, 1);
    return;
  }

  state.arrows.push({ from, to, color });
}

function getSquareFromPoint(clientX, clientY) {
  const element = document.elementFromPoint(clientX, clientY);
  return element?.closest("[data-square]")?.dataset.square || null;
}

function handleGlobalContextMenu(event) {
  if (suppressNextContextMenu || event.target.closest("[data-board]") || state.arrows.length || state.arrowDraft) {
    event.preventDefault();
    suppressNextContextMenu = false;
  }
}

function handleGlobalPointerDown(event) {
  if (event.button !== 2 || !state.arrows.length || event.target.closest("[data-board]")) {
    return;
  }

  event.preventDefault();
  suppressNextContextMenu = true;
  clearArrows();
  render();
}

function handleKeyboardNavigation(event) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || isTypingTarget(event.target)) {
    return;
  }

  if (!isBoardInteractive()) {
    return;
  }

  event.preventDefault();

  if (event.key === "ArrowLeft") {
    stepBackward();
    return;
  }

  if (event.key === "ArrowRight") {
    stepForward();
    return;
  }

  if (event.key === "ArrowUp") {
    if (isReviewActive()) {
      jumpReviewToStart();
    } else if (state.view === "analysis") {
      jumpAnalysisLineToStart();
    }
    return;
  }

  if (event.key === "ArrowDown") {
    if (isReviewActive()) {
      jumpReviewToEnd();
    } else if (state.view === "analysis") {
      jumpAnalysisLineToEnd();
    }
    return;
  }

  return;
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function stepBackward() {
  if (isReviewActive()) {
    stepReviewBackward();
    return;
  }

  const undone = game.undo();

  if (!undone) {
    state.feedback = {
      tone: "warn",
      text: "Sei gia alla posizione iniziale.",
    };
    clearSelection();
    render();
    return;
  }

  state.redoMoves.unshift(moveToUci(undone));

  if (state.view === "trainer") {
    state.progress = Math.max(0, state.progress - 1);
  }

  queueMoveAnimation(undone, {
    from: undone.to,
    to: undone.from,
    force: true,
    piece: {
      color: undone.color,
      type: undone.piece,
    },
  });
  syncLastMoveFromHistory();
  syncAnalysisLinePathFromBoard();
  clearSelection();
  state.feedback = {
    tone: "",
    text: `Indietro: annullata ${undone.san}.`,
  };
  render();
  queueLatestAnalysisMoveReview();
  queueEngineAnalysis();
}

function stepForward() {
  if (isReviewActive()) {
    stepReviewForward();
    return;
  }

  const nextMove = state.redoMoves.shift();

  if (!nextMove) {
    state.feedback = {
      tone: "warn",
      text: "Non ci sono mosse successive.",
    };
    clearSelection();
    render();
    return;
  }

  const move = playUci(nextMove);

  if (!move) {
    state.redoMoves.unshift(nextMove);
    state.feedback = {
      tone: "error",
      text: "Non riesco a rigiocare la mossa successiva.",
    };
    clearSelection();
    render();
    return;
  }

  if (state.view === "trainer") {
    const studyMoves = getCurrentOpeningStudy() ? getStudyTrainingMoves() : null;
    const opening = getCurrentOpening();
    const maxProgress = studyMoves ? studyMoves.length : opening?.moves.length;
    state.progress = maxProgress ? Math.min(maxProgress, state.progress + 1) : state.progress + 1;
  }

  queueMoveAnimation(move, { force: true });
  state.lastMove = { from: move.from, to: move.to };
  if (state.view === "analysis") {
    syncAnalysisLinePathFromBoard();
    queueLatestAnalysisMoveReview();
  }
  clearSelection();
  state.feedback = {
    tone: "ok",
    text: `Avanti: ${move.san}.`,
  };
  render();
  queueEngineAnalysis();
}

function jumpAnalysisLineToStart() {
  if (state.view !== "analysis") {
    return;
  }

  let moved = 0;
  let undone = game.undo();

  while (undone) {
    state.redoMoves.unshift(moveToUci(undone));
    moved += 1;
    undone = game.undo();
  }

  if (!moved) {
    state.feedback = { tone: "warn", text: "Sei gia alla posizione iniziale." };
  } else {
    state.feedback = { tone: "", text: "Posizione iniziale della linea di analisi." };
  }

  syncLastMoveFromHistory();
  syncAnalysisLinePathFromBoard();
  clearSelection();
  render();
  queueLatestAnalysisMoveReview();
  queueEngineAnalysis();
}

function jumpAnalysisLineToEnd() {
  if (state.view !== "analysis") {
    return;
  }

  let moved = 0;
  let lastMove = null;

  while (state.redoMoves.length) {
    const nextMove = state.redoMoves.shift();
    const move = playUci(nextMove);

    if (!move) {
      state.redoMoves.unshift(nextMove);
      state.feedback = {
        tone: "error",
        text: "Non riesco a raggiungere la posizione finale della linea.",
      };
      clearSelection();
      render();
      queueEngineAnalysis();
      return;
    }

    lastMove = move;
    moved += 1;
  }

  if (lastMove) {
    state.lastMove = { from: lastMove.from, to: lastMove.to };
  } else {
    syncLastMoveFromHistory();
  }

  state.feedback = moved
    ? { tone: "ok", text: "Posizione finale della linea di analisi." }
    : { tone: "warn", text: "Sei gia alla posizione finale." };
  syncAnalysisLinePathFromBoard();
  queueLatestAnalysisMoveReview();
  clearSelection();
  render();
  queueEngineAnalysis();
}

function enterHome() {
  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  stopClockTicker();
  state.view = "home";
  state.play.started = false;
  state.play.hintThinking = false;
  state.play.clock = null;
  state.play.result = null;
  state.play.premoves = [];
  state.play.expandedGroup = null;
  state.play.optionsOpen = false;
  state.play.settingsOpen = false;
  clearReviewState();
  clearAnalysisMoveReviewState();
  resetAnalysisLine();
  clearOpeningBookContext();
  state.orientation = "w";
  game = new ChessEngine();
  state.lastMove = null;
  state.redoMoves = [];
  state.feedback = {
    tone: "",
    text: "Seleziona un pezzo, oppure trascinalo sulla casa di destinazione.",
  };
  clearSelection();
  clearArrows();
  render();
  queueEngineAnalysis();
}

function enterFreePlay() {
  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  stopClockTicker();
  state.view = "play";
  state.play.started = false;
  state.play.hintThinking = false;
  state.play.clock = null;
  state.play.result = null;
  state.play.premoves = [];
  state.play.settingsOpen = false;
  clearReviewState();
  clearAnalysisMoveReviewState();
  resetAnalysisLine();
  clearOpeningBookContext();
  state.openingId = null;
  state.progress = 0;
  game = new ChessEngine();
  state.lastMove = null;
  state.redoMoves = [];
  state.orientation = state.play.sideChoice === "b" ? "b" : "w";
  state.feedback = {
    tone: "",
    text: "Scegli bot, lato e tempo per avviare la partita.",
  };
  clearSelection();
  clearArrows();
  render();
  queueEngineAnalysis();
}

function startBotGame() {
  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  stopClockTicker();
  state.play.started = true;
  state.play.hintThinking = false;
  state.play.result = null;
  state.play.humanSide = getSelectedHumanSide();
  state.play.botSide = state.play.humanSide === "w" ? "b" : "w";
  state.orientation = state.play.humanSide;
  state.openingId = null;
  state.progress = 0;
  game = new ChessEngine();
  state.lastMove = null;
  state.redoMoves = [];
  state.play.clock = createClockState(state.play.timeControl);
  state.play.premoves = [];
  state.play.settingsOpen = false;
  clearReviewState();
  clearAnalysisMoveReviewState();
  resetAnalysisLine();
  clearOpeningBookContext();
  createCurrentGameRecord();
  state.feedback = {
    tone: "",
    text: `Partita avviata: tu ${getSideLabel(state.play.humanSide)}, bot ${state.play.botElo} Elo.`,
  };
  clearSelection();
  clearArrows();
  render();
  queueBotMove();
}

function getSelectedHumanSide() {
  if (state.play.sideChoice === "random") {
    return Math.random() < 0.5 ? "w" : "b";
  }

  return state.play.sideChoice === "b" ? "b" : "w";
}

function getSideLabel(side) {
  return side === "b" ? "Nero" : "Bianco";
}

function getTimeControlLabel(id = state.play.timeControl) {
  if (id === "none") {
    return "Senza orologio";
  }

  for (const group of TIME_CONTROL_GROUPS) {
    const control = group.controls.find((item) => item.id === id);
    if (control) {
      return control.label;
    }
  }

  return "Senza orologio";
}

function getBotGroupForElo(elo) {
  return BOT_LEVEL_GROUPS.find((group) => group.levels.includes(elo)) || null;
}

function formatPlayGameSummary() {
  return `${getSideLabel(state.play.humanSide)} contro ${getSideLabel(state.play.botSide)} - ${getTimeControlLabel()}`;
}

function leaveBotGameToSettings(message) {
  cancelPendingBotMove();
  stopClockTicker();
  state.play.started = false;
  state.play.hintThinking = false;
  state.play.clock = null;
  state.play.result = null;
  state.play.premoves = [];
  state.orientation = state.play.sideChoice === "b" ? "b" : "w";
  game = new ChessEngine();
  state.lastMove = null;
  state.redoMoves = [];
  state.feedback = {
    tone: "",
    text: message,
  };
  clearSelection();
  clearArrows();
  render();
}

function resignBotGame() {
  if (state.play.result) return;
  const moveCount = game.history().length;
  if (moveCount <= 1) {
    applyGameResult({
      type: "cancelled",
      title: "Partita annullata",
      reason: "La partita e stata annullata prima dell'inizio.",
      tone: "warn",
      icon: "cancelled",
    });
  } else {
    const winnerSide = state.play.botSide;
    applyGameResult({
      type: "loss-resign",
      title: `${getSideLabel(winnerSide)} ha vinto`,
      reason: "Hai abbandonato la partita.",
      tone: "error",
      icon: "loss",
      winnerSide,
    });
  }
}

/* ===========================================================
   Clock & game-result helpers
   =========================================================== */

function parseTimeControl(id) {
  if (!id || id === "none") return null;
  const cleaned = String(id).trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(?:\+(\d+))?$/);
  if (!match) return null;
  const baseMinutes = parseFloat(match[1]);
  const incrementSeconds = match[2] ? parseInt(match[2], 10) : 0;
  if (Number.isNaN(baseMinutes)) return null;
  return {
    baseMs: Math.round(baseMinutes * 60 * 1000),
    incrementMs: incrementSeconds * 1000,
  };
}

function createClockState(timeControlId) {
  const parsed = parseTimeControl(timeControlId);
  if (!parsed) return null;
  return {
    baseMs: parsed.baseMs,
    incrementMs: parsed.incrementMs,
    whiteMs: parsed.baseMs,
    blackMs: parsed.baseMs,
    activeSide: "w",
    lastResumeAt: Date.now(),
  };
}

function formatClock(ms) {
  if (ms === null || ms === undefined) return "--:--";
  const safe = Math.max(0, Math.round(ms));
  const totalSec = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (safe < 10000) {
    const tenths = Math.floor((safe % 1000) / 100);
    return `${String(minutes).padStart(1, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getClockMs(side) {
  const clock = state.play.clock;
  if (!clock) return null;
  const stored = side === "w" ? clock.whiteMs : clock.blackMs;
  if (
    !state.play.started ||
    state.play.result ||
    clock.activeSide !== side
  ) {
    return Math.max(0, stored);
  }
  const elapsed = Date.now() - clock.lastResumeAt;
  return Math.max(0, stored - elapsed);
}

function switchClockSide() {
  const clock = state.play.clock;
  if (!clock) return;
  const now = Date.now();
  const elapsed = now - clock.lastResumeAt;
  const activeKey = clock.activeSide === "w" ? "whiteMs" : "blackMs";
  clock[activeKey] = Math.max(0, clock[activeKey] - elapsed + clock.incrementMs);
  clock.activeSide = clock.activeSide === "w" ? "b" : "w";
  clock.lastResumeAt = now;
}

function syncClockTicker() {
  if (
    state.view === "play" &&
    state.play.started &&
    state.play.clock &&
    !state.play.result
  ) {
    ensureClockTicker();
    updateClockDisplay();
  } else {
    stopClockTicker();
  }
}

function ensureClockTicker() {
  if (clockTickerHandle) return;
  clockTickerHandle = window.setInterval(updateClockDisplay, 100);
}

function stopClockTicker() {
  if (clockTickerHandle) {
    window.clearInterval(clockTickerHandle);
    clockTickerHandle = null;
  }
}

function updateClockDisplay() {
  if (
    state.view !== "play" ||
    !state.play.started ||
    !state.play.clock ||
    state.play.result
  ) {
    stopClockTicker();
    return;
  }

  const whiteMs = getClockMs("w");
  const blackMs = getClockMs("b");

  const whiteEl = app.querySelector('[data-clock="w"]');
  const blackEl = app.querySelector('[data-clock="b"]');
  if (whiteEl) {
    whiteEl.textContent = formatClock(whiteMs);
    whiteEl.classList.toggle("is-low", whiteMs <= 10000);
  }
  if (blackEl) {
    blackEl.textContent = formatClock(blackMs);
    blackEl.classList.toggle("is-low", blackMs <= 10000);
  }

  const activeSide = state.play.clock.activeSide;
  const activeMs = activeSide === "w" ? whiteMs : blackMs;
  if (activeMs <= 0) {
    handleTimeOut(activeSide);
  }
}

function handleTimeOut(side) {
  if (state.play.result) return;
  const clock = state.play.clock;
  if (clock) {
    if (side === "w") clock.whiteMs = 0;
    else clock.blackMs = 0;
  }
  const winnerSide = side === "w" ? "b" : "w";
  const playerLost = side === state.play.humanSide;

  applyGameResult({
    type: playerLost ? "loss-time" : "win-time",
    title: playerLost ? "Hai perso per il tempo" : "Hai vinto per il tempo",
    reason: playerLost
      ? `Il tuo tempo e finito. ${getSideLabel(winnerSide)} vince.`
      : `Tempo scaduto per il bot. ${getSideLabel(winnerSide)} (tu) vince.`,
    tone: playerLost ? "error" : "ok",
    icon: playerLost ? "loss" : "win",
    winnerSide,
    timeOut: true,
  });
}

function checkAndApplyGameOver() {
  if (state.play.result) return true;
  if (!isGameFinished()) return false;

  const isCheckmate =
    typeof game.isCheckmate === "function"
      ? game.isCheckmate()
      : typeof game.in_checkmate === "function"
      ? game.in_checkmate()
      : false;
  const isStalemate =
    typeof game.isStalemate === "function"
      ? game.isStalemate()
      : typeof game.in_stalemate === "function"
      ? game.in_stalemate()
      : false;
  const isDraw =
    typeof game.isDraw === "function"
      ? game.isDraw()
      : typeof game.in_draw === "function"
      ? game.in_draw()
      : false;

  if (isCheckmate) {
    const winnerSide = game.turn() === "w" ? "b" : "w";
    const playerWon = winnerSide === state.play.humanSide;
    applyGameResult({
      type: playerWon ? "win" : "loss",
      title: `${getSideLabel(winnerSide)} ha vinto`,
      reason: playerWon
        ? "Scacco matto! Ottima partita."
        : "Scacco matto. Il bot ti ha battuto.",
      tone: playerWon ? "ok" : "error",
      icon: playerWon ? "win" : "loss",
      winnerSide,
    });
    return true;
  }

  if (isStalemate) {
    applyGameResult({
      type: "draw",
      title: "Patta per stallo",
      reason: "Nessuna mossa legale: stallo.",
      tone: "warn",
      icon: "draw",
    });
    return true;
  }

  if (isDraw) {
    applyGameResult({
      type: "draw",
      title: "Patta",
      reason: "La partita e patta.",
      tone: "warn",
      icon: "draw",
    });
    return true;
  }

  return false;
}

function applyGameResult(payload) {
  if (state.play.result) return;
  finalizeCurrentGameRecord(payload);
  cancelPendingBotMove();
  stopClockTicker();
  state.play.result = payload;
  state.play.botThinking = false;
  state.play.hintThinking = false;
  state.feedback = {
    tone:
      payload.tone === "ok"
        ? "ok"
        : payload.tone === "error"
        ? "error"
        : payload.tone === "warn"
        ? "warn"
        : "",
    text: payload.title,
  };
  render();
}

function enterReview() {
  cancelPendingBotMove();
  stopClockTicker();
  state.view = "analysis";
  state.play.started = false;
  state.play.botThinking = false;
  state.play.hintThinking = false;
  state.play.result = null;
  state.play.premoves = [];
  clearReviewState();
  state.openingId = null;
  state.progress = 0;
  state.engine.lines = [];
  state.engine.score = null;
  state.engine.bestmove = null;
  state.engine.fen = null;
  state.feedback = {
    tone: "",
    text: "Revisione partita: usa le frecce per navigare nelle mosse.",
  };
  clearSelection();
  clearArrows();
  render();
  queueEngineAnalysis();
}

function formatOptionsSummary() {
  const sideLabels = { w: "Bianco", b: "Nero", random: "Casuale" };
  const side = sideLabels[state.play.sideChoice] || "Bianco";
  return `${side} - ${getTimeControlLabel()}`;
}

function renderGameResultOverlay() {
  const result = state.play.result;
  if (!result) return "";

  const iconClass = result.icon || "draw";
  const symbol =
    iconClass === "win"
      ? "&#10003;"
      : iconClass === "loss"
      ? "&#10005;"
      : iconClass === "cancelled"
      ? "&#9888;"
      : "&#61;";

  return `
    <div class="game-result-overlay" role="dialog" aria-modal="true" aria-labelledby="game-result-title">
      <div class="game-result-card">
        <div class="game-result-icon ${escapeHtml(iconClass)}" aria-hidden="true">${symbol}</div>
        <h2 class="game-result-title" id="game-result-title">${escapeHtml(result.title || "Partita conclusa")}</h2>
        <p class="game-result-reason">${escapeHtml(result.reason || "")}</p>
        <div class="game-result-actions">
          <button class="small-button" type="button" data-action="result-home">Home</button>
          <button class="primary-button" type="button" data-action="result-restart">Avvia nuova partita</button>
          <button class="small-button" type="button" data-action="result-review">Revisione</button>
        </div>
      </div>
    </div>
  `;
}

function loadSavedGamesFromStorage() {
  try {
    const raw = window.localStorage.getItem(SAVED_GAMES_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.id).slice(0, MAX_SAVED_GAMES) : [];
  } catch (_error) {
    return [];
  }
}

function persistSavedGames() {
  try {
    window.localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(state.savedGames.slice(0, MAX_SAVED_GAMES)));
  } catch (_error) {
    // Storage pieno o non disponibile: la partita resta nella sessione corrente.
  }
}

function createCurrentGameRecord() {
  const id = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const record = {
    id,
    createdAt: now,
    updatedAt: now,
    botElo: state.play.botElo,
    timeControl: state.play.timeControl,
    humanSide: state.play.humanSide,
    botSide: state.play.botSide,
    moves: [],
    san: [],
    result: null,
  };

  state.currentGameId = id;
  state.savedGames.unshift(record);
  state.savedGames = state.savedGames.slice(0, MAX_SAVED_GAMES);
  persistSavedGames();
  return record;
}

function getCurrentGameRecord() {
  return state.savedGames.find((record) => record.id === state.currentGameId) || null;
}

function updateCurrentGameRecord(extra = {}) {
  const record = getCurrentGameRecord();
  if (!record) {
    return;
  }

  const history = game.history({ verbose: true });
  record.updatedAt = new Date().toISOString();
  record.moves = history.map(moveToUci);
  record.san = history.map((move) => move.san);
  Object.assign(record, extra);
  persistSavedGames();
}

function finalizeCurrentGameRecord(result) {
  updateCurrentGameRecord({
    finishedAt: new Date().toISOString(),
    result: {
      type: result.type || "finished",
      title: result.title || "Partita conclusa",
      reason: result.reason || "",
      winnerSide: result.winnerSide || null,
      tone: result.tone || "",
    },
  });
}

function formatSavedGameResult(record) {
  if (!record.result) {
    return "In corso";
  }

  if (record.result.type === "cancelled") {
    return "Annullata";
  }

  if (record.result.type === "draw") {
    return "Patta";
  }

  if (record.result.winnerSide) {
    return record.result.winnerSide === record.humanSide ? "Vinta" : "Persa";
  }

  return record.result.title || "Conclusa";
}

function getSavedGameResultTone(record) {
  if (!record.result) return "pending";
  if (record.result.type === "draw" || record.result.type === "cancelled") return "neutral";
  if (record.result.winnerSide === record.humanSide) return "win";
  return "loss";
}

function getSavedGameMoveCount(record) {
  return Math.ceil((record.moves?.length || 0) / 2);
}

function formatSavedGameDate(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function clearReviewState() {
  state.review = {
    activeGameId: null,
    record: null,
    mainline: [],
    cursor: 0,
    mode: "mainline",
    variationStart: null,
    variationMoves: [],
    variationMoveReviews: [],
    isAnalyzing: false,
    progress: 0,
    profile: state.review?.profile || REVIEW_DEFAULT_PROFILE,
  };
}

function clearAnalysisMoveReviewState() {
  state.analysisMoveReviews = [];
  state.analysisMoveReviewPendingPly = null;
  state.analysisMoveReviewPendingUci = null;
  analysisMoveReviewRequestId += 1;
}

function resetAnalysisLine(mainlineMoves = [], sanMoves = []) {
  state.analysisLine = {
    mainline: buildMoveDescriptors(mainlineMoves, sanMoves),
    variations: [],
    activeVariationId: null,
  };
}

function recordAnalysisLineMove(move, beforeMoves = [], hadRedo = false) {
  if (state.view !== "analysis" || isReviewActive()) {
    return;
  }

  const descriptor = descriptorFromMove(move);
  const path = getAnalysisLinePathFromMoves(beforeMoves);
  const mainline = state.analysisLine.mainline;

  if (path?.type === "variation") {
    const variation = getVariationById(path.variationId);
    if (!variation) {
      state.analysisLine.activeVariationId = null;
      return;
    }

    const localIndex = path.localPly;
    const expected = variation.moves[localIndex];
    if (expected && normalizeUci(expected.uci) === normalizeUci(descriptor.uci)) {
      state.analysisLine.activeVariationId = variation.id;
      return;
    }

    if (localIndex < variation.moves.length || hadRedo) {
      const child = createAnalysisVariation({
        parentVariationId: variation.id,
        parentLocalPly: localIndex,
        depth: (variation.depth || 0) + 1,
        firstMove: descriptor,
      });
      state.analysisLine.activeVariationId = child.id;
      return;
    }

    variation.moves.push(descriptor);
    state.analysisLine.activeVariationId = variation.id;
    return;
  }

  const plyBefore = beforeMoves.length;
  const expectedMainline = mainline[plyBefore];

  if (expectedMainline && normalizeUci(expectedMainline.uci) === normalizeUci(descriptor.uci)) {
    state.analysisLine.activeVariationId = null;
    return;
  }

  if (plyBefore < mainline.length || hadRedo) {
    const variation = createAnalysisVariation({
      parentPly: plyBefore,
      depth: 0,
      firstMove: descriptor,
    });
    state.analysisLine.activeVariationId = variation.id;
    return;
  }

  mainline.push(descriptor);
  state.analysisLine.activeVariationId = null;
}

function createAnalysisVariation({ parentPly = 0, parentVariationId = null, parentLocalPly = null, depth = 0, firstMove }) {
  const variation = {
    id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    parentPly,
    parentVariationId,
    parentLocalPly,
    depth,
    moves: firstMove ? [firstMove] : [],
  };

  state.analysisLine.variations.push(variation);
  return variation;
}

function syncAnalysisLinePathFromBoard() {
  if (state.view !== "analysis" || isReviewActive()) {
    return;
  }

  const path = getAnalysisLinePathFromHistory();
  state.analysisLine.activeVariationId = path?.type === "variation" ? path.variationId : null;
}

function isReviewActive() {
  return state.view === "analysis" && Boolean(state.review.activeGameId);
}

function startAnalysisLineReview() {
  const history = game.history({ verbose: true });

  if (!history.length || state.review.isAnalyzing) {
    state.feedback = {
      tone: "warn",
      text: "Gioca almeno una mossa in analisi prima di avviare la revisione.",
    };
    render();
    return;
  }

  const now = new Date().toISOString();
  const record = {
    id: `${ANALYSIS_REVIEW_ID}-${Date.now()}`,
    analysisOnly: true,
    createdAt: now,
    updatedAt: now,
    botElo: null,
    timeControl: "analysis",
    humanSide: "w",
    botSide: "b",
    reviewProfile: getReviewProfile().id,
    moves: history.map(moveToUci),
    san: history.map((move) => move.san),
    result: null,
    review: null,
  };

  state.review = {
    activeGameId: record.id,
    record,
    mainline: [...record.moves],
    cursor: record.moves.length,
    mode: "mainline",
    variationStart: null,
    variationMoves: [],
    variationMoveReviews: [],
    isAnalyzing: false,
    progress: 0,
    profile: getReviewProfile().id,
  };
  clearSelection();
  clearArrows();
  startGameReviewAnalysis(record.id);
}

function enterGameReview(gameId) {
  const record = state.savedGames.find((item) => item.id === gameId);
  if (!record) {
    return false;
  }

  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  stopClockTicker();
  state.view = "analysis";
  state.currentGameId = record.id;
  state.play.started = false;
  state.play.botThinking = false;
  state.play.hintThinking = false;
  state.play.result = null;
  state.openingId = null;
  state.progress = 0;
  clearAnalysisMoveReviewState();
  state.analysisSettingsOpen = false;
  clearOpeningBookContext();
  state.review = {
    activeGameId: record.id,
    record: null,
    mainline: [...(record.moves || [])],
    cursor: record.moves?.length || 0,
    mode: "mainline",
    variationStart: null,
    variationMoves: [],
    variationMoveReviews: [],
    isAnalyzing: false,
    progress: 0,
    profile: state.review?.profile || REVIEW_DEFAULT_PROFILE,
  };
  game = new ChessEngine();
  playReviewMoves(getReviewMovesToCursor());
  syncLastMoveFromHistory();
  clearRedoMoves();
  clearSelection();
  clearArrows();
  state.engine.lines = [];
  state.engine.score = null;
  state.engine.bestmove = null;
  state.engine.fen = null;
  state.feedback = {
    tone: "",
    text: "Revisione partita: freccia su torna all'inizio, freccia giu va alla posizione finale.",
  };
  render();
  queueEngineAnalysis();
  if (!isReviewResultCurrent(record.review) && record.moves?.length) {
    window.setTimeout(() => startGameReviewAnalysis(record.id), 120);
  }
  return true;
}

function convertReviewToAnalysis() {
  if (!isReviewActive()) {
    return;
  }

  const record = getActiveReviewRecord();
  if (!record?.moves?.length) {
    return;
  }

  const currentMoves = game.history({ verbose: true }).map(moveToUci);
  const mainlineMoves = [...record.moves];
  const currentIsMainlinePrefix = currentMoves.every(
    (uci, index) => normalizeUci(uci) === normalizeUci(mainlineMoves[index]),
  );

  resetAnalysisLine(mainlineMoves, record.san || []);
  state.review = {
    activeGameId: null,
    record: null,
    mainline: [],
    cursor: 0,
    mode: "mainline",
    variationStart: null,
    variationMoves: [],
    variationMoveReviews: [],
    isAnalyzing: false,
    progress: 0,
    profile: state.review?.profile || REVIEW_DEFAULT_PROFILE,
  };
  state.currentGameId = null;
  state.redoMoves = currentIsMainlinePrefix ? mainlineMoves.slice(currentMoves.length) : [];
  syncAnalysisLinePathFromBoard();
  clearAnalysisMoveReviewState();
  clearSelection();
  clearArrows();
  state.feedback = {
    tone: "",
    text: "Partita aperta in analisi: puoi creare varianti senza modificare la linea principale.",
  };
  render();
  queueLatestAnalysisMoveReview();
  queueEngineAnalysis();
}

function getReviewMovesToCursor() {
  const review = state.review;
  if (review.mode === "variation") {
    const localCursor = Math.max(0, review.cursor - review.variationStart);
    return [
      ...review.mainline.slice(0, review.variationStart),
      ...review.variationMoves.slice(0, localCursor),
    ];
  }

  return review.mainline.slice(0, review.cursor);
}

function rebuildReviewPosition() {
  game = new ChessEngine();
  playReviewMoves(getReviewMovesToCursor());
  syncLastMoveFromHistory();
  clearSelection();
  clearArrows();
  render();
  queueEngineAnalysis();
}

function playReviewMoves(moves) {
  for (const uci of moves) {
    playUci(uci);
  }
}

function handleReviewMove(move) {
  if (!isReviewActive()) {
    return { variation: false };
  }

  const review = state.review;
  const played = moveToUci(move);

  if (review.mode === "mainline") {
    if (review.mainline[review.cursor] === played) {
      review.cursor += 1;
      return { variation: false, followedMainline: true };
    }

    review.mode = "variation";
    review.variationStart = review.cursor;
    review.variationMoves = [played];
    review.cursor = review.variationStart + 1;
    return { variation: true };
  }

  const localIndex = Math.max(0, review.cursor - review.variationStart);
  if (review.variationMoves[localIndex] === played) {
    review.cursor += 1;
    return { variation: true };
  }

  review.variationMoves = review.variationMoves.slice(0, localIndex);
  review.variationMoves.push(played);
  review.cursor = review.variationStart + review.variationMoves.length;
  return { variation: true };
}

function stepReviewBackward() {
  if (state.review.cursor <= 0) {
    state.feedback = { tone: "warn", text: "Sei gia alla posizione iniziale." };
    render();
    return;
  }

  state.review.cursor -= 1;
  if (state.review.mode === "variation" && state.review.cursor <= state.review.variationStart) {
    state.review.mode = "mainline";
    state.review.cursor = state.review.variationStart;
  }
  state.feedback = { tone: "", text: "Indietro nella revisione." };
  rebuildReviewPosition();
}

function stepReviewForward() {
  const review = state.review;
  const maxCursor =
    review.mode === "variation"
      ? review.variationStart + review.variationMoves.length
      : review.mainline.length;

  if (review.cursor >= maxCursor) {
    state.feedback = { tone: "warn", text: "Non ci sono mosse successive." };
    render();
    return;
  }

  review.cursor += 1;
  state.feedback = { tone: "", text: "" };
  rebuildReviewPosition();
}

function jumpReviewToStart() {
  state.review.mode = "mainline";
  state.review.cursor = 0;
  state.feedback = { tone: "", text: "Posizione iniziale della partita." };
  rebuildReviewPosition();
}

function jumpReviewToEnd() {
  state.review.mode = "mainline";
  state.review.cursor = state.review.mainline.length;
  state.feedback = { tone: "", text: "Posizione finale della partita." };
  rebuildReviewPosition();
}

async function startGameReviewAnalysis(gameId = state.review.activeGameId) {
  const record =
    state.review.record?.id === gameId
      ? state.review.record
      : state.savedGames.find((item) => item.id === gameId);
  if (!record || !record.moves?.length || state.review.isAnalyzing) {
    return;
  }

  record.reviewProfile = getReviewProfile().id;
  abortActiveEngineAnalysis();
  state.review.isAnalyzing = true;
  state.review.progress = 0;
  state.feedback = {
    tone: "",
    text: `Stockfish sta preparando la revisione ${getReviewProfile().label.toLowerCase()}...`,
  };
  render();

  try {
    const review = await buildGameReview(record);
    record.review = review;
    record.updatedAt = new Date().toISOString();
    if (record.analysisOnly) {
      state.review.record = record;
    } else {
      persistSavedGames();
    }
    state.feedback = {
      tone: "ok",
      text: "Revisione completata: giudizi, precisione e andamento sono pronti.",
    };
  } catch (error) {
    state.feedback = {
      tone: "error",
      text: `Revisione non riuscita: ${error.message}`,
    };
  } finally {
    state.review.isAnalyzing = false;
    state.review.progress = 0;
    render();
    queueEngineAnalysis();
  }
}

async function loadOpeningBook() {
  state.openingBook.status = "loading";
  state.openingBook.message = "Lettura dei file ECO da chess-openings...";
  state.openingBook.positions = new Map();
  state.openingBook.lastInfo = null;
  state.openingBook.rows = 0;
  state.openingBook.namedPositions = 0;
  state.openingBook.errors = 0;
  render();

  try {
    const positions = new Map();
    let rows = 0;
    let errors = 0;

    for (const file of OPENING_BOOK_FILES) {
      const response = await fetch(file, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`non riesco a leggere ${file}`);
      }

      const text = await response.text();
      for (const row of parseOpeningTsv(text)) {
        rows += 1;
        if (!ingestOpeningBookRow(positions, row)) {
          errors += 1;
        }
      }
    }

    const namedPositions = [...positions.values()].filter((entry) => entry.info).length;
    state.openingBook = {
      status: "ready",
      positions,
      lastInfo: null,
      rows,
      namedPositions,
      errors,
      message: `${namedPositions} posizioni e ${rows} linee ECO caricate.`,
    };
  } catch (error) {
    state.openingBook = {
      status: "error",
      positions: new Map(),
      lastInfo: null,
      rows: 0,
      namedPositions: 0,
      errors: 0,
      message: `Errore libro aperture: ${error.message}`,
    };
  }

  render();
}

function parseOpeningTsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const header = lines.shift()?.split("\t") || [];
  const ecoIndex = header.indexOf("eco");
  const nameIndex = header.indexOf("name");
  const pgnIndex = header.indexOf("pgn");

  if (ecoIndex < 0 || nameIndex < 0 || pgnIndex < 0) {
    return [];
  }

  return lines
    .map((line) => {
      const columns = line.split("\t");
      return {
        eco: columns[ecoIndex]?.trim() || "",
        name: columns[nameIndex]?.trim() || "",
        pgn: columns[pgnIndex]?.trim() || "",
      };
    })
    .filter((row) => row.eco && row.name && row.pgn);
}

function ingestOpeningBookRow(positions, row) {
  const preview = new ChessEngine();
  const moves = tokenizeOpeningPgn(row.pgn);

  if (!moves.length) {
    return false;
  }

  for (let index = 0; index < moves.length; index += 1) {
    const beforeKey = normalizeOpeningFen(preview.fen());
    const beforeEntry = ensureOpeningBookEntry(positions, beforeKey);
    const move = playOpeningSan(preview, moves[index]);

    if (!move) {
      return false;
    }

    const uci = moveToUci(move);
    beforeEntry.nextMoves.set(uci, {
      uci,
      san: move.san,
      eco: row.eco,
      name: row.name,
      ply: index + 1,
    });

    const afterKey = normalizeOpeningFen(preview.fen());
    ensureOpeningBookEntry(positions, afterKey);
  }

  const finalKey = normalizeOpeningFen(preview.fen());
  const finalEntry = ensureOpeningBookEntry(positions, finalKey);
  assignOpeningBookInfo(finalEntry, {
    eco: row.eco,
    name: row.name,
    pgn: row.pgn,
    ply: moves.length,
  });
  return true;
}

function ensureOpeningBookEntry(positions, key) {
  if (!positions.has(key)) {
    positions.set(key, {
      key,
      info: null,
      aliases: [],
      nextMoves: new Map(),
    });
  }

  return positions.get(key);
}

function assignOpeningBookInfo(entry, info) {
  entry.aliases.push(info);

  if (
    !entry.info ||
    info.ply > entry.info.ply ||
    (info.ply === entry.info.ply && info.name.length > entry.info.name.length)
  ) {
    entry.info = info;
  }
}

function tokenizeOpeningPgn(pgn) {
  return String(pgn || "")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .map((token) => token.replace(/^\d+\.\.\./, "").replace(/^\d+\./, ""))
    .map((token) => token.replace(/\$\d+/g, ""))
    .filter((token) => token && !["*", "1-0", "0-1", "1/2-1/2"].includes(token));
}

function playOpeningSan(position, san) {
  try {
    return position.move(san);
  } catch (_error) {
    return null;
  }
}

function normalizeOpeningFen(fen) {
  return String(fen || "").trim().split(/\s+/).slice(0, 4).join(" ");
}

function getOpeningInfo(currentFen) {
  if (state.openingBook.status !== "ready") {
    return null;
  }

  const directInfo = getOpeningInfoForFen(currentFen);
  if (directInfo) {
    state.openingBook.lastInfo = directInfo;
    return directInfo;
  }

  const lineInfo = getLastOpeningInfoFromCurrentLine();
  if (lineInfo) {
    state.openingBook.lastInfo = lineInfo;
    return lineInfo;
  }

  return state.openingBook.lastInfo;
}

function getOpeningInfoForFen(fen) {
  const entry = state.openingBook.positions.get(normalizeOpeningFen(fen));
  return entry?.info || null;
}

function getLastOpeningInfoFromCurrentLine() {
  if (state.openingBook.status !== "ready") {
    return null;
  }

  const preview = new ChessEngine();
  let lastInfo = getOpeningInfoForFen(preview.fen());

  for (const move of game.history({ verbose: true }).map(moveToUci)) {
    if (!playPreviewMove(preview, move)) {
      break;
    }

    const info = getOpeningInfoForFen(preview.fen());
    if (info) {
      lastInfo = info;
    }
  }

  return lastInfo;
}

function getOpeningBookNextMoves(fen) {
  if (state.openingBook.status !== "ready") {
    return [];
  }

  const entry = state.openingBook.positions.get(normalizeOpeningFen(fen));
  return entry ? [...entry.nextMoves.values()] : [];
}

function isOpeningBookMove(currentFen, move) {
  if (state.openingBook.status !== "ready") {
    return false;
  }

  const currentKey = normalizeOpeningFen(currentFen);
  if (!state.openingBook.positions.has(currentKey)) {
    return false;
  }

  const preview = createBookPosition(currentFen);
  const played = playFlexibleBookMove(preview, move);

  if (!played) {
    return false;
  }

  const nextKey = normalizeOpeningFen(preview.fen());
  return state.openingBook.positions.has(nextKey);
}

function createBookPosition(fen) {
  try {
    return new ChessEngine(fen);
  } catch (_error) {
    return new ChessEngine(`${normalizeOpeningFen(fen)} 0 1`);
  }
}

function playFlexibleBookMove(position, move) {
  if (!move) {
    return null;
  }

  if (typeof move === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move)) {
    return playPreviewMove(position, move.toLowerCase());
  }

  if (typeof move === "string") {
    return playOpeningSan(position, move);
  }

  if (typeof move === "object" && move.from && move.to) {
    try {
      return position.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q",
      });
    } catch (_error) {
      return null;
    }
  }

  return null;
}

function isBookMoveFromLine(moves, ply) {
  if (state.openingBook.status !== "ready" || ply <= 0 || ply > moves.length) {
    return false;
  }

  const preview = new ChessEngine();

  for (let index = 0; index < ply - 1; index += 1) {
    if (!playPreviewMove(preview, moves[index])) {
      return false;
    }
  }

  return isOpeningBookMove(preview.fen(), moves[ply - 1]);
}

function clearOpeningBookContext() {
  state.openingBook.lastInfo = null;
}

async function buildGameReview(record) {
  const profile = getReviewProfile(record.reviewProfile);
  const reviewGame = new ChessEngine();
  const moves = [];
  const counts = {
    w: createEmptyReviewCounts(),
    b: createEmptyReviewCounts(),
  };
  const accuracyValues = { w: [], b: [] };
  const lossValues = { w: [], b: [] };
  const phases = createPhaseBuckets();

  for (let index = 0; index < record.moves.length; index += 1) {
    const uci = record.moves[index];
    const beforeFen = reviewGame.fen();
    const positionBefore = new ChessEngine(beforeFen);
    const mover = reviewGame.turn();
    const legalCount = reviewGame.moves().length;
    const beforeMaterial = getMaterialBalanceForSide(reviewGame, mover);
    const beforeAnalysis = await fetchPositionAnalysis(beforeFen, profile.multipv, profile.id);
    const bestMove = beforeAnalysis.lines?.[0]?.pv?.[0] || beforeAnalysis.bestmove || null;
    const bestWhiteCp = getAnalysisWhiteCp(beforeAnalysis);
    const bestMoverCp = scoreForSide(bestWhiteCp, mover);
    const secondWhiteCp = getAnalysisLineWhiteCp(beforeAnalysis, 1);
    const secondMoverCp = Number.isFinite(secondWhiteCp) ? scoreForSide(secondWhiteCp, mover) : null;
    const bestGap = Number.isFinite(secondMoverCp) ? Math.max(0, Math.round(bestMoverCp - secondMoverCp)) : 0;
    const playedRank = getPlayedMoveRank(beforeAnalysis, uci);
    const playerElo = getReviewPlayerElo(record, mover);
    const move = playPreviewMove(reviewGame, uci);

    if (!move) {
      break;
    }

    const givesCheckmate = isPositionCheckmate(reviewGame);
    const afterFen = reviewGame.fen();
    const afterMaterial = getMaterialBalanceForSide(reviewGame, mover);
    const afterAnalysis = await fetchPositionAnalysis(afterFen, 1, profile.id);
    const sacrifice = detectMaterialSacrifice({
      positionBefore,
      move,
      positionAfter: reviewGame,
      mover,
      beforeMaterial,
      afterMaterial,
      enginePv: afterAnalysis.lines?.[0]?.pv || [],
      config: BRILLIANT_CONFIG,
    });
    let afterWhiteCp = getAnalysisWhiteCp(afterAnalysis);
    if (givesCheckmate) {
      afterWhiteCp = mover === "w" ? 10000 : -10000;
    }
    const afterMoverCp = scoreForSide(afterWhiteCp, mover);
    const loss = Math.max(0, Math.round(bestMoverCp - afterMoverCp));
    const classificationContext = {
      positionBefore,
      positionAfter: reviewGame,
      uci,
      move,
      mover,
      ply: index + 1,
      allMoves: record.moves,
      legalCount,
      bestMove,
      loss,
      bestMoverCp,
      afterMoverCp,
      materialLoss: beforeMaterial - afterMaterial,
      materialBeforeCp: beforeMaterial,
      givesCheckmate,
      sacrifice,
      bestGap,
      playedRank,
      secondBestMoverCp: secondMoverCp,
      enginePv: afterAnalysis.lines?.[0]?.pv || [],
      isBookMove: isBookMove(record.moves, index + 1),
      gamePhase: getReviewGamePhase(positionBefore, index + 1, record.moves.length),
      playerElo,
    };
    const category = classifyReviewedMove(classificationContext);
    const accuracy = getMoveAccuracy(category, loss);
    const phase = getReviewGamePhase(positionBefore, index + 1, record.moves.length);

    counts[mover][category] += 1;
    accuracyValues[mover].push(accuracy);
    lossValues[mover].push(loss);
    phases[phase][mover].push(accuracy);

    moves.push({
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      color: mover,
      uci,
      san: move.san,
      from: move.from,
      to: move.to,
      category,
      symbol: REVIEW_CATEGORY_BY_ID[category]?.symbol || "",
      loss,
      accuracy,
      bestMove,
      bestLine: beforeAnalysis.lines?.[0]?.pv || [],
      beforeWhiteCp: bestWhiteCp,
      afterWhiteCp,
      scoreDisplay: afterAnalysis.score?.display || "",
      phase,
      brilliant: classificationContext.brilliantResult || null,
    });

    state.review.progress = index + 1;
    if ((index + 1) % 2 === 0 || index === record.moves.length - 1) {
      render();
      await delay(0);
    }
  }

  const accuracy = {
    w: average(accuracyValues.w),
    b: average(accuracyValues.b),
  };
  const averageLoss = {
    w: average(lossValues.w),
    b: average(lossValues.b),
  };

  return {
    status: "complete",
    depth: profile.depth,
    reviewProfile: profile.id,
    classificationVersion: REVIEW_CLASSIFICATION_VERSION,
    generatedAt: new Date().toISOString(),
    moves,
    counts,
    accuracy,
    averageLoss,
    performance: {
      w: estimatePerformanceElo(accuracy.w, averageLoss.w, record.botElo),
      b: estimatePerformanceElo(accuracy.b, averageLoss.b, record.botElo),
    },
    phases: summarizePhaseBuckets(phases),
  };
}

function queueLatestAnalysisMoveReview() {
  if (state.view !== "analysis" || isReviewActive() || !state.analysisSettings.moveComments) {
    return;
  }

  const history = game.history({ verbose: true });
  const latestMove = history[history.length - 1];

  if (!latestMove || getAnalysisMoveReviewByPly(history.length)) {
    return;
  }

  const moves = history.map(moveToUci);
  const preview = new ChessEngine();

  for (const uci of moves.slice(0, -1)) {
    if (!playPreviewMove(preview, uci)) {
      return;
    }
  }

  const mover = preview.turn();
  const beforeMaterial = getMaterialBalanceForSide(preview, mover);
  const context = {
    beforeFen: preview.fen(),
    mover,
    legalCount: preview.moves().length,
    beforeMaterial,
  };
  const replayedMove = playPreviewMove(preview, moves[moves.length - 1]);

  if (!replayedMove) {
    return;
  }

  const afterMaterial = getMaterialBalanceForSide(preview, mover);
  queueAnalysisMoveReview({
    ...context,
    move: latestMove,
    uci: moves[moves.length - 1],
    ply: history.length,
    allMoves: moves,
    lineKey: getLineKeyFromMoves(moves, history.length),
    afterFen: preview.fen(),
    afterMaterial,
    givesCheckmate: isPositionCheckmate(preview),
    sacrifice: isReviewSacrificeCandidate(preview, replayedMove, mover, beforeMaterial, afterMaterial),
  });
}

function queueAnalysisMoveReview(context) {
  if (
    state.view !== "analysis" ||
    (isReviewActive() && context.scope !== "reviewVariation") ||
    !state.analysisSettings.analysisEnabled ||
    !state.analysisSettings.moveComments ||
    !state.engine.available
  ) {
    return;
  }

  state.analysisMoveReviewPendingPly = context.ply;
  state.analysisMoveReviewPendingUci = context.uci;
  const requestId = ++analysisMoveReviewRequestId;
  evaluateAnalysisMove(context, requestId);
}

async function evaluateAnalysisMove(context, requestId) {
  const profile = getReviewProfile();

  try {
    const positionBefore = new ChessEngine(context.beforeFen);
    const positionAfter = new ChessEngine(context.afterFen);
    const beforeAnalysis = await fetchPositionAnalysis(context.beforeFen, profile.multipv, profile.id);
    const bestMove = beforeAnalysis.lines?.[0]?.pv?.[0] || beforeAnalysis.bestmove || null;
    const bestWhiteCp = getAnalysisWhiteCp(beforeAnalysis);
    const bestMoverCp = scoreForSide(bestWhiteCp, context.mover);
    const secondWhiteCp = getAnalysisLineWhiteCp(beforeAnalysis, 1);
    const secondMoverCp = Number.isFinite(secondWhiteCp) ? scoreForSide(secondWhiteCp, context.mover) : null;
    const bestGap = Number.isFinite(secondMoverCp) ? Math.max(0, Math.round(bestMoverCp - secondMoverCp)) : 0;
    const playedRank = getPlayedMoveRank(beforeAnalysis, context.uci);
    const afterAnalysis = context.givesCheckmate
      ? { score: { display: "Matto", whiteCp: context.mover === "w" ? 10000 : -10000 }, lines: [] }
      : await fetchPositionAnalysis(context.afterFen, 1, profile.id);
    const sacrifice = detectMaterialSacrifice({
      positionBefore,
      move: context.move,
      positionAfter,
      mover: context.mover,
      beforeMaterial: context.beforeMaterial,
      afterMaterial: context.afterMaterial,
      enginePv: afterAnalysis.lines?.[0]?.pv || [],
      config: BRILLIANT_CONFIG,
    });
    let afterWhiteCp = getAnalysisWhiteCp(afterAnalysis);

    if (context.givesCheckmate) {
      afterWhiteCp = context.mover === "w" ? 10000 : -10000;
    }

    const afterMoverCp = scoreForSide(afterWhiteCp, context.mover);
    const loss = Math.max(0, Math.round(bestMoverCp - afterMoverCp));
    const classificationContext = {
      positionBefore,
      positionAfter,
      uci: context.uci,
      move: context.move,
      mover: context.mover,
      ply: context.ply,
      allMoves: context.allMoves,
      legalCount: context.legalCount,
      bestMove,
      loss,
      bestMoverCp,
      afterMoverCp,
      materialLoss: context.beforeMaterial - context.afterMaterial,
      materialBeforeCp: context.beforeMaterial,
      givesCheckmate: context.givesCheckmate,
      sacrifice,
      bestGap,
      playedRank,
      secondBestMoverCp: secondMoverCp,
      enginePv: afterAnalysis.lines?.[0]?.pv || [],
      isBookMove: isBookMove(context.allMoves, context.ply),
      gamePhase: getReviewGamePhase(positionBefore, context.ply, context.allMoves.length),
      playerElo: context.playerElo || REVIEW_DEFAULT_PLAYER_ELO,
    };
    const category = classifyReviewedMove(classificationContext);
    const reviewMove = {
      ply: context.ply,
      moveNumber: Math.floor((context.ply - 1) / 2) + 1,
      color: context.mover,
      uci: context.uci,
      san: context.move.san,
      from: context.move.from,
      to: context.move.to,
      category,
      symbol: REVIEW_CATEGORY_BY_ID[category]?.symbol || "",
      loss,
      accuracy: getMoveAccuracy(category, loss),
      bestMove,
      bestLine: beforeAnalysis.lines?.[0]?.pv || [],
      beforeWhiteCp: bestWhiteCp,
      afterWhiteCp,
      scoreDisplay: afterAnalysis.score?.display || "",
      phase: getReviewGamePhase(positionBefore, context.ply, context.allMoves.length),
      brilliant: classificationContext.brilliantResult || null,
      lineKey: context.lineKey || getLineKeyFromMoves(context.allMoves, context.ply),
    };

    if (!isAnalysisMoveReviewCurrent(context, requestId)) {
      return;
    }

    if (context.scope === "reviewVariation") {
      upsertReviewVariationMoveReview(reviewMove);
    } else {
      upsertAnalysisMoveReview(reviewMove);
    }
  } catch (error) {
    if (!isAnalysisMoveReviewCurrent(context, requestId)) {
      return;
    }

    state.feedback = {
      tone: "warn",
      text: `Commento mossa non disponibile: ${error.message}`,
    };
  } finally {
    if (isAnalysisMoveReviewCurrent(context, requestId)) {
      state.analysisMoveReviewPendingPly = null;
      state.analysisMoveReviewPendingUci = null;
      render();
    }
  }
}

function isAnalysisMoveReviewCurrent(context, requestId) {
  if (requestId !== analysisMoveReviewRequestId || state.view !== "analysis") {
    return false;
  }

  const history = game.history({ verbose: true });
  const move = history[context.ply - 1];
  if (!move || normalizeUci(moveToUci(move)) !== normalizeUci(context.uci)) {
    return false;
  }

  if (context.scope === "reviewVariation") {
    const currentKey = getCurrentLineKey();
    return isReviewActive() && (currentKey === context.lineKey || currentKey.startsWith(`${context.lineKey} `));
  }

  return !isReviewActive();
}

function trimAnalysisMoveReviewsToHistory() {
  const history = game.history({ verbose: true });
  const currentKeys = new Set(
    history.map((_move, index) => getLineKeyFromMoves(history.map(moveToUci), index + 1)),
  );
  state.analysisMoveReviews = state.analysisMoveReviews.filter(
    (move) => move.ply <= history.length && (!move.lineKey || currentKeys.has(move.lineKey)),
  );

  if (
    state.analysisMoveReviewPendingPly &&
    state.analysisMoveReviewPendingPly > history.length
  ) {
    state.analysisMoveReviewPendingPly = null;
    state.analysisMoveReviewPendingUci = null;
    analysisMoveReviewRequestId += 1;
  }
}

function classifyReviewedMove(context) {
  // Le valutazioni qui sono gia dal punto di vista del giocatore che muove.
  const evalDrop = Math.max(0, Number.isFinite(context.loss) ? context.loss : 0);
  const playerElo = Number.isFinite(context.playerElo) ? context.playerElo : REVIEW_DEFAULT_PLAYER_ELO;
  const bestMatch =
    context.bestMove && normalizeUci(context.bestMove) === normalizeUci(context.uci);
  const nearBest = evalDrop <= 10 || context.playedRank === 1 || bestMatch;
  const greatTolerance = getGreatToleranceCp(playerElo);
  const bookMove = context.isBookMove ?? isBookMove(context.allMoves, context.ply);
  const hasSacrifice = Boolean(context.sacrifice?.hasSacrifice ?? context.sacrifice);
  const onlyGoodMove =
    !hasSacrifice &&
    context.legalCount >= 2 &&
    (context.bestGap > 150 ||
      (Number.isFinite(context.secondBestMoverCp) &&
        context.bestMoverCp > -80 &&
        context.secondBestMoverCp < -180));
  const winningPositionCollapsed = context.bestMoverCp > 200 && context.afterMoverCp <= 50;
  const equalPositionCollapsed =
    context.bestMoverCp > -50 && context.bestMoverCp < 80 && context.afterMoverCp < -200;
  const catastrophicDrop = evalDrop > 250 || winningPositionCollapsed || equalPositionCollapsed;
  const missedTacticalOpportunity =
    context.missedTacticalOpportunity ||
    (!nearBest &&
      context.bestMoverCp >= 180 &&
      evalDrop >= 65 &&
      (context.bestGap >= 120 || context.bestMoverCp - context.afterMoverCp >= 150));

  if (bookMove) {
    return "da_libro";
  }

  if (context.givesCheckmate && !hasSacrifice) {
    return "migliore";
  }

  if (context.legalCount <= 1) {
    return "forzata";
  }

  const brilliantResult = classifyBrilliantMove({
    positionBefore: context.positionBefore,
    positionAfter: context.positionAfter,
    move: context.move,
    mover: context.mover,
    enginePv: context.enginePv || context.bestLine || [],
    playerRating: playerElo,
    gamePhase: context.gamePhase,
    evalBeforeCp: context.bestMoverCp,
    evalBestCp: context.bestMoverCp,
    evalPlayedCp: context.afterMoverCp,
    evalAfterBestReplyCp: context.afterBestReplyMoverCp ?? context.afterMoverCp,
    secondBestEvalCp: context.secondBestMoverCp,
    bestGapCp: context.bestGap,
    playedRank: context.playedRank,
    bestMatch,
    isBookMove: bookMove,
    materialBeforeCp: context.materialBeforeCp,
    givesCheckmate: context.givesCheckmate,
    sacrifice: context.sacrifice,
  });
  context.brilliantResult = brilliantResult;

  if (brilliantResult.isBrilliant) {
    return "geniale";
  }

  if (!hasSacrifice && onlyGoodMove && (bestMatch || evalDrop <= greatTolerance)) {
    return "grande";
  }

  if (context.givesCheckmate || bestMatch || evalDrop <= 10) {
    return "migliore";
  }

  if (catastrophicDrop) {
    return "errore_grave";
  }

  if (missedTacticalOpportunity) {
    return "mossa_mancata";
  }

  if (evalDrop <= 50) return "ottima";
  if (evalDrop <= 100) return "buona";
  if (evalDrop <= 150) return "imprecisione";
  if (evalDrop <= 250) return "errore";
  return "errore_grave";
}

function getGreatToleranceCp(playerElo) {
  if (playerElo < 1200) return 22;
  if (playerElo < 1800) return 16;
  return 10;
}

function getMoveAccuracy(category, loss) {
  if (["da_libro", "forzata", "geniale", "grande"].includes(category)) {
    return REVIEW_CATEGORY_BY_ID[category]?.weight || 100;
  }

  if (category === "mossa_mancata") {
    return 35;
  }

  const raw = 103.2 * Math.exp(-0.004 * Math.max(0, loss)) - 3.2;
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
}

function getReviewProfile(profileId = state.review.profile) {
  return REVIEW_PROFILES.find((profile) => profile.id === profileId) || REVIEW_PROFILES.find((profile) => profile.id === REVIEW_DEFAULT_PROFILE);
}

function getAnalysisLineWhiteCp(analysis, index = 0) {
  const score = analysis?.lines?.[index]?.score;
  return Number.isFinite(score?.whiteCp) ? Math.max(-10000, Math.min(10000, score.whiteCp)) : null;
}

function getPlayedMoveRank(analysis, uci) {
  const normalized = normalizeUci(uci);
  const index = (analysis?.lines || []).findIndex((line) => normalizeUci(line.pv?.[0]) === normalized);
  return index >= 0 ? index + 1 : null;
}

function isReviewSacrificeCandidate(positionAfterMove, move, mover, beforeMaterial, afterMaterial) {
  return detectMaterialSacrifice({
    positionAfter: positionAfterMove,
    move,
    mover,
    beforeMaterial,
    afterMaterial,
    config: BRILLIANT_CONFIG,
  }).hasSacrifice;
}

async function fetchPositionAnalysis(fen, multipv = 1, profileId = state.review.profile) {
  const profile = getReviewProfile(profileId);
  const response = await fetch("/api/engine/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fen,
      depth: profile.depth,
      multipv,
    }),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "analisi posizione non riuscita");
  }

  return result;
}

function getAnalysisWhiteCp(analysis) {
  const score = analysis?.score || analysis?.lines?.[0]?.score;
  if (!score) {
    return 0;
  }

  if (Number.isFinite(score.whiteCp)) {
    return Math.max(-10000, Math.min(10000, score.whiteCp));
  }

  return 0;
}

function scoreForSide(whiteCp, side) {
  return side === "w" ? whiteCp : -whiteCp;
}

function normalizeUci(uci) {
  return String(uci || "").slice(0, 5);
}

function isBookMove(moves, ply) {
  if (isBookMoveFromLine(moves, ply)) {
    return true;
  }

  const prefix = moves.slice(0, ply);
  return OPENINGS.some(
    (opening) =>
      opening.moves.length >= prefix.length &&
      prefix.every((move, index) => normalizeUci(opening.moves[index]) === normalizeUci(move)),
  );
}

function getMaterialBalanceForSide(position, side) {
  const board = position.board();
  let white = 0;
  let black = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] || 0;
      if (piece.color === "w") white += value;
      else black += value;
    }
  }

  return side === "w" ? white - black : black - white;
}

function createEmptyReviewCounts() {
  return Object.fromEntries(REVIEW_CATEGORIES.map((category) => [category.id, 0]));
}

function createPhaseBuckets() {
  return {
    opening: { w: [], b: [] },
    middlegame: { w: [], b: [] },
    endgame: { w: [], b: [] },
  };
}

function getReviewPlayerElo(record, side) {
  const sideElo = record.playerElo?.[side];
  const directElo = side === record.humanSide ? record.humanElo : side === record.botSide ? record.botElo : null;
  const value = Number.isFinite(sideElo) ? sideElo : directElo;
  return Number.isFinite(value) ? value : REVIEW_DEFAULT_PLAYER_ELO;
}

function getMovePhase(ply, totalPly) {
  if (ply <= 12) return "opening";
  if (totalPly >= 30 && ply > totalPly - 12) return "endgame";
  return "middlegame";
}

function getReviewGamePhase(positionBefore, ply, totalPly) {
  if (isEndgamePosition(positionBefore, BRILLIANT_CONFIG)) {
    return "endgame";
  }

  return getMovePhase(ply, totalPly);
}

function summarizePhaseBuckets(phases) {
  const result = {};
  for (const [phase, sides] of Object.entries(phases)) {
    result[phase] = {
      accuracy: {
        w: average(sides.w),
        b: average(sides.b),
      },
      label: {
        w: describePhaseAccuracy(average(sides.w)),
        b: describePhaseAccuracy(average(sides.b)),
      },
    };
  }
  return result;
}

function describePhaseAccuracy(value) {
  if (!Number.isFinite(value)) return "-";
  if (value >= 96) return "Migliore";
  if (value >= 90) return "Ottima";
  if (value >= 78) return "Buona";
  if (value >= 62) return "Imprecisione";
  if (value >= 40) return "Errore";
  return "Errore grave";
}

function isPositionCheckmate(position) {
  if (!position) {
    return false;
  }

  if (typeof position.isCheckmate === "function") {
    return position.isCheckmate();
  }

  if (typeof position.in_checkmate === "function") {
    return position.in_checkmate();
  }

  return false;
}

function average(values) {
  if (!values.length) {
    return null;
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function estimatePerformanceElo(accuracy, averageLoss, referenceElo = null) {
  if (!Number.isFinite(accuracy)) {
    return "--";
  }

  const boundedAccuracy = Math.max(0, Math.min(100, accuracy));
  const accuracyElo = 420 + Math.pow(boundedAccuracy / 100, 1.85) * 2580;
  const lossPenalty = Number.isFinite(averageLoss)
    ? Math.min(950, Math.max(0, averageLoss) * 4.2)
    : 0;
  let estimate = accuracyElo - lossPenalty;

  if (Number.isFinite(referenceElo)) {
    estimate = estimate * 0.78 + referenceElo * 0.22;
  }

  const floor = Number.isFinite(referenceElo)
    ? Math.max(450, Math.min(referenceElo - 650, 900))
    : 450;

  return Math.max(floor, Math.min(3000, Math.round(estimate / 10) * 10));
}

function getActiveReviewRecord() {
  if (state.review.record?.id === state.review.activeGameId) {
    return state.review.record;
  }

  return state.savedGames.find((record) => record.id === state.review.activeGameId) || null;
}

function isReviewResultCurrent(review) {
  return Boolean(
    review?.moves?.length &&
      review.classificationVersion === REVIEW_CLASSIFICATION_VERSION,
  );
}

function getReviewMoveByPly(ply) {
  if (!isReviewActive()) {
    return getAnalysisMoveReviewByPly(ply);
  }

  const record = getActiveReviewRecord();
  if (!isReviewResultCurrent(record?.review)) {
    return null;
  }

  return record.review.moves.find((move) => move.ply === ply) || null;
}

function getCurrentReviewMove() {
  if (!isReviewActive() || state.review.cursor <= 0) {
    return null;
  }

  if (state.review.mode === "variation") {
    return getCurrentReviewVariationMove();
  }

  return getReviewMoveByPly(state.review.cursor);
}

function getCurrentReviewVariationMove() {
  const lineKey = getCurrentLineKey();
  return state.review.variationMoveReviews.find((move) => move.lineKey === lineKey) || null;
}

function upsertReviewVariationMoveReview(reviewMove) {
  const reviews = state.review.variationMoveReviews || [];
  const index = reviews.findIndex((item) => item.lineKey === reviewMove.lineKey);

  if (index >= 0) {
    reviews[index] = reviewMove;
  } else {
    reviews.push(reviewMove);
  }

  state.review.variationMoveReviews = reviews;
}

function getCurrentLineKey() {
  return game.history({ verbose: true }).map(moveToUci).map(normalizeUci).join(" ");
}

function getLineKeyForPly(ply) {
  return getLineKeyFromMoves(game.history({ verbose: true }).map(moveToUci), ply);
}

function getLineKeyFromMoves(moves, ply = moves.length) {
  return moves.slice(0, ply).map(normalizeUci).join(" ");
}

function upsertAnalysisMoveReview(reviewMove) {
  const index = state.analysisMoveReviews.findIndex(
    (item) => item.ply === reviewMove.ply && item.lineKey === reviewMove.lineKey,
  );

  if (index >= 0) {
    state.analysisMoveReviews[index] = reviewMove;
  } else {
    state.analysisMoveReviews.push(reviewMove);
  }
}

function getCurrentMoveJudgment() {
  if (state.view !== "analysis" || !state.analysisSettings.analysisEnabled || !state.analysisSettings.moveComments) {
    return null;
  }

  if (isReviewActive()) {
    return getCurrentReviewMove();
  }

  const history = game.history({ verbose: true });
  return getAnalysisMoveReviewByPly(history.length);
}

function getAnalysisMoveReviewByPly(ply) {
  if (isReviewActive() || ply <= 0) {
    return null;
  }

  const move = game.history({ verbose: true })[ply - 1];
  const lineKey = getLineKeyForPly(ply);
  const reviewMove =
    state.analysisMoveReviews.find(
      (item) => item.ply === ply && item.lineKey === lineKey,
    ) ||
    state.analysisMoveReviews.find(
      (item) => item.ply === ply && normalizeUci(item.uci) === normalizeUci(moveToUci(move || {})),
    ) ||
    null;

  if (!reviewMove || !move) {
    return null;
  }

  return normalizeUci(reviewMove.uci) === normalizeUci(moveToUci(move)) ? reviewMove : null;
}

function formatAccuracy(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "--";
}

function scoreToChartPercent(whiteCp) {
  const clamped = Math.max(-1000, Math.min(1000, Number.isFinite(whiteCp) ? whiteCp : 0));
  return 50 + (clamped / 1000) * 44;
}

async function requestPlayHint() {
  if (!state.play.started || state.play.hintThinking || state.play.botThinking || !state.engine.available) {
    return;
  }

  const fen = game.fen();
  state.play.hintThinking = true;
  state.feedback = {
    tone: "",
    text: "Stockfish sta cercando il suggerimento migliore...",
  };
  render();

  try {
    const response = await fetch("/api/engine/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fen,
        depth: 14,
        multipv: 1,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "suggerimento non riuscito");
    }

    if (state.view !== "play" || !state.play.started || game.fen() !== fen) {
      return;
    }

    const bestMove = result.bestmove || result.lines?.[0]?.pv?.[0];
    if (!bestMove) {
      throw new Error("Stockfish non ha restituito una mossa");
    }

    const from = bestMove.slice(0, 2);
    const to = bestMove.slice(2, 4);
    state.arrows = [{ from, to, color: "blue", engine: true }];
    state.feedback = {
      tone: "ok",
      text: `Suggerimento: ${formatPvLine([bestMove], fen, 1)}.`,
    };
  } catch (error) {
    state.feedback = {
      tone: "error",
      text: `Errore suggerimento: ${error.message}`,
    };
  } finally {
    state.play.hintThinking = false;
    render();
  }
}

function enterAnalysis() {
  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  stopClockTicker();
  state.view = "analysis";
  state.openingId = null;
  state.progress = 0;
  game = new ChessEngine();
  state.lastMove = null;
  state.redoMoves = [];
  state.play.started = false;
  state.play.premoves = [];
  state.currentGameId = null;
  clearReviewState();
  clearAnalysisMoveReviewState();
  resetAnalysisLine();
  state.analysisSettingsOpen = false;
  clearOpeningBookContext();
  state.engine.lines = [];
  state.engine.score = null;
  state.engine.bestmove = null;
  state.engine.fen = null;
  state.feedback = {
    tone: "",
    text: "Analisi libera pronta. Stockfish suggerira le mosse migliori.",
  };
  clearSelection();
  clearArrows();
  render();
  queueEngineAnalysis();
}

function startOpening(openingId) {
  const opening = OPENINGS.find((item) => item.id === openingId);
  if (!opening) {
    return;
  }

  const study = getOpeningStudy(openingId);
  if (study) {
    startOpeningStudy(openingId);
    return;
  }

  cancelOpeningStudyAnimation();
  state.view = "trainer";
  state.openingId = openingId;
  state.openingStudy = {
    selectedVariantId: null,
    mode: "choose",
    introPlaying: false,
    introProgress: 0,
  };
  state.orientation = state.trainerSide === "b" ? "b" : "w";
  clearOpeningBookContext();
  resetTraining(false);
}

function startOpeningStudy(openingId) {
  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  stopClockTicker();
  state.view = "trainer";
  state.openingId = openingId;
  state.orientation = "w";
  state.progress = 0;
  state.redoMoves = [];
  state.openingStudy = {
    selectedVariantId: null,
    mode: "choose",
    introPlaying: false,
    introProgress: 0,
  };
  clearReviewState();
  clearAnalysisMoveReviewState();
  resetAnalysisLine();
  clearOpeningBookContext();
  clearSelection();
  clearArrows();
  playOpeningStudyIntro();
}

function resetTraining(shouldRender = true) {
  const study = getCurrentOpeningStudy();
  if (study) {
    resetOpeningStudy(shouldRender);
    return;
  }

  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  game = new ChessEngine();
  state.progress = 0;
  state.lastMove = null;
  state.redoMoves = [];
  clearOpeningBookContext();
  state.feedback = {
    tone: "",
    text: "Segui la mossa evidenziata nella linea.",
  };
  clearSelection();
  clearArrows();
  autoPlayOpponentMoves();
  render();
}

function resetOpeningStudy(shouldRender = true) {
  const study = getCurrentOpeningStudy();
  if (!study) {
    return;
  }

  cancelPendingBotMove();
  cancelOpeningStudyAnimation();
  state.progress = 0;
  state.redoMoves = [];
  clearSelection();
  clearArrows();

  if (!state.openingStudy.selectedVariantId) {
    playOpeningStudyIntro();
    return;
  }

  setupOpeningStudyIntroPosition(study);
  autoPlayStudyOpponentMoves();
  state.feedback = {
    tone: "",
    text: "Variante pronta: segui la mossa suggerita e osserva il piano.",
  };

  if (shouldRender) {
    render();
  }
}

function playOpeningStudyIntro() {
  const study = getCurrentOpeningStudy();
  if (!study) {
    return;
  }

  cancelOpeningStudyAnimation();
  const runId = ++openingStudyRunId;
  game = new ChessEngine();
  state.progress = 0;
  state.lastMove = null;
  state.redoMoves = [];
  state.openingStudy.selectedVariantId = null;
  state.openingStudy.mode = "choose";
  state.openingStudy.introPlaying = true;
  state.openingStudy.introProgress = 0;
  state.feedback = {
    tone: "",
    text: "Costruzione della posizione base: una mossa al secondo.",
  };
  clearSelection();
  clearArrows();
  render();

  const playNext = () => {
    if (runId !== openingStudyRunId || state.view !== "trainer" || state.openingId !== study.id) {
      return;
    }

    const uci = study.introMoves[state.openingStudy.introProgress];
    if (!uci) {
      state.openingStudy.introPlaying = false;
      state.feedback = {
        tone: "ok",
        text: "Posizione base raggiunta. Scegli una variante da studiare.",
      };
      render();
      return;
    }

    const move = playUci(uci);
    if (!move) {
      state.openingStudy.introPlaying = false;
      state.feedback = {
        tone: "error",
        text: "La sequenza introduttiva contiene una mossa non valida.",
      };
      render();
      return;
    }

    state.openingStudy.introProgress += 1;
    state.lastMove = { from: move.from, to: move.to };
    queueMoveAnimation(move, { force: true });
    state.feedback = {
      tone: "",
      text: `Introduzione: ${move.san}.`,
    };
    render();
    openingStudyTimer = window.setTimeout(playNext, 1000);
  };

  openingStudyTimer = window.setTimeout(playNext, 650);
}

function setupOpeningStudyIntroPosition(study = getCurrentOpeningStudy()) {
  game = new ChessEngine();

  for (const uci of study.introMoves) {
    const move = playUci(uci);
    if (!move) {
      break;
    }
    state.lastMove = { from: move.from, to: move.to };
  }

  state.openingStudy.introPlaying = false;
  state.openingStudy.introProgress = study.introMoves.length;
}

function selectStudyVariant(variantId) {
  const study = getCurrentOpeningStudy();
  const variant = study?.variants.find((item) => item.id === variantId);

  if (!study || !variant) {
    return;
  }

  cancelOpeningStudyAnimation();
  state.openingStudy.selectedVariantId = variant.id;
  state.openingStudy.mode = "guide";
  state.progress = 0;
  state.redoMoves = [];
  setupOpeningStudyIntroPosition(study);
  autoPlayStudyOpponentMoves();
  state.feedback = {
    tone: "ok",
    text: `Variante selezionata: ${variant.name}.`,
  };
  clearSelection();
  clearArrows();
  render();
}

function handleSquareClick(square) {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  if (!isBoardInteractive()) {
    return;
  }

  if (state.view === "trainer" && !canUserMoveNow()) {
    const study = getCurrentOpeningStudy();
    if (study) {
      state.feedback = {
        tone: "warn",
        text: state.openingStudy.introPlaying
          ? "Attendi la fine dell'introduzione automatica."
          : getCurrentStudyVariant()
            ? "In questo momento la prossima mossa della variante e automatica per il lato opposto."
            : "Scegli prima una variante da studiare.",
      };
      autoPlayStudyOpponentMoves();
      render();
      return;
    }

    state.feedback = {
      tone: "warn",
      text: "In questa modalita la prossima mossa e automatica per il lato opposto.",
    };
    clearRedoMoves();
    autoPlayOpponentMoves();
    render();
    return;
  }

  if (state.view === "play" && !canPlayHumanMoveNow()) {
    if (isPremoveContext()) {
      handlePremoveSquareClick(square);
      return;
    }

    state.feedback = {
      tone: "warn",
      text: state.play.botThinking ? "Attendi la mossa del bot." : "Tocca al bot.",
    };
    render();
    queueBotMove();
    return;
  }

  const piece = game.get(square);

  if (!state.selected) {
    if (piece && piece.color === game.turn()) {
      selectSquare(square);
      render();
    }
    return;
  }

  if (state.selected === square) {
    clearSelection();
    render();
    return;
  }

  if (piece && piece.color === game.turn()) {
    selectSquare(square);
    render();
    return;
  }

  attemptMove(state.selected, square);
}

function selectSquare(square) {
  state.selected = square;
  refreshSelectionTargets();
}

function refreshSelectionTargets() {
  if (!state.selected || !shouldShowLegalMoveTargets()) {
    state.targets = [];
    return;
  }

  try {
    state.targets = isPremoveContext()
      ? getPremoveTargets(state.selected)
      : game
          .moves({ square: state.selected, verbose: true })
          .map((move) => move.to);
  } catch (_error) {
    state.targets = [];
  }
}

function shouldShowLegalMoveTargets() {
  if (state.view === "play") {
    return Boolean(state.play.analysisSettings.showLegalMoves);
  }

  if (state.view === "analysis") {
    return Boolean(state.analysisSettings.showLegalMoves);
  }

  return true;
}

function clearSelection() {
  state.selected = null;
  state.targets = [];
  state.dragFrom = null;
  state.dragOver = null;
}

function clearArrows() {
  state.arrows = [];
  state.arrowDraft = null;
}

function clearRedoMoves() {
  state.redoMoves = [];
}

function cancelPendingBotMove() {
  botMoveRequestId += 1;
  state.play.botThinking = false;
}

function cancelOpeningStudyAnimation() {
  openingStudyRunId += 1;
  window.clearTimeout(openingStudyTimer);
  openingStudyTimer = null;
  state.openingStudy.introPlaying = false;
}

function attemptMove(from, to, options = {}) {
  if (state.view === "play" && state.play.result) {
    return;
  }

  if (isPremoveContext()) {
    queuePremove(from, to);
    return;
  }

  const beforeMovesForAnalysis =
    state.view === "analysis" ? game.history({ verbose: true }).map(moveToUci) : [];
  const hadRedoBeforeMove = state.redoMoves.length > 0;
  const shouldReviewAnalysisMove = state.view === "analysis";
  const analysisMoveContext = shouldReviewAnalysisMove
    ? {
        beforeFen: game.fen(),
        mover: game.turn(),
        legalCount: game.moves().length,
        beforeMaterial: getMaterialBalanceForSide(game, game.turn()),
      }
    : null;
  const move = safeMove(from, to);

  if (!move) {
    state.feedback = {
      tone: "warn",
      text: "Mossa non legale dalla posizione corrente.",
    };
    clearSelection();
    render();
    return;
  }

  if (state.view === "trainer") {
    handleTrainingMove(move);
    return;
  }

  let reviewMoveResult = null;
  if (isReviewActive()) {
    reviewMoveResult = handleReviewMove(move);
  } else {
    recordAnalysisLineMove(move, beforeMovesForAnalysis, hadRedoBeforeMove);
    clearRedoMoves();
  }

  if (analysisMoveContext && (!isReviewActive() || reviewMoveResult?.variation)) {
    const history = game.history({ verbose: true });
    const uci = moveToUci(move);
    const afterMaterial = getMaterialBalanceForSide(game, analysisMoveContext.mover);
    queueAnalysisMoveReview({
      ...analysisMoveContext,
      scope: isReviewActive() ? "reviewVariation" : "analysis",
      move,
      uci,
      ply: history.length,
      allMoves: history.map(moveToUci),
      lineKey: history.map(moveToUci).map(normalizeUci).join(" "),
      afterFen: game.fen(),
      afterMaterial,
      givesCheckmate: isPositionCheckmate(game),
      sacrifice: isReviewSacrificeCandidate(
        game,
        move,
        analysisMoveContext.mover,
        analysisMoveContext.beforeMaterial,
        afterMaterial,
      ),
    });
  }

  if (options.animate !== false) {
    queueMoveAnimation(move, { force: true });
  }
  state.lastMove = { from: move.from, to: move.to };
  state.feedback = {
    tone: "ok",
    text: `Mossa giocata: ${move.san}`,
  };
  clearSelection();

  if (state.view === "play" && state.play.started) {
    switchClockSide();
    updateCurrentGameRecord();
    if (checkAndApplyGameOver()) {
      render();
      return;
    }
  }

  render();
  queueEngineAnalysis();
  queueBotMove();
}

function handleTrainingMove(move) {
  if (getCurrentOpeningStudy()) {
    handleStudyTrainingMove(move);
    return;
  }

  const opening = getCurrentOpening();
  const expected = opening.moves[state.progress];
  const played = moveToUci(move);

  if (played !== expected) {
    game.undo();
    state.feedback = {
      tone: "warn",
      text: `Quasi: la mossa attesa e ${formatExpectedMove(opening, state.progress)}.`,
    };
    clearSelection();
    render();
    return;
  }

  clearRedoMoves();
  queueMoveAnimation(move, { force: true });
  state.progress += 1;
  state.lastMove = { from: move.from, to: move.to };
  state.feedback = {
    tone: "ok",
    text: `Corretto: ${move.san}`,
  };
  clearSelection();
  autoPlayOpponentMoves();

  if (state.progress >= opening.moves.length) {
    state.feedback = {
      tone: "ok",
      text: `Linea completata: ${opening.name}.`,
    };
  }

  render();
}

function handleStudyTrainingMove(move) {
  const variant = getCurrentStudyVariant();
  const moves = getStudyTrainingMoves();
  const expected = moves[state.progress];
  const played = moveToUci(move);

  if (!variant || !expected) {
    state.feedback = {
      tone: "warn",
      text: "Scegli una variante prima di allenarti.",
    };
    game.undo();
    render();
    return;
  }

  if (played !== expected) {
    game.undo();
    state.feedback = {
      tone: "warn",
      text: `Quasi: nella variante ${variant.name} la mossa attesa e ${formatStudyExpectedMove(variant, state.progress)}.`,
    };
    clearSelection();
    render();
    return;
  }

  clearRedoMoves();
  queueMoveAnimation(move, { force: true });
  state.progress += 1;
  state.lastMove = { from: move.from, to: move.to };
  state.feedback = {
    tone: "ok",
    text: `Corretto: ${move.san}.`,
  };
  clearSelection();
  autoPlayStudyOpponentMoves();

  if (state.progress >= moves.length) {
    state.feedback = {
      tone: "ok",
      text: `Linea completata: ${variant.name}.`,
    };
  }

  render();
}

function autoPlayOpponentMoves() {
  if (getCurrentOpeningStudy()) {
    autoPlayStudyOpponentMoves();
    return;
  }

  if (state.view !== "trainer" || state.trainerSide === "both") {
    return;
  }

  const opening = getCurrentOpening();
  if (!opening) {
    return;
  }

  while (state.progress < opening.moves.length && game.turn() !== state.trainerSide) {
    const expected = opening.moves[state.progress];
    const move = playUci(expected);
    if (!move) {
      state.feedback = {
        tone: "error",
        text: "La linea contiene una mossa non valida. Controlla i dati dell'apertura.",
      };
      return;
    }
    state.progress += 1;
    state.lastMove = { from: move.from, to: move.to };
    queueMoveAnimation(move);
  }
}

function autoPlayStudyOpponentMoves() {
  const moves = getStudyTrainingMoves();

  if (
    state.view !== "trainer" ||
    !getCurrentOpeningStudy() ||
    !getCurrentStudyVariant() ||
    state.trainerSide === "both"
  ) {
    return;
  }

  while (state.progress < moves.length && game.turn() !== state.trainerSide) {
    const expected = moves[state.progress];
    const move = playUci(expected);

    if (!move) {
      state.feedback = {
        tone: "error",
        text: "La variante contiene una mossa non valida. Controlla i dati della linea.",
      };
      return;
    }

    state.progress += 1;
    state.lastMove = { from: move.from, to: move.to };
    queueMoveAnimation(move, { force: true });
  }
}

async function queueBotMove() {
  if (
    state.view !== "play" ||
    !state.play.started ||
    state.play.botThinking ||
    state.play.result ||
    game.turn() !== state.play.botSide ||
    isGameFinished()
  ) {
    return;
  }

  if (!state.engine.available) {
    state.feedback = {
      tone: state.engine.status === "loading" ? "" : "error",
      text:
        state.engine.status === "loading"
          ? "Sto collegando Stockfish prima della mossa del bot..."
          : "Stockfish non disponibile: il bot non puo rispondere.",
    };
    render();
    return;
  }

  const requestId = ++botMoveRequestId;
  const fen = game.fen();
  const startedAt = Date.now();

  state.play.botThinking = true;
  state.feedback = {
    tone: "",
    text: `Stockfish ${state.play.botElo} Elo sta pensando...`,
  };
  render();

  try {
    const response = await fetch("/api/engine/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fen,
        elo: state.play.botElo,
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "mossa del bot non riuscita");
    }

    await delay(Math.max(0, BOT_MIN_THINK_MS - (Date.now() - startedAt)));

    if (
      requestId !== botMoveRequestId ||
      state.view !== "play" ||
      state.play.result ||
      game.fen() !== fen
    ) {
      return;
    }

    const move = playUci(result.move);

    if (!move) {
      throw new Error("Stockfish ha restituito una mossa non valida");
    }

    queueMoveAnimation(move, { force: true });
    state.lastMove = { from: move.from, to: move.to };
    state.feedback = {
      tone: "ok",
      text: `Stockfish ${result.elo} Elo ha giocato: ${move.san}.`,
    };
    if (dragState) {
      refreshSelectionTargets();
    } else {
      clearSelection();
    }

    switchClockSide();
    updateCurrentGameRecord();
    if (checkAndApplyGameOver()) {
      return;
    }
    playNextPremove();
    queueEngineAnalysis();
  } catch (error) {
    if (requestId !== botMoveRequestId) {
      return;
    }

    state.feedback = {
      tone: "error",
      text: `Errore bot: ${error.message}`,
    };
  } finally {
    if (requestId === botMoveRequestId) {
      state.play.botThinking = false;
      render();
    }
  }
}

function canPlayHumanMoveNow() {
  return (
    state.view !== "play" ||
    (state.play.started &&
      !state.play.result &&
      !state.play.botThinking &&
      game.turn() !== state.play.botSide)
  );
}

function isPremoveContext() {
  return (
    state.view === "play" &&
    state.play.started &&
    !state.play.result &&
    (state.play.botThinking || game.turn() === state.play.botSide)
  );
}

function handlePremoveSquareClick(square) {
  const piece = game.get(square);

  if (!state.selected) {
    if (piece && piece.color === state.play.humanSide) {
      selectSquare(square);
      state.feedback = {
        tone: "",
        text: "Scegli la casa di arrivo per inserire la premove.",
      };
      render();
    }
    return;
  }

  if (state.selected === square) {
    clearSelection();
    render();
    return;
  }

  if (piece && piece.color === state.play.humanSide) {
    selectSquare(square);
    render();
    return;
  }

  queuePremove(state.selected, square);
}

function queuePremove(from, to) {
  const move = getLegalPremove(from, to);

  if (!move) {
    state.feedback = {
      tone: "warn",
      text: "Questa premove non sarebbe legale dalla posizione attuale.",
    };
    clearSelection();
    render();
    return false;
  }

  state.play.premoves.push({ from, to, promotion: move.promotion || "q" });
  state.feedback = {
    tone: "",
    text: `Premove inserita: ${move.san}.`,
  };
  clearSelection();
  render();
  return true;
}

function playNextPremove() {
  if (
    !state.play.premoves.length ||
    state.view !== "play" ||
    !state.play.started ||
    state.play.result ||
    game.turn() === state.play.botSide
  ) {
    return false;
  }

  while (state.play.premoves.length) {
    const premove = state.play.premoves.shift();
    const move = safeMove(premove.from, premove.to);

    if (!move) {
      continue;
    }

    queueMoveAnimation(move, { force: true });
    state.lastMove = { from: move.from, to: move.to };
    state.feedback = {
      tone: "ok",
      text: `Premove giocata: ${move.san}.`,
    };
    clearSelection();
    switchClockSide();
    updateCurrentGameRecord();

    if (!checkAndApplyGameOver()) {
      window.setTimeout(queueBotMove, 0);
    }
    return true;
  }

  render();
  return false;
}

function getPremoveTargets(square) {
  return getPremoveMoves(square).map((move) => move.to);
}

function getLegalPremove(from, to) {
  return getPremoveMoves(from).find((move) => move.to === to) || null;
}

function getPremoveMoves(square) {
  const piece = game.get(square);
  if (!piece || piece.color !== state.play.humanSide) {
    return [];
  }

  const preview = createPremovePreview();
  try {
    return preview.moves({ square, verbose: true });
  } catch (_error) {
    return [];
  }
}

function createPremovePreview() {
  const parts = game.fen().split(" ");
  parts[1] = state.play.humanSide;
  return new ChessEngine(parts.join(" "));
}

function isPremoveSquare(square) {
  return state.play.premoves.some((move) => move.from === square || move.to === square);
}

function canUserMoveNow() {
  if (state.view !== "trainer") {
    return true;
  }

  const study = getCurrentOpeningStudy();
  if (study) {
    const moves = getStudyTrainingMoves();
    if (state.openingStudy.introPlaying || !getCurrentStudyVariant() || state.progress >= moves.length) {
      return false;
    }

    return state.trainerSide === "both" || game.turn() === state.trainerSide;
  }

  if (state.progress >= getCurrentOpening().moves.length) {
    return false;
  }

  return state.trainerSide === "both" || game.turn() === state.trainerSide;
}

function isGameFinished() {
  if (typeof game.isGameOver === "function") {
    return game.isGameOver();
  }

  if (typeof game.game_over === "function") {
    return game.game_over();
  }

  return false;
}

function isBoardInteractive() {
  return ["home", "play", "trainer", "analysis"].includes(state.view);
}

function safeMove(from, to) {
  try {
    return game.move({ from, to, promotion: "q" });
  } catch (_error) {
    return null;
  }
}

function playUci(uci) {
  try {
    return game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || "q",
    });
  } catch (_error) {
    return null;
  }
}

function moveToUci(move) {
  return `${move.from}${move.to}${move.promotion || ""}`;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function syncLastMoveFromHistory() {
  const history = game.history({ verbose: true });
  const last = history.at(-1);
  state.lastMove = last ? { from: last.from, to: last.to } : null;
}

function getEngineSuggestionArrows() {
  if (
    !shouldRunEngineAnalysis() ||
    !getActiveAnalysisSettings().suggestionArrows ||
    !["ready", "analyzing"].includes(state.engine.status)
  ) {
    return [];
  }

  const suggestedMove = state.engine.bestmove || state.engine.lines[0]?.pv?.[0];

  if (!suggestedMove) {
    return [];
  }

  const from = suggestedMove.slice(0, 2);
  const to = suggestedMove.slice(2, 4);

  if (!from || !to || from === to) {
    return [];
  }

  return [{ from, to, color: "blue", engine: true }];
}

function formatPvLine(pv, fen = game.fen(), limit = 6) {
  if (!Array.isArray(pv) || !pv.length) {
    return "--";
  }

  const preview = new ChessEngine(fen);
  const sanMoves = [];

  for (const uci of pv.slice(0, limit)) {
    const move = playPreviewMove(preview, uci);

    if (!move) {
      break;
    }

    sanMoves.push(move.san);
  }

  return sanMoves.length ? sanMoves.join(" ") : pv[0];
}

function getFamilies() {
  return ["Tutte", ...new Set(OPENINGS.map((opening) => opening.family))];
}

function getFilteredOpenings() {
  const query = state.search.trim().toLowerCase();
  return OPENINGS.filter((opening) => {
    const matchesFamily = state.family === "Tutte" || opening.family === state.family;
    const haystack = `${opening.name} ${opening.eco} ${opening.family} ${opening.focus}`.toLowerCase();
    return matchesFamily && (!query || haystack.includes(query));
  });
}

function getCurrentOpening() {
  return OPENINGS.find((opening) => opening.id === state.openingId);
}

function getOpeningStudy(openingId) {
  return OPENING_STUDIES[openingId] || null;
}

function getCurrentOpeningStudy() {
  return getOpeningStudy(state.openingId);
}

function getSelectedStudyVariant(study = getCurrentOpeningStudy()) {
  if (!study || !state.openingStudy.selectedVariantId) {
    return null;
  }

  return study.variants.find((variant) => variant.id === state.openingStudy.selectedVariantId) || null;
}

function getCurrentStudyVariant() {
  return getSelectedStudyVariant();
}

function getStudyTrainingMoves() {
  return getCurrentStudyVariant()?.moves || [];
}

function getMoveDescriptors(opening) {
  const previewGame = new ChessEngine();
  return opening.moves.map((uci, index) => {
    const move = playPreviewMove(previewGame, uci);
    return {
      uci,
      san: move ? move.san : uci,
      color: move ? move.color : index % 2 === 0 ? "w" : "b",
      moveNumber: Math.floor(index / 2) + 1,
    };
  });
}

function getMoveDescriptorsFromUci(moves, startPosition = null) {
  const previewGame =
    startPosition instanceof ChessEngine
      ? new ChessEngine(startPosition.fen())
      : typeof startPosition === "string"
        ? new ChessEngine(startPosition)
        : new ChessEngine();

  return moves.map((uci, index) => {
    const beforePly = previewGame.history().length;
    const move = playPreviewMove(previewGame, uci);
    return {
      uci,
      san: move ? move.san : uci,
      color: move ? move.color : index % 2 === 0 ? "w" : "b",
      moveNumber: Math.floor(beforePly / 2) + 1,
    };
  });
}

function getOpeningStudyIntroPosition(study = getCurrentOpeningStudy()) {
  const preview = new ChessEngine();

  for (const uci of study?.introMoves || []) {
    if (!playPreviewMove(preview, uci)) {
      break;
    }
  }

  return preview;
}

function getCurrentStudyMoveDescriptor(variant = getCurrentStudyVariant()) {
  if (!variant) {
    return null;
  }

  const descriptors = getMoveDescriptorsFromUci(variant.moves, getOpeningStudyIntroPosition());
  return descriptors[state.progress] || null;
}

function getStudyGuidanceForMove(variant, uci) {
  return variant.guidance?.find((item) => normalizeUci(item.move) === normalizeUci(uci)) || null;
}

function getOpeningStudyProgressText(study, variant) {
  if (state.openingStudy.introPlaying) {
    return `Costruzione posizione: ${state.openingStudy.introProgress}/${study.introMoves.length}.`;
  }

  if (!variant) {
    return "Posizione base pronta: scegli una variante nella colonna a destra.";
  }

  if (state.progress >= variant.moves.length) {
    return "Linea completata: ripassa i piani o scegli un'altra variante.";
  }

  return `Mossa ${state.progress + 1}/${variant.moves.length} della variante ${variant.name}.`;
}

function formatStudyExpectedMove(variant, index) {
  const descriptor = getMoveDescriptorsFromUci(variant.moves, getOpeningStudyIntroPosition())[index];
  return descriptor ? descriptor.san : variant.moves[index];
}

function playPreviewMove(previewGame, uci) {
  try {
    return previewGame.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.slice(4) || "q",
    });
  } catch (_error) {
    return null;
  }
}

function describeLine(opening) {
  const descriptors = getMoveDescriptors(opening);
  return descriptors
    .map((move, index) => {
      const prefix = move.color === "w" ? `${Math.floor(index / 2) + 1}. ` : "";
      return `${prefix}${move.san}`;
    })
    .join(" ");
}

function formatMovePrompt(move) {
  if (!move) {
    return "linea completata";
  }
  const side = move.color === "w" ? "Bianco" : "Nero";
  return `${side} ${move.san}`;
}

function formatExpectedMove(opening, index) {
  const descriptor = getMoveDescriptors(opening)[index];
  return descriptor ? descriptor.san : opening.moves[index];
}

function getFilesForOrientation() {
  return state.orientation === "w" ? FILES : [...FILES].reverse();
}

function getRanksForOrientation() {
  return state.orientation === "w" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
}

function getSquareCenter(square) {
  const file = square[0];
  const rank = Number(square[1]);
  const files = getFilesForOrientation();
  const ranks = getRanksForOrientation();
  const fileIndex = files.indexOf(file);
  const rankIndex = ranks.indexOf(rank);

  return {
    x: (fileIndex + 0.5) * 12.5,
    y: (rankIndex + 0.5) * 12.5,
  };
}

function getArrowGeometry(fromSquare, toSquare) {
  const from = getSquareCenter(fromSquare);
  const to = getSquareCenter(toSquare);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);

  if (!length) {
    return null;
  }

  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const startShrink = 1.1;
  const tipShrink = 1.8;
  const headLength = 3.8;
  const headWidth = 4.2;
  const tip = {
    x: to.x - unitX * tipShrink,
    y: to.y - unitY * tipShrink,
  };
  const start = {
    x: from.x + unitX * startShrink,
    y: from.y + unitY * startShrink,
  };
  const base = {
    x: tip.x - unitX * headLength,
    y: tip.y - unitY * headLength,
  };
  const halfHead = headWidth / 2;
  const left = {
    x: base.x + normalX * halfHead,
    y: base.y + normalY * halfHead,
  };
  const right = {
    x: base.x - normalX * halfHead,
    y: base.y - normalY * halfHead,
  };

  return {
    start,
    lineEnd: base,
    headPoints: `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`,
  };
}

function getArrowColor(event) {
  if (event.altKey) {
    return "red";
  }

  if (event.ctrlKey || event.metaKey) {
    return "blue";
  }

  if (event.shiftKey) {
    return "yellow";
  }

  return "green";
}

function getArrowColorValue(color = "green") {
  const colors = {
    green: "#77b85f",
    red: "#df5b55",
    blue: "#4fa3d9",
    yellow: "#f2ad23",
  };

  return colors[color] || colors.green;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
