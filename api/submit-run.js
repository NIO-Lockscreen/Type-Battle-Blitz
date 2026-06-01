import { randomUUID } from 'node:crypto';
import { normalizeSubmittedRun } from './_lib/scoreLogic.js';
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
    const runId = `${Date.now()}-${randomUUID()}`;
    const run = { id: runId, ...normalizeSubmittedRun(req.body || {}) };

    const writes = [];
    if (run.globalEligible) {
      writes.push(writeJson(`runs/${runId}.json`, run));
    }
    if (run.battleId) {
      writes.push(writeJson(`battles/${run.battleId}/${runId}.json`, run));
    }
    if (!run.globalEligible && !run.battleId) {
      // Keep truly private/custom local-only runs out of Blob unless they belong to a battle.
      res.status(200).json({ ok: true, stored: false, run, reason: 'Custom run without battleId was not stored globally.' });
      return;
    }

    await Promise.all(writes);
    res.status(200).json({ ok: true, stored: true, run });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}
