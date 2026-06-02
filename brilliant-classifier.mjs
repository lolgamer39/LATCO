export const BRILLIANT_CONFIG = {
  pieceValues: {
    p: 100,
    n: 300,
    b: 300,
    r: 500,
    q: 900,
    k: 0,
  },
  maxCpLossByRating: [
    { maxRating: 1199, cp: 100 },
    { maxRating: 2000, cp: 70 },
    { maxRating: Infinity, cp: 40 },
  ],
  minSacrificeByRating: [
    { maxRating: 1199, cp: 200 },
    { maxRating: 2000, cp: 250 },
    { maxRating: Infinity, cp: 300 },
  ],
  minExchangeSacrificeCp: 180,
  minQuietMovedPieceSacrificeCp: 300,
  maxExpectedLoss: 0.03, // Abbassato per maggiore severità nelle sviste
  compensationToleranceCp: 120,
  compensationExpectedTolerance: 0.04,
  maxCompetitiveAdvantageCp: 400, // Se sei a +4.00, non serve una "genialità", devi solo vincere
  maxCompetitiveMaterialAdvantageCp: 500, // Limite per le posizioni dove si è già stravinto in materiale
  maxLostButStillCompetitiveCp: -500, // Limite inferiore rivisto
  endgameUniquenessGapCp: 130,
  compensationPly: 8,
  deferredSacrificePly: 3,
  allowBookBrilliant: false,
  brillianceScoreThresholdByRating: [
    { maxRating: 1199, score: 55 },
    { maxRating: 2000, score: 65 },
    { maxRating: Infinity, score: 75 },
  ],
};

export function classifyBrilliantMove(input, config = BRILLIANT_CONFIG) {
  const playerRating = Number.isFinite(input.playerRating) ? input.playerRating : 1500;
  const evalBeforeCp = finiteCp(input.evalBeforeCp);
  const evalBestCp = finiteCp(input.evalBestCp ?? input.evalBeforeCp);
  const evalPlayedCp = finiteCp(input.evalPlayedCp);
  const evalAfterBestReplyCp = finiteCp(input.evalAfterBestReplyCp ?? input.evalPlayedCp);
  const expectedBefore = evalToExpectedScore(evalBeforeCp);
  const expectedBest = evalToExpectedScore(evalBestCp);
  const expectedPlayed = evalToExpectedScore(evalPlayedCp);
  const expectedAfterBestReply = evalToExpectedScore(evalAfterBestReplyCp);
  const evalLossCp = Math.max(0, evalBestCp - evalPlayedCp);
  const expectedLoss = Math.max(0, expectedBest - expectedPlayed);
  const maxCpLoss = getRatingBucketValue(playerRating, config.maxCpLossByRating);
  const minSacrificeCp = getRatingBucketValue(playerRating, config.minSacrificeByRating);
  const reasons = [];

  const sacrifice = normalizeSacrificeInfo(input.sacrifice);
  const phase = input.gamePhase || (isEndgamePosition(input.positionBefore, config) ? "endgame" : "middlegame");
  const bestMatch = Boolean(input.bestMatch || input.playedRank === 1);
  const isNearBest = bestMatch || evalLossCp <= maxCpLoss || expectedLoss <= config.maxExpectedLoss;
  const isBookMove = Boolean(input.isBookMove);
  const competitive = isCompetitivePosition({
    positionBefore: input.positionBefore,
    evalBeforeCp,
    materialBeforeCp: input.materialBeforeCp,
    evalPlayedCp,
    config,
  });
  const sound = isSoundAfterBestReply({
    evalBeforeCp,
    evalAfterBestReplyCp,
    expectedBefore,
    expectedAfterBestReply,
    config,
  });
  const compensation = hasConcreteCompensation({
    positionBefore: input.positionBefore,
    positionAfter: input.positionAfter,
    move: input.move,
    mover: input.mover,
    enginePv: input.enginePv,
    evalBeforeCp,
    evalPlayedCp,
    evalAfterBestReplyCp,
    givesCheckmate: input.givesCheckmate,
    sacrifice,
    config,
  });
  const passesPhaseRules = passesBrilliantPhaseRules({
    phase,
    bestMatch,
    secondBestEvalCp: input.secondBestEvalCp,
    evalPlayedCp,
    bestGapCp: input.bestGapCp,
    compensation,
    config,
  });
  const brillianceScore = scoreBrilliance({
    playerRating,
    sacrifice,
    compensation,
    isNearBest,
    sound,
    competitive,
    phase,
    bestGapCp: input.bestGapCp,
    isBookMove,
    givesCheckmate: input.givesCheckmate,
    move: input.move,
    config,
  });
  const threshold = getRatingBucketValue(playerRating, config.brillianceScoreThresholdByRating);

  if (!isNearBest) reasons.push(`non e best/near-best: perdita ${Math.round(evalLossCp)} cp`);
  if (!sacrifice.hasSacrifice) reasons.push("non contiene un sacrificio materiale reale o apparente");
  if (sacrifice.hasSacrifice && sacrifice.sacrificedMaterialCp < minSacrificeCp) {
    reasons.push(`sacrificio troppo piccolo (${sacrifice.sacrificedMaterialCp} cp)`);
  }
  if (!competitive) reasons.push("posizione non competitiva o gia decisa");
  if (!sound) reasons.push("il sacrificio peggiora troppo dopo la migliore risposta");
  if (!compensation.hasCompensation) reasons.push("compenso non visibile nella finestra di analisi");
  if (!passesPhaseRules) reasons.push("nel finale il sacrificio non e abbastanza unico");
  if (!config.allowBookBrilliant && isBookMove) reasons.push("mossa teorica da libro");
  if (brillianceScore < threshold) reasons.push(`brilliance score insufficiente (${brillianceScore}/${threshold})`);

  const isBrilliant =
    isNearBest &&
    sacrifice.hasSacrifice &&
    sacrifice.sacrificedMaterialCp >= minSacrificeCp &&
    competitive &&
    sound &&
    compensation.hasCompensation &&
    passesPhaseRules &&
    (config.allowBookBrilliant || !isBookMove) &&
    brillianceScore >= threshold;

  return {
    isBrilliant,
    classification: isBrilliant ? "brilliant" : null,
    confidence: isBrilliant ? Math.min(1, brillianceScore / 100) : Math.max(0.1, Math.min(0.55, brillianceScore / 120)),
    brillianceScore,
    reasons: isBrilliant ? buildBrilliantReasons(sacrifice, compensation, phase, evalLossCp) : reasons,
    sacrifice,
    compensation,
    metrics: {
      evalLossCp,
      expectedLoss,
      evalBeforeCp,
      evalPlayedCp,
      evalAfterBestReplyCp,
    },
  };
}

