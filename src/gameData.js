export const WORD_PACKS = [
  { id: 'neon-ninjas', name: 'Neon Ninjas', emoji: '🥷', vibe: 'Fast, flashy, arcade words', words: ['blade', 'shadow', 'dash', 'silent', 'strike', 'smoke', 'laser', 'dojo', 'swift', 'phantom'] },
  { id: 'gamer-loot', name: 'Gamer Loot', emoji: '🎮', vibe: 'Keyboard warrior words', words: ['quest', 'combo', 'spawn', 'rocket', 'victory', 'glitch', 'armor', 'pixel', 'boss', 'legend'] },
  { id: 'space-race', name: 'Space Race', emoji: '🚀', vibe: 'Cosmic speed battle', words: ['orbit', 'comet', 'nebula', 'launch', 'meteor', 'galaxy', 'cosmic', 'rocket', 'planet', 'alien'] },
  { id: 'monster-mash', name: 'Monster Mash', emoji: '👹', vibe: 'Spooky but silly', words: ['goblin', 'zombie', 'slime', 'dragon', 'ghost', 'beast', 'fang', 'curse', 'venom', 'troll'] },
  { id: 'sports-arena', name: 'Sports Arena', emoji: '🏟️', vibe: 'Crowd noise energy', words: ['sprint', 'goal', 'tackle', 'winner', 'coach', 'arena', 'score', 'rally', 'medal', 'turbo'] },
  { id: 'snack-attack', name: 'Snack Attack', emoji: '🍕', vibe: 'Food chaos', words: ['pizza', 'taco', 'noodle', 'burger', 'sushi', 'waffle', 'cookie', 'bacon', 'donut', 'nacho'] },
  { id: 'meme-lords', name: 'Meme Lords', emoji: '🧠', vibe: 'Short viral words', words: ['yeet', 'sigma', 'vibe', 'ratio', 'sus', 'based', 'clutch', 'cringe', 'chaos', 'rizz'] },
  { id: 'animal-rush', name: 'Animal Rush', emoji: '🦊', vibe: 'Animal speedrun', words: ['fox', 'tiger', 'eagle', 'otter', 'panda', 'shark', 'wolf', 'raven', 'koala', 'cobra'] },
  { id: 'tech-core', name: 'Tech Core', emoji: '💾', vibe: 'Hacker board', words: ['code', 'array', 'server', 'binary', 'signal', 'cache', 'token', 'script', 'upload', 'matrix'] },
  { id: 'mythic-mode', name: 'Mythic Mode', emoji: '⚔️', vibe: 'Fantasy fight', words: ['rune', 'quest', 'giant', 'wizard', 'sword', 'castle', 'potion', 'throne', 'magic', 'shield'] },
];

export const DEFAULT_CUSTOM_WORDS = ['firefly', 'nio', 'turbo', 'laser', 'legend', 'combo', 'clutch', 'rocket', 'shadow', 'victory'];

