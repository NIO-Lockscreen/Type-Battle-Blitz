# Type Battle Blitz

Asynchronous multiplayer typing battle for Vercel.

The hook: players fight over the fastest time on each single word. A battle is 10 words. The timer starts when the player types the first correct letter of the shown word and stops on the last correct letter. The app stores both the 10-word total and each individual word time.

## Features

- 100 built-in words split into 10 themed packs.
- Custom 10-word battles.
- Shareable battle links.
- Global Top 10 for built-in packs only.
- Custom lists do **not** count on Global Top 10.
- Per-word records with ticker at the top.
- Practice mode: click a record word and get the same word 5 times.
- Battle Board: challenge a player on the same 10-word list.
- Browser-generated synth SFX.
- Vercel serverless API.
- Vercel Blob storage.

## The important part: no ETag leaderboard race condition

This project intentionally avoids the common bug where every player tries to read and rewrite the same `leaderboard.json` file.

Instead, every finished run is written as a unique immutable JSON blob:

```txt
type-battle-blitz-v1/runs/<timestamp-uuid>.json
type-battle-blitz-v1/battles/<battleId>/<timestamp-uuid>.json
```

The leaderboard is calculated by listing those run blobs and sorting them. Because each player writes a new unique file, two players can finish at the same time without overwriting each other and without ETag conflicts.

This is a simple, robust pattern for a small game leaderboard. If the game becomes very popular, move the aggregation to Vercel Postgres, Upstash Redis, Neon, Supabase, or another database. But for avoiding the ETag conflict you had before, this append-only blob setup is the safe choice.

## Local setup

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

Without Vercel Blob configured, the app still opens and plays with seeded demo leaderboards, but online score saving will be disabled.

## Vercel setup

1. Upload this folder to GitHub.
2. Import the GitHub repo into Vercel.
3. In Vercel, go to **Storage**.
4. Create a **Blob** store and connect it to this project.
5. Make sure the project has this environment variable:

```txt
BLOB_READ_WRITE_TOKEN
```

Vercel usually adds it automatically when the Blob store is connected to the same project.

6. Deploy.

## API routes

### `GET /api/health`

Checks whether Blob is configured.

### `GET /api/leaderboard`

Returns:

- `globalTop`
- `wordRecords`
- `newestWordRecords`
- `runCount`
- `blobConfigured`

### `GET /api/battle?battleId=...`

Returns runs for one battle link.

### `POST /api/submit-run`

Saves a run.

Expected JSON:

```json
{
  "playerName": "Thomas",
  "packId": "neon-ninjas",
  "custom": false,
  "battleId": "abc123",
  "words": ["blade", "shadow", "dash", "silent", "strike", "smoke", "laser", "dojo", "swift", "phantom"],
  "wordTimes": [
    { "word": "blade", "ms": 420 },
    { "word": "shadow", "ms": 510 }
  ],
  "appVersion": "1.0.0"
}
```

The API recomputes the total from `wordTimes`. It does not trust the client-provided total.

## Tests

```bash
npm test
```

Tests cover:

- challenge link encoding/decoding
- visible TB-code resolving built-in packs
- built-in pack global eligibility
- custom/changed words blocked from Global Top 10
- leaderboard sorting and newest word records

## Anti-cheat status

Anti-cheat is intentionally skipped in this version, based on the current product direction. This means the leaderboard is for fun, not a secure competitive ranking.

Simple server validation still exists:

- exactly 10 valid words required
- one timing entry per word
- word order must match
- times must be within a sane range
- custom or changed word lists cannot count globally

## Notes for production scaling

The current design reads score blobs and aggregates leaderboard on request. This is fine for a small game/prototype. For high traffic, use the same append-only write model but add one of these:

- scheduled leaderboard snapshot generation
- a database table for runs and word records
- Redis sorted sets for top lists
- a background job that materializes `globalTop` and `wordRecords`

Do not go back to one shared `leaderboard.json` unless you add real transactional writes or retry logic with conditional ETags.