export function detectMaterialSacrifice({
  positionBefore,
  move,
  positionAfter,
  mover,
  beforeMaterial,
  afterMaterial,
  enginePv = [],
  config = BRILLIANT_CONFIG,
}) {
  const pieceValues = config.pieceValues;
  const movedValue = pieceValues[move?.piece] || 0;
  const capturedValue = pieceValues[move?.captured] || 0;
  const immediateMaterialLoss = Math.max(0, (beforeMaterial || 0) - (afterMaterial || 0));
  const offeredNetLoss = Math.max(0, movedValue - capturedValue);
  const opponentCaptures = getOpponentCaptures(positionAfter, pieceValues);
  const previousCaptureKeys = getPreviousOpponentCaptureKeys(positionBefore, mover, pieceValues);
  const newlyAvailableCaptures = opponentCaptures.filter((capture) => !previousCaptureKeys.has(captureTargetKey(capture)));
  const movedPieceCapture = newlyAvailableCaptures.find((capture) => capture.to === move?.to);
  const otherHangingCapture = newlyAvailableCaptures.find(
    (capture) => capture.to !== move?.to && capture.value >= 300,
  );
  const deferredLoss = detectDeferredMaterialLoss(positionAfter, enginePv, mover, beforeMaterial, config);
  const movedPieceIsRealSacrifice =
    movedPieceCapture &&
    movedValue >= config.minQuietMovedPieceSacrificeCp &&
    (
      (move?.captured && offeredNetLoss >= config.minExchangeSacrificeCp) ||
      (!move?.captured && isForcingSacrificeMove(move))
    );

  if (movedPieceIsRealSacrifice) {
    const netLoss = move?.captured ? offeredNetLoss : movedPieceCapture.value;
    return {
      hasSacrifice: true,
      sacrificeType: netLoss >= 250 ? "direct" : "exchange_sacrifice",
      sacrificedMaterialCp: Math.max(netLoss, movedPieceCapture.value),
      apparentMaterialLossCp: movedPieceCapture.value,
      victimValueCp: movedPieceCapture.value,
      sacrificedPiece: { type: move.piece, square: move.to },
      explanation: move?.captured
        ? "il pezzo che ha catturato materiale inferiore puo essere ricatturato"
        : "il pezzo mosso viene offerto in modo forzante",
    };
  }

  if (otherHangingCapture) {
    return {
      hasSacrifice: true,
      sacrificeType: otherHangingCapture.value >= 500 ? "hanging_piece" : "direct",
      sacrificedMaterialCp: Math.max(otherHangingCapture.value, immediateMaterialLoss),
      apparentMaterialLossCp: otherHangingCapture.value,
      victimValueCp: otherHangingCapture.value,
      sacrificedPiece: { type: otherHangingCapture.captured, square: otherHangingCapture.to },
      explanation: `lascia in presa un pezzo diverso da quello mosso, valore ${otherHangingCapture.value} cp`,
    };
  }

  if (deferredLoss.hasSacrifice) {
    return deferredLoss;
  }

  if (immediateMaterialLoss >= 300) {
    return {
      hasSacrifice: true,
      sacrificeType: "deferred",
      sacrificedMaterialCp: immediateMaterialLoss,
      apparentMaterialLossCp: immediateMaterialLoss,
      explanation: "la linea mostra una perdita materiale apparente immediata",
    };
  }

  return {
    hasSacrifice: false,
    sacrificeType: "none",
    sacrificedMaterialCp: 0,
    apparentMaterialLossCp: 0,
    explanation: "nessun sacrificio materiale significativo rilevato",
  };
}

