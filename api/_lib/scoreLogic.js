import { arraysEqual, cleanWords, getPackById, SEED_RUNS, SEED_WORD_RECORDS } from '../../src/gameData.js';

const MAX_NAME_LENGTH = 22;
const MIN_MS = 45;
const MAX_MS = 30000;

export function sanitizePlayerName(name) {
  const cleaned = String(name || '').replace(/[<>]/g, '').trim().slice(0, MAX_NAME_LENGTH);
  return cleaned || 'Mystery Typer';
}

export function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeSubmittedRun(body, nowIso = new Date().toISOString()) {
  const isPractice = body?.mode === 'practice';
  const words = cleanWords(body?.words || []);
  const expectedLength = isPractice ? 1 : 10;

  if (words.length !== expectedLength) {
    throw new Error(isPractice ? 'Practice mode requires exactly 1 word.' : 'A battle must contain exactly 10 valid words.');
  }

  const wordTimesRaw = Array.isArray(body?.wordTimes) ? body.wordTimes : [];
  if (wordTimesRaw.length !== words.length) {
    throw new Error('wordTimes must have one entry per word.');
  }

  const wordTimes = wordTimesRaw.map((item, index) => {
    const word = cleanWords([item?.word || words[index]])[0];
    const ms = Math.round(safeNumber(item?.ms));
    if (!word || word !== words[index]) {
      throw new Error(`Word mismatch at position ${index + 1}.`);
    }
    if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) {
      throw new Error(`Invalid time for ${word}.`);
    }
    return { word, ms };
  });

  const totalMs = wordTimes.reduce((sum, item) => sum + item.ms, 0);
  const custom = Boolean(body?.custom);
  const pack = getPackById(body?.packId);
  const globalEligible = isPractice ? true : (!custom && Boolean(pack) && arraysEqual(words, pack.words));
  const chars = words.join('').length;
  const wpm = Math.max(1, Math.round((chars / 5) / (totalMs / 60000)));

  return {
    mode: isPractice ? 'practice' : 'battle',
    playerName: sanitizePlayerName(body?.playerName),
    packId: pack?.id || null,
    packName: pack?.name || (custom ? 'Custom Battle' : 'Unknown Pack'),
    custom: !globalEligible,
    globalEligible,
    words,
    wordTimes,
    totalMs,
    wpm,
    battleId: sanitizeBattleId(body?.battleId),
    createdAt: nowIso,
    client: {
      userAgent: String(body?.userAgent || '').slice(0, 160),
      appVersion: String(body?.appVersion || '1.0.0').slice(0, 20),
    },
  };
}

export function sanitizeBattleId(value) {
  const id = String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  return id || null;
}

export function aggregateLeaderboard(realRuns = []) {
  const runs = [...SEED_RUNS, ...realRuns].filter((run) => run && run.globalEligible !== false && !run.custom);

  const globalTop = [...runs]
    .filter((run) => Number.isFinite(Number(run.totalMs)))
    .sort((a, b) => Number(a.totalMs) - Number(b.totalMs) || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 10);

  const records = new Map();
  for (const seed of SEED_WORD_RECORDS) {
    records.set(seed.word, {
      word: seed.word,
      playerName: seed.playerName,
      ms: seed.ms,
      packName: seed.packName,
      createdAt: seed.createdAt,
      source: 'seed',
    });
  }

  for (const run of runs) {
    for (const item of run.wordTimes || []) {
      const word = cleanWords([item.word])[0];
      const ms = Math.round(Number(item.ms));
      if (!word || !Number.isFinite(ms)) continue;
      const current = records.get(word);
      if (!current || ms < current.ms || (ms === current.ms && new Date(run.createdAt) > new Date(current.createdAt))) {
        records.set(word, {
          word,
          playerName: run.playerName,
          ms,
          packName: run.packName,
          createdAt: run.createdAt,
          source: 'run',
          runId: run.id,
        });
      }
    }
  }

  const wordRecords = [...records.values()].sort((a, b) => a.ms - b.ms);
  const newestWordRecords = [...records.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { globalTop, wordRecords, newestWordRecords, runCount: runs.length };
}

export function aggregateBattleRuns(runs = []) {
  return [...runs]
    .filter((run) => run && Number.isFinite(Number(run.totalMs)))
    .sort((a, b) => Number(a.totalMs) - Number(b.totalMs) || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 50);
}
