import http from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = "127.0.0.1";
const stockfishPath = path.join(root, "stockfish 18", "stockfish-windows-x86-64-avx2.exe");
const stockfishName = "Stockfish 18";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".tsv": "text/tab-separated-values; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (request, response) => {
  let requestUrl;

  try {
    requestUrl = new URL(request.url || "/", `http://${host}:${port}`);

    if (requestUrl.pathname === "/api/engine/status") {
      sendJson(response, 200, {
        available: existsSync(stockfishPath),
        name: stockfishName,
        engineFile: path.basename(stockfishPath),
      });
      return;
    }

    if (requestUrl.pathname === "/api/engine/analyze-stream") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      const body = await readJsonBody(request);
      const fen = typeof body.fen === "string" ? body.fen.trim() : "";

      if (!fen) {
        sendJson(response, 400, { error: "FEN mancante" });
        return;
      }

      if (!existsSync(stockfishPath)) {
        sendJson(response, 404, { error: "Stockfish non trovato" });
        return;
      }

      const depthLimit = parseDepthLimit(body);
      const multipv = clampInteger(body.multipv, 1, 5, 3);
      const abortController = new AbortController();
      let streamEnded = false;
      let clientClosed = false;

      response.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      response.on("close", () => {
        if (!streamEnded) {
          clientClosed = true;
          abortController.abort();
        }
      });

      const writeEvent = (payload) => {
        if (!clientClosed && !response.destroyed) {
          response.write(`${JSON.stringify(payload)}\n`);
        }
      };

      try {
        const analysis = await analyzeWithStockfish({
          depth: depthLimit.depth,
          depthMode: depthLimit.mode,
          fen,
          multipv,
          signal: abortController.signal,
          onUpdate: writeEvent,
        });
        writeEvent({ ...analysis, type: "final" });
      } catch (error) {
        if (!clientClosed) {
          writeEvent({ type: "error", error: error.message || "Errore Stockfish" });
        }
      } finally {
        streamEnded = true;
        if (!response.destroyed) {
          response.end();
        }
      }
      return;
    }

    if (requestUrl.pathname === "/api/engine/analyze") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      const body = await readJsonBody(request);
      const fen = typeof body.fen === "string" ? body.fen.trim() : "";

      if (!fen) {
        sendJson(response, 400, { error: "FEN mancante" });
        return;
      }

      if (!existsSync(stockfishPath)) {
        sendJson(response, 404, { error: "Stockfish non trovato" });
        return;
      }

      const depth = clampInteger(body.depth, 1, 99, 14);
      const multipv = clampInteger(body.multipv, 1, 5, 3);
      const analysis = await analyzeWithStockfish({ depth, fen, multipv });

      sendJson(response, 200, analysis);
      return;
    }

    if (requestUrl.pathname === "/api/engine/move") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }

      const body = await readJsonBody(request);
      const fen = typeof body.fen === "string" ? body.fen.trim() : "";

      if (!fen) {
        sendJson(response, 400, { error: "FEN mancante" });
        return;
      }

      if (!existsSync(stockfishPath)) {
        sendJson(response, 404, { error: "Stockfish non trovato" });
        return;
      }

      const elo = clampInteger(body.elo, 200, 3000, 800);
      const result = await chooseStockfishMove({ fen, elo });

      sendJson(response, 200, result);
      return;
    }

    const pathname = decodeURIComponent(requestUrl.pathname);
    const targetPath = pathname === "/" ? "/index.html" : pathname;
    const resolvedPath = path.resolve(root, `.${targetPath}`);

    if (!resolvedPath.startsWith(root)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const fileStat = await stat(resolvedPath);
    const finalPath = fileStat.isDirectory()
      ? path.join(resolvedPath, "index.html")
      : resolvedPath;
    const body = await readFile(finalPath);
    const extension = path.extname(finalPath).toLowerCase();

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    if (requestUrl?.pathname.startsWith("/api/")) {
      sendJson(response, 500, { error: error.message || "Errore interno" });
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`LATCO disponibile su http://${host}:${port}`);
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > 1024 * 64) {
        reject(new Error("Request body troppo grande"));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(text));
      } catch (_error) {
        reject(new Error("JSON non valido"));
      }
    });

    request.on("error", reject);
  });
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function parseDepthLimit(body) {
  const mode = typeof body.depthMode === "string" ? body.depthMode.toLowerCase() : "";
  const value = typeof body.depth === "string" ? body.depth.toLowerCase() : body.depth;

  if (mode === "infinite" || mode === "unlimited" || value === "infinite" || value === "unlimited") {
    return { mode: "infinite", depth: null };
  }

  return {
    mode: "fixed",
    depth: clampInteger(body.depth, 1, 99, 14),
  };
}

