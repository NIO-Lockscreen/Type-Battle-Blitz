import assert from 'node:assert/strict';
import test from 'node:test';
import { WORD_PACKS, battleCodeFor, encodeChallenge, decodeChallenge, resolveChallenge } from '../src/gameData.js';
import { aggregateLeaderboard, normalizeSubmittedRun } from '../api/_lib/scoreLogic.js';

test('battle challenge tokens round-trip words and battle id', () => {
  const payload = { type: 'pack', packId: WORD_PACKS[1].id, words: WORD_PACKS[1].words, battleId: 'battle123', custom: false };
  const token = encodeChallenge(payload);
  const decoded = decodeChallenge(token);
  assert.equal(decoded.battleId, 'battle123');
  assert.deepEqual(decoded.words, WORD_PACKS[1].words);
});

test('visible TB-code resolves built-in packs', () => {
  const code = battleCodeFor(WORD_PACKS[0].words);
  const resolved = resolveChallenge(code);
  assert.equal(resolved.packId, WORD_PACKS[0].id);
  assert.deepEqual(resolved.words, WORD_PACKS[0].words);
});

test('built-in pack run is global eligible', () => {
  const run = normalizeSubmittedRun({
    playerName: 'Tester',
    packId: WORD_PACKS[0].id,
    custom: false,
    words: WORD_PACKS[0].words,
    wordTimes: WORD_PACKS[0].words.map((word) => ({ word, ms: 500 })),
  }, '2026-01-20T10:00:00.000Z');
  assert.equal(run.globalEligible, true);
  assert.equal(run.totalMs, 5000);
});

test('custom or changed words never count on global leaderboard', () => {
  const words = [...WORD_PACKS[0].words];
  words[0] = 'customword';
  const run = normalizeSubmittedRun({
    playerName: 'Tester',
    packId: WORD_PACKS[0].id,
    custom: false,
    words,
    wordTimes: words.map((word) => ({ word, ms: 500 })),
  }, '2026-01-20T10:00:00.000Z');
  assert.equal(run.globalEligible, false);
  assert.equal(run.custom, true);
});

test('aggregate leaderboard sorts by fastest total and newest word records', () => {
  const run = {
    id: 'fast-run',
    playerName: 'Speedy',
    packId: WORD_PACKS[0].id,
    packName: WORD_PACKS[0].name,
    custom: false,
    globalEligible: true,
    totalMs: 3000,
    createdAt: '2026-02-01T10:00:00.000Z',
    wordTimes: WORD_PACKS[0].words.map((word) => ({ word, ms: 200 })),
  };
  const board = aggregateLeaderboard([run]);
  assert.equal(board.globalTop[0].playerName, 'Speedy');
  assert.equal(board.newestWordRecords[0].playerName, 'Speedy');
});
