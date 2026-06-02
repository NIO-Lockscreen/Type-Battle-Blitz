import { randomUUID } from 'node:crypto';
import { normalizeWord } from '../src/gameData.js';
import { sanitizePlayerName } from './_lib/scoreLogic.js';
import { blobConfigured, writeJson } from './_lib/blobStore.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (!blobConfigured()) {
    res.status(503).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN is missing. Leaderboard writes are disabled until Vercel Blob is connected.' });
    return;
  }

  try {
    const { word: rawWord, ms, playerName, userAgent, appVersion } = req.body || {};
    const word = normalizeWord(rawWord);
    const msNumber = Number(ms);

    if (!word) {
      throw new Error('Invalid word.');
    }
    if (!Number.isFinite(msNumber) || msNumber < 45 || msNumber > 30000) {
      throw new Error('Invalid time.');
    }

    const recordId = `${Date.now()}-${randomUUID()}`;
    const record = {
      id: recordId,
      word,
      playerName: sanitizePlayerName(playerName),
      ms: Math.round(msNumber),
      createdAt: new Date().toISOString(),
      client: {
        userAgent: String(userAgent || '').slice(0, 160),
        appVersion: String(appVersion || '1.0.0').slice(0, 20),
      },
    };

    await writeJson(`word-records/${word}/${recordId}.json`, record);
    res.status(200).json({ ok: true, stored: true, record });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}