function chooseStockfishMove({ fen, elo }) {
  return new Promise((resolve, reject) => {
    const engine = spawn(stockfishPath, [], {
      cwd: path.dirname(stockfishPath),
      windowsHide: true,
    });
    const config = getBotConfig(elo);
    const linesByPv = new Map();
    let stdoutBuffer = "";
    let bestmove = null;
    let resolved = false;

    const timeout = setTimeout(() => {
      finish(new Error("Timeout mossa Stockfish"));
    }, 12000);

    function send(command) {
      if (!engine.killed) {
        engine.stdin.write(`${command}\n`);
      }
    }

    function finish(error) {
      if (resolved) {
        return;
      }

      resolved = true;
      clearTimeout(timeout);

      try {
        send("quit");
      } catch (_error) {
        // Engine may already be closed.
      }

      windowlessKill(engine);

      if (error) {
        reject(error);
        return;
      }

      const candidates = [...linesByPv.values()]
        .sort((a, b) => a.multipv - b.multipv)
        .map((line) => line.pv?.[0])
        .filter(Boolean);
      const move = chooseBotCandidate(bestmove, candidates, config);

      if (!move) {
        reject(new Error("Stockfish non ha restituito una mossa"));
        return;
      }

      resolve({
        ok: true,
        engine: stockfishName,
        move,
        elo,
        category: getBotCategoryName(elo),
        depth: config.depth,
        movetime: config.movetime,
      });
    }

    engine.stdout.setEncoding("utf8");
    engine.stderr.setEncoding("utf8");

    engine.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk;
      const parts = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = parts.pop() || "";

      for (const line of parts) {
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        if (trimmed === "uciok") {
          send("setoption name Threads value 1");
          send("setoption name Hash value 32");
          send(`setoption name Skill Level value ${config.skill}`);
          send("setoption name UCI_LimitStrength value true");
          send(`setoption name UCI_Elo value ${config.uciElo}`);
          send(`setoption name MultiPV value ${config.multiPv}`);
          send("isready");
          continue;
        }

        if (trimmed === "readyok") {
          send(`position fen ${fen}`);
          send(config.depth ? `go depth ${config.depth}` : `go movetime ${config.movetime}`);
          continue;
        }

        if (trimmed.startsWith("info ")) {
          const parsed = parseInfoLine(trimmed);

          if (parsed) {
            const existing = linesByPv.get(parsed.multipv);

            if (!existing || parsed.depth >= existing.depth) {
              linesByPv.set(parsed.multipv, parsed);
            }
          }
          continue;
        }

        if (trimmed.startsWith("bestmove ")) {
          bestmove = trimmed.split(/\s+/)[1] || null;
          finish();
        }
      }
    });

    engine.stderr.on("data", (_chunk) => {
      // Stockfish normally writes all protocol data to stdout.
    });

    engine.on("error", finish);

    engine.on("exit", () => {
      if (!resolved) {
        finish(new Error("Stockfish si e chiuso prima della mossa"));
      }
    });

    send("uci");
  });
}

function getBotConfig(elo) {
  const normalized = (elo - 200) / 2800;
  const skill = Math.max(0, Math.min(20, Math.round(normalized * 20)));
  const uciElo = Math.max(1320, Math.min(3000, elo));
  const multiPv = elo < 600 ? 6 : elo < 1000 ? 5 : elo < 1500 ? 4 : 3;
  const mistakeChance =
    elo < 600 ? 0.55 : elo < 1000 ? 0.38 : elo < 1500 ? 0.24 : elo < 2000 ? 0.13 : elo < 2500 ? 0.06 : 0.02;

  return {
    skill,
    uciElo,
    multiPv,
    mistakeChance,
    depth: elo >= 1800 ? Math.max(4, Math.round(6 + normalized * 8)) : 0,
    movetime: Math.round(80 + normalized * 850),
  };
}

function chooseBotCandidate(bestmove, candidates, config) {
  const uniqueCandidates = [...new Set(candidates)];

  if (!uniqueCandidates.length) {
    return bestmove;
  }

  if (Math.random() < config.mistakeChance) {
    const offset = Math.floor(Math.random() * uniqueCandidates.length);
    return uniqueCandidates[Math.min(uniqueCandidates.length - 1, offset)];
  }

  return bestmove || uniqueCandidates[0];
}

function getBotCategoryName(elo) {
  if (elo <= 500) {
    return "Beginner";
  }
  if (elo <= 1000) {
    return "Basic";
  }
  if (elo <= 1500) {
    return "Intermediate";
  }
  if (elo <= 2000) {
    return "Advanced";
  }
  if (elo <= 2500) {
    return "Expert";
  }
  return "Master";
}