export const SEED_RUNS = [
  { id: 'seed-nova', playerName: 'Nova', packId: 'neon-ninjas', packName: 'Neon Ninjas', totalMs: 4860, wpm: 105, createdAt: '2026-01-01T10:00:00.000Z', words: WORD_PACKS[0].words, wordTimes: WORD_PACKS[0].words.map((word, i) => ({ word, ms: [380, 450, 430, 560, 510, 440, 460, 480, 520, 630][i] })) },
  { id: 'seed-bytekid', playerName: 'ByteKid', packId: 'tech-core', packName: 'Tech Core', totalMs: 5120, wpm: 98, createdAt: '2026-01-02T10:00:00.000Z', words: WORD_PACKS[8].words, wordTimes: WORD_PACKS[8].words.map((word, i) => ({ word, ms: [300, 510, 620, 670, 570, 520, 480, 590, 440, 420][i] })) },
  { id: 'seed-soniccat', playerName: 'SonicCat', packId: 'animal-rush', packName: 'Animal Rush', totalMs: 5380, wpm: 94, createdAt: '2026-01-03T10:00:00.000Z', words: WORD_PACKS[7].words, wordTimes: WORD_PACKS[7].words.map((word, i) => ({ word, ms: [214, 560, 520, 620, 610, 590, 550, 610, 570, 535][i] })) },
  { id: 'seed-rocketrun', playerName: 'RocketRon', packId: 'space-race', packName: 'Space Race', totalMs: 5660, wpm: 90, createdAt: '2026-01-04T10:00:00.000Z', words: WORD_PACKS[2].words, wordTimes: WORD_PACKS[2].words.map((word, i) => ({ word, ms: [470, 490, 680, 570, 640, 600, 580, 352, 650, 628][i] })) },
  { id: 'seed-pizzaboss', playerName: 'PizzaBoss', packId: 'snack-attack', packName: 'Snack Attack', totalMs: 5890, wpm: 87, createdAt: '2026-01-05T10:00:00.000Z', words: WORD_PACKS[5].words, wordTimes: WORD_PACKS[5].words.map((word, i) => ({ word, ms: [300, 420, 610, 670, 550, 650, 610, 520, 580, 980][i] })) },
];

export const SEED_WORD_RECORDS = [
  { word: 'yeet', playerName: 'Mika', ms: 188, packName: 'Meme Lords', createdAt: '2026-01-06T10:00:00.000Z' },
  { word: 'fox', playerName: 'Sofia', ms: 214, packName: 'Animal Rush', createdAt: '2026-01-07T10:00:00.000Z' },
  { word: 'boss', playerName: 'Kai', ms: 230, packName: 'Gamer Loot', createdAt: '2026-01-08T10:00:00.000Z' },
  { word: 'rocket', playerName: 'Nova', ms: 352, packName: 'Space Race', createdAt: '2026-01-09T10:00:00.000Z' },
  { word: 'matrix', playerName: 'ByteKid', ms: 421, packName: 'Tech Core', createdAt: '2026-01-10T10:00:00.000Z' },
  { word: 'dragon', playerName: 'Rune', ms: 440, packName: 'Monster Mash', createdAt: '2026-01-11T10:00:00.000Z' },
  { word: 'pizza', playerName: 'Leo', ms: 300, packName: 'Snack Attack', createdAt: '2026-01-12T10:00:00.000Z' },
  { word: 'shadow', playerName: 'Zara', ms: 402, packName: 'Neon Ninjas', createdAt: '2026-01-13T10:00:00.000Z' },
];

export function normalizeWord(word) {
  return String(word || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9æøå-]/g, '')
    .slice(0, 24);
}

export function cleanWords(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[\n,;\s]+/);
  const cleaned = raw.map(normalizeWord).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 10);
}

export function getPackById(packId) {
  return WORD_PACKS.find((pack) => pack.id === packId) || null;
}

export function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => item === b[index]);
}

export function battleCodeFor(words) {
  let hash = 2166136261;
  for (const char of cleanWords(words).join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `TB-${hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

export function encodeChallenge(payload) {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeChallenge(token) {
  try {
    const compact = String(token || '').trim();
    const padded = compact.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(compact.length / 4) * 4, '=');
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch {
    return null;
  }
}

export function extractBattleToken(input) {
  const value = String(input || '').trim();
  const match = value.match(/[?&]battle=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : value;
}

export function resolveChallenge(input, currentWords = WORD_PACKS[0].words, currentCustom = false, currentPackId = WORD_PACKS[0].id) {
  const token = extractBattleToken(input);
  const decoded = decodeChallenge(token);
  if (decoded?.words?.length) return decoded;

  const code = token.trim().toUpperCase();
  const pack = WORD_PACKS.find((candidate) => battleCodeFor(candidate.words) === code);
  if (pack) return { type: 'pack', packId: pack.id, words: pack.words, custom: false };

  if (code && code === battleCodeFor(currentWords)) {
    return { type: currentCustom ? 'custom' : 'pack', packId: currentPackId, words: currentWords, custom: currentCustom };
  }

  return null;
}
