import { aggregateBattleRuns, sanitizeBattleId } from './_lib/scoreLogic.js';
import { blobConfigured, readJsonBlobs } from './_lib/blobStore.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const battleId = sanitizeBattleId(req.query?.battleId);
  if (!battleId) {
    res.status(400).json({ ok: false, error: 'Missing battleId' });
    return;
  }

  try {
    const runs = await readJsonBlobs(`battles/${battleId}/`, 3);
    res.status(200).json({ ok: true, blobConfigured: blobConfigured(), battleId, runs: aggregateBattleRuns(runs) });
  } catch (error) {
    res.status(200).json({ ok: false, blobConfigured: blobConfigured(), battleId, runs: [], error: error.message });
  }
}