function analyzeWithStockfish({ depth, depthMode = "fixed", fen, multipv, onUpdate, signal }) {
  return new Promise((resolve, reject) => {
    const engine = spawn(stockfishPath, [], {
      cwd: path.dirname(stockfishPath),
      windowsHide: true,
    });
    const linesByPv = new Map();
    const turn = fen.split(/\s+/)[1] === "b" ? "b" : "w";
    const isInfinite = depthMode === "infinite" || !Number.isFinite(depth);
    let stdoutBuffer = "";
    let bestmove = null;
    let latestDepth = 0;
    let resolved = false;

    const timeout = isInfinite
      ? null
      : setTimeout(() => {
          finish(new Error("Timeout analisi Stockfish"));
        }, Math.max(15000, depth * 1600));

    function send(command) {
      if (!engine.killed) {
        engine.stdin.write(`${command}\n`);
      }
    }

    function getNormalizedLines() {
      return [...linesByPv.values()]
        .sort((a, b) => a.multipv - b.multipv)
        .map((line) => ({
          ...line,
          score: normalizeScore(line.score, turn),
        }));
    }

    function buildPayload(type) {
      const lines = getNormalizedLines();

      return {
        ok: true,
        type,
        engine: stockfishName,
        depth: latestDepth || (isInfinite ? 0 : depth),
        depthMode: isInfinite ? "infinite" : "fixed",
        requestedDepth: isInfinite ? null : depth,
        fen,
        multipv,
        bestmove,
        lines,
        score: lines[0]?.score || null,
      };
    }

    function handleAbort() {
      finish(new Error("Analisi interrotta"));
    }

    function finish(error) {
      if (resolved) {
        return;
      }

      resolved = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      signal?.removeEventListener("abort", handleAbort);

      try {
        send("quit");
      } catch (_error) {
        // Engine may already be closed.
      }

      windowlessKill(engine);

      if (error) {
        reject(error);
        return;
      }

      resolve(buildPayload("final"));
    }

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    signal?.addEventListener("abort", handleAbort, { once: true });

    engine.stdout.setEncoding("utf8");
    engine.stderr.setEncoding("utf8");

    engine.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk;
      const parts = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = parts.pop() || "";

      for (const line of parts) {
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        if (trimmed === "uciok") {
          send(`setoption name Threads value 2`);
          send(`setoption name Hash value 64`);
          send(`setoption name MultiPV value ${multipv}`);
          send("isready");
          continue;
        }

        if (trimmed === "readyok") {
          send(`position fen ${fen}`);
          send(isInfinite ? "go infinite" : `go depth ${depth}`);
          continue;
        }

        if (trimmed.startsWith("info ")) {
          const parsed = parseInfoLine(trimmed);

          if (parsed) {
            const existing = linesByPv.get(parsed.multipv);

            if (!existing || parsed.depth >= existing.depth) {
              linesByPv.set(parsed.multipv, parsed);
              latestDepth = Math.max(latestDepth, parsed.depth);

              if (typeof onUpdate === "function") {
                onUpdate(buildPayload("info"));
              }
            }
          }
          continue;
        }

        if (trimmed.startsWith("bestmove ")) {
          bestmove = trimmed.split(/\s+/)[1] || null;
          latestDepth = isInfinite ? latestDepth : Math.max(latestDepth, depth);
          finish();
        }
      }
    });

    engine.stderr.on("data", (_chunk) => {
      // Stockfish normally writes all protocol data to stdout.
    });

    engine.on("error", finish);

    engine.on("exit", () => {
      if (!resolved) {
        finish(new Error("Stockfish si e chiuso prima del risultato"));
      }
    });

    send("uci");
  });
}

function parseInfoLine(line) {
  const tokens = line.split(/\s+/);
  const depthIndex = tokens.indexOf("depth");
  const multipvIndex = tokens.indexOf("multipv");
  const scoreIndex = tokens.indexOf("score");
  const pvIndex = tokens.indexOf("pv");

  if (depthIndex < 0 || scoreIndex < 0 || pvIndex < 0) {
    return null;
  }

  const scoreType = tokens[scoreIndex + 1];
  const scoreValue = Number.parseInt(tokens[scoreIndex + 2], 10);

  if (!["cp", "mate"].includes(scoreType) || !Number.isFinite(scoreValue)) {
    return null;
  }

  return {
    depth: Number.parseInt(tokens[depthIndex + 1], 10) || 0,
    multipv: multipvIndex >= 0 ? Number.parseInt(tokens[multipvIndex + 1], 10) || 1 : 1,
    score: {
      type: scoreType,
      value: scoreValue,
    },
    pv: tokens.slice(pvIndex + 1),
  };
}

function normalizeScore(score, turn) {
  if (score.type === "mate") {
    const whiteMate = turn === "w" ? score.value : -score.value;

    return {
      type: "mate",
      value: score.value,
      whiteMate,
      whiteCp: whiteMate > 0 ? 100000 : -100000,
      display: whiteMate > 0 ? `#${whiteMate}` : `-#${Math.abs(whiteMate)}`,
      bar: whiteMate > 0 ? 98 : 2,
    };
  }

  const whiteCp = turn === "w" ? score.value : -score.value;

  return {
    type: "cp",
    value: score.value,
    whiteCp,
    display: formatCentipawns(whiteCp),
    bar: scoreToBar(whiteCp),
  };
}

function formatCentipawns(cp) {
  const pawns = cp / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

function scoreToBar(cp) {
  const clamped = Math.max(-2000, Math.min(2000, cp));
  const logistic = 1 / (1 + Math.exp(-clamped / 250));
  return Math.round((4 + logistic * 92) * 10) / 10;
}

function windowlessKill(engine) {
  try {
    if (process.platform === "win32" && engine.pid) {
      const killer = spawn("taskkill", ["/pid", String(engine.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
      killer.unref();
      return;
    }

    engine.kill();
  } catch (_error) {
    // Ignore shutdown races.
  }
}
