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

test('practice mode submission with single word is globally eligible', () => {
  const practice = normalizeSubmittedRun({
    mode: 'practice',
    playerName: 'Practitioner',
    words: ['blade'],
    wordTimes: [{ word: 'blade', ms: 350 }],
  }, '2026-02-01T12:00:00.000Z');
  assert.equal(practice.globalEligible, true);
  assert.equal(practice.custom, false);
  assert.equal(practice.mode, 'practice');
  assert.equal(practice.words.length, 1);
  assert.equal(practice.wordTimes[0].word, 'blade');
  assert.equal(practice.wordTimes[0].ms, 350);
});

test('practice word records appear in leaderboard', () => {
  const practiceRun = {
    id: 'practice-run',
    mode: 'practice',
    playerName: 'Practitioner',
    words: ['blade'],
    wordTimes: [{ word: 'blade', ms: 350 }],
    totalMs: 350,
    globalEligible: true,
    custom: false,
    createdAt: '2026-02-01T12:00:00.000Z',
  };
  const board = aggregateLeaderboard([practiceRun]);
  assert.ok(board.newestWordRecords.some((r) => r.word === 'blade' && r.playerName === 'Practitioner'));
  assert.equal(board.wordRecords.some((r) => r.word === 'blade' && r.ms === 350), true);
});

test('practice runs never pollute the Global Top 10', () => {
  const fullBattle = {
    id: 'full-battle',
    playerName: 'BattleHero',
    packId: WORD_PACKS[0].id,
    packName: WORD_PACKS[0].name,
    custom: false,
    globalEligible: true,
    totalMs: 4000,
    createdAt: '2026-02-01T10:00:00.000Z',
    wordTimes: WORD_PACKS[0].words.map((word) => ({ word, ms: 400 })),
  };
  const practiceRun = {
    id: 'practice-run',
    mode: 'practice',
    playerName: 'Practitioner',
    words: ['blade'],
    wordTimes: [{ word: 'blade', ms: 50 }],
    totalMs: 50,
    globalEligible: true,
    custom: false,
    createdAt: '2026-02-01T12:00:00.000Z',
  };
  const board = aggregateLeaderboard([practiceRun, fullBattle]);
  // Despite the practice run having a far lower totalMs (50 vs 4000),
  // it must NOT appear in the Global Top 10 (which is for 10-word battles only).
  assert.equal(board.globalTop.length, 1);
  assert.equal(board.globalTop[0].playerName, 'BattleHero');
  assert.equal(board.globalTop.some((run) => run.mode === 'practice'), false);
});