export function evalToExpectedScore(evalCp) {
  const cp = Math.max(-1200, Math.min(1200, finiteCp(evalCp)));
  return 1 / (1 + Math.exp(-cp / 360));
}

export function isCompetitivePosition({
  positionBefore,
  evalBeforeCp,
  materialBeforeCp = 0,
  evalPlayedCp = null,
  config = BRILLIANT_CONFIG,
}) {
  const before = finiteCp(evalBeforeCp);
  const material = finiteCp(materialBeforeCp);

  if (isTechnicallyDecided(positionBefore)) return false;
  if (before >= config.maxCompetitiveAdvantageCp) return false;
  if (material >= config.maxCompetitiveMaterialAdvantageCp && before > 250) return false;
  if (before <= config.maxLostButStillCompetitiveCp && finiteCp(evalPlayedCp) < -80) return false;
  return true;
}

export function isEndgamePosition(position, config = BRILLIANT_CONFIG) {
  const pieces = flattenBoard(position?.board?.());
  if (!pieces.length) return false;

  const queens = pieces.filter((piece) => piece.type === "q").length;
  const nonPawnMaterial = pieces.reduce((total, piece) => {
    if (piece.type === "p" || piece.type === "k") return total;
    return total + (config.pieceValues[piece.type] || 0);
  }, 0);
  const heavyAndMinorPieces = pieces.filter((piece) => !["p", "k"].includes(piece.type)).length;

  return queens === 0 || nonPawnMaterial <= 1600 || heavyAndMinorPieces <= 5;
}

export function hasConcreteCompensation({
  positionBefore,
  positionAfter,
  mover,
  enginePv = [],
  evalBeforeCp,
  evalPlayedCp,
  evalAfterBestReplyCp,
  givesCheckmate,
  sacrifice,
  config = BRILLIANT_CONFIG,
}) {
  if (givesCheckmate || containsMateSignal(enginePv)) {
    return {
      hasCompensation: true,
      compensationType: "forced_mate",
      compensationPly: 1,
      explanation: "la linea contiene matto forzato",
    };
  }

  // Regola severa di stabilità (evita di scambiare sviste per geniali in posizioni molto vinte)
  const expectedDiff = evalToExpectedScore(evalBeforeCp) - evalToExpectedScore(evalAfterBestReplyCp);
  const cpDiff = finiteCp(evalBeforeCp) - finiteCp(evalAfterBestReplyCp);
  
  const stableEval = 
    (cpDiff <= config.compensationToleranceCp) || 
    (expectedDiff <= config.compensationExpectedTolerance && cpDiff <= 250); // Limite di sicurezza CP

  if (stableEval && sacrifice.hasSacrifice) {
    return {
      hasCompensation: true,
      compensationType: "positional_eval",
      compensationPly: null,
      explanation: "dopo la migliore risposta la valutazione resta stabile senza crolli drammatici",
    };
  }

  const materialRecovery = detectMaterialRecovery(positionAfter, enginePv, mover, sacrifice, config);
  if (materialRecovery.hasCompensation) {
    return materialRecovery;
  }

  return {
    hasCompensation: false,
    compensationType: "none",
    compensationPly: null,
    explanation: "compenso non dimostrato entro la finestra di analisi",
  };
}

