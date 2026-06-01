import { aggregateLeaderboard } from './_lib/scoreLogic.js';
import { blobConfigured, readJsonBlobs } from './_lib/blobStore.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const storedRuns = await readJsonBlobs('runs/', 5);
    const leaderboard = aggregateLeaderboard(storedRuns);
    res.status(200).json({ ok: true, blobConfigured: blobConfigured(), ...leaderboard });
  } catch (error) {
    res.status(200).json({ ok: false, blobConfigured: blobConfigured(), error: error.message, ...aggregateLeaderboard([]) });
  }
}
