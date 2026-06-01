import { blobConfigured, STORAGE_PREFIX } from './_lib/blobStore.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ ok: true, blobConfigured: blobConfigured(), storagePrefix: STORAGE_PREFIX });
}