export function scoreBrilliance({
  playerRating = 1500,
  sacrifice,
  compensation,
  isNearBest,
  sound,
  competitive,
  phase,
  bestGapCp = 0,
  isBookMove = false,
  givesCheckmate = false,
  move,
}) {
  let score = 0;
  if (isNearBest) score += 22;
  if (sound) score += 18;
  if (competitive) score += 14;
  if (sacrifice.hasSacrifice) score += Math.min(26, Math.round(sacrifice.sacrificedMaterialCp / 35));
  if (sacrifice.sacrificeType === "exchange_sacrifice") score += 8;
  // Rimosso il bonus per l'hanging piece
  if (["forced_mate", "promotion", "material_recovery"].includes(compensation.compensationType)) score += 16;
  if (compensation.compensationType === "positional_eval") score += 8;
  
  // Premia se c'è un gap importante con la mossa secondaria (è una mossa unica e difficile)
  if (bestGapCp >= 100) score += 10;
  
  if (move?.san?.includes("+")) score += 5;
  if (givesCheckmate) score += 12;
  if (isBookMove) score -= 22;
  if (sacrifice.sacrificedMaterialCp < 300) score -= 12;
  if (playerRating > 2000) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function passesBrilliantPhaseRules({ phase, bestMatch, secondBestEvalCp, evalPlayedCp, bestGapCp, compensation, config }) {
  if (phase !== "endgame") return true;
  if (compensation.compensationType === "forced_mate") return bestMatch;
  const evalGap = Number.isFinite(secondBestEvalCp) ? evalPlayedCp - secondBestEvalCp : bestGapCp;
  return bestMatch && evalGap >= config.endgameUniquenessGapCp;
}

function isSoundAfterBestReply({ evalBeforeCp, evalAfterBestReplyCp, expectedBefore, expectedAfterBestReply, config }) {
  return (
    finiteCp(evalAfterBestReplyCp) >= finiteCp(evalBeforeCp) - config.compensationToleranceCp ||
    expectedAfterBestReply >= expectedBefore - config.compensationExpectedTolerance
  );
}

function getOpponentCaptures(positionAfter, pieceValues) {
  if (typeof positionAfter?.moves !== "function") return [];

  return positionAfter
    .moves({ verbose: true })
    .filter((reply) => reply.captured)
    .map((reply) => ({
      from: reply.from,
      to: reply.to,
      piece: reply.piece,
      captured: reply.captured,
      san: reply.san,
      value: pieceValues[reply.captured] || 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function getPreviousOpponentCaptureKeys(positionBefore, mover, pieceValues) {
  if (!positionBefore || typeof positionBefore?.fen !== "function") return new Set();

  const opponentTurn = oppositeColor(mover || getPositionTurn(positionBefore));
  const opponentPreview = clonePositionWithTurn(positionBefore, opponentTurn);
  if (!opponentPreview) return new Set();

  return new Set(getOpponentCaptures(opponentPreview, pieceValues).map(captureTargetKey));
}

function captureTargetKey(capture) {
  return `${capture.to}:${capture.captured}`;
}

function isForcingSacrificeMove(move) {
  const san = String(move?.san || "");
  return san.includes("+") || san.includes("#");
}

function detectDeferredMaterialLoss(positionAfter, enginePv, mover, beforeMaterial, config) {
  if (!Array.isArray(enginePv) || !enginePv.length || typeof positionAfter?.fen !== "function") {
    return { hasSacrifice: false };
  }

  const preview = clonePosition(positionAfter);
  if (!preview) return { hasSacrifice: false };

  for (let ply = 0; ply < Math.min(config.deferredSacrificePly, enginePv.length); ply += 1) {
    if (!playUciOnPosition(preview, enginePv[ply])) break;
    const material = materialBalanceForSide(preview, mover, config.pieceValues);
    const loss = Math.max(0, (beforeMaterial || 0) - material);
    if (loss >= 300) {
      return {
        hasSacrifice: true,
        sacrificeType: "deferred",
        sacrificedMaterialCp: loss,
        apparentMaterialLossCp: loss,
        explanation: `la PV mostra una perdita materiale apparente entro ${ply + 1} mezze mosse`,
      };
    }
  }

  return { hasSacrifice: false };
}

function detectMaterialRecovery(positionAfter, enginePv, mover, sacrifice, config) {
  if (!Array.isArray(enginePv) || !enginePv.length || !sacrifice.hasSacrifice) {
    return { hasCompensation: false };
  }

  const preview = clonePosition(positionAfter);
  if (!preview) return { hasCompensation: false };

  const startingMaterial = materialBalanceForSide(preview, mover, config.pieceValues);
  for (let ply = 0; ply < Math.min(config.compensationPly, enginePv.length); ply += 1) {
    if (!playUciOnPosition(preview, enginePv[ply])) break;
    const material = materialBalanceForSide(preview, mover, config.pieceValues);
    if (material >= startingMaterial + Math.min(300, sacrifice.sacrificedMaterialCp)) {
      return {
        hasCompensation: true,
        compensationType: "material_recovery",
        compensationPly: ply + 1,
        explanation: `la linea principale recupera materiale entro ${ply + 1} mezze mosse`,
      };
    }
  }

  return { hasCompensation: false };
}

function buildBrilliantReasons(sacrifice, compensation, phase, evalLossCp) {
  return [
    `sacrificio ${sacrifice.sacrificeType}: ${sacrifice.explanation}`,
    compensation.explanation,
    phase === "endgame" ? "nel finale la mossa supera il controllo di unicita" : "in apertura/mediogioco il sacrificio e best o near-best",
    `perdita rispetto alla migliore: ${Math.round(evalLossCp)} cp`,
  ];
}

function normalizeSacrificeInfo(sacrifice) {
  if (sacrifice && typeof sacrifice === "object") {
    return {
      hasSacrifice: Boolean(sacrifice.hasSacrifice),
      sacrificeType: sacrifice.sacrificeType || "none",
      sacrificedMaterialCp: Number.isFinite(sacrifice.sacrificedMaterialCp) ? sacrifice.sacrificedMaterialCp : 0,
      apparentMaterialLossCp: Number.isFinite(sacrifice.apparentMaterialLossCp) ? sacrifice.apparentMaterialLossCp : 0,
      victimValueCp: sacrifice.victimValueCp,
      sacrificedPiece: sacrifice.sacrificedPiece,
      explanation: sacrifice.explanation || "",
    };
  }

  return {
    hasSacrifice: Boolean(sacrifice),
    sacrificeType: sacrifice ? "direct" : "none",
    sacrificedMaterialCp: sacrifice ? 300 : 0,
    apparentMaterialLossCp: sacrifice ? 300 : 0,
    explanation: sacrifice ? "sacrificio materiale rilevato" : "nessun sacrificio materiale rilevato",
  };
}

function getRatingBucketValue(rating, buckets) {
  return buckets.find((bucket) => rating <= bucket.maxRating)?.cp ??
    buckets.find((bucket) => rating <= bucket.maxRating)?.score ??
    buckets.at(-1)?.cp ??
    buckets.at(-1)?.score;
}

function finiteCp(value) {
  return Number.isFinite(value) ? value : 0;
}

function flattenBoard(board) {
  return Array.isArray(board) ? board.flat().filter(Boolean) : [];
}

function isTechnicallyDecided(position) {
  if (typeof position?.isGameOver === "function" && position.isGameOver()) return true;
  if (typeof position?.game_over === "function" && position.game_over()) return true;
  return false;
}

function containsMateSignal(enginePv) {
  return Array.isArray(enginePv) && enginePv.some((move) => String(move).includes("#"));
}

function clonePosition(position) {
  try {
    return new position.constructor(position.fen());
  } catch (_error) {
    return null;
  }
}

function clonePositionWithTurn(position, turn) {
  try {
    const fenParts = position.fen().split(" ");
    if (fenParts.length < 2 || !["w", "b"].includes(turn)) return null;
    fenParts[1] = turn;
    return new position.constructor(fenParts.join(" "));
  } catch (_error) {
    return null;
  }
}

function getPositionTurn(position) {
  try {
    return typeof position?.turn === "function" ? position.turn() : null;
  } catch (_error) {
    return null;
  }
}

function oppositeColor(color) {
  return color === "b" ? "w" : "b";
}

function playUciOnPosition(position, uci) {
  try {
    return position.move({
      from: String(uci).slice(0, 2),
      to: String(uci).slice(2, 4),
      promotion: String(uci).slice(4) || "q",
    });
  } catch (_error) {
    return null;
  }
}

function materialBalanceForSide(position, side, pieceValues) {
  const pieces = flattenBoard(position?.board?.());
  let white = 0;
  let black = 0;

  for (const piece of pieces) {
    const value = pieceValues[piece.type] || 0;
    if (piece.color === "w") white += value;
    else black += value;
  }

  return side === "w" ? white - black : black - white;
}
