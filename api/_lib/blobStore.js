import { get, list, put } from '@vercel/blob';

export const STORAGE_PREFIX = 'type-battle-blitz-v1';

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function writeJson(path, data) {
  if (!blobConfigured()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is missing. Create/connect a Vercel Blob store first.');
  }
  const pathname = `${STORAGE_PREFIX}/${path}`;
  return put(pathname, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function listAll(prefix, limitPages = 5) {
  if (!blobConfigured()) return [];
  const blobs = [];
  let cursor;
  let hasMore = true;
  let pages = 0;

  while (hasMore && pages < limitPages) {
    const page = await list({
      prefix: `${STORAGE_PREFIX}/${prefix}`,
      cursor,
      limit: 1000,
    });
    blobs.push(...(page.blobs || []));
    hasMore = Boolean(page.hasMore);
    cursor = page.cursor;
    pages += 1;
  }

  return blobs;
}

export async function readJsonBlobs(prefix, limitPages = 5) {
  const blobs = await listAll(prefix, limitPages);
  const rows = await Promise.allSettled(
    blobs.map(async (blob) => {
      // Blobs are written with `access: 'private'`, so they are NOT readable via a
      // plain unauthenticated `fetch(blob.url)`. Use the SDK's `get()` which attaches
      // the BLOB_READ_WRITE_TOKEN authorization header (and also reads public blobs).
      const result = await get(blob.url, { access: 'private', useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error(`Could not fetch ${blob.pathname}`);
      }
      const json = await new Response(result.stream).json();
      return { ...json, blobPathname: blob.pathname, blobUploadedAt: blob.uploadedAt };
    })
  );
  return rows.filter((row) => row.status === 'fulfilled').map((row) => row.value);
}
