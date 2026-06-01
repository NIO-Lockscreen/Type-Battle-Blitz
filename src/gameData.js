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
