# Spotify Analyzer — Claude Context

## What this project is

Personal music analytics dashboard. Imports Spotify listening history from a data export ZIP, enriches tracks via Last.fm and MusicBrainz, renders insights in a React dashboard.

## Architecture

- **Backend**: Express + TypeScript, port 3000. Entry: `src/index.ts`.
- **Frontend**: React 19 + Vite, port 5173. Entry: `client/src/App.tsx` (single file).
- **Database**: SQLite at `./data/spotify.db` (two tables: `streaming_history`, `track_enrichment`).
- **Build**: `npm run dev` (backend watch), `cd client && npm run dev` (frontend).
- **Type check**: `npx tsc --noEmit` (backend), `cd client && npx tsc --noEmit` (frontend).

## Key constraints

- Spotify `audio-features` endpoint returns 403 for dev apps — **never call it**. Mood/BPM/key come from Last.fm + MusicBrainz instead.
- Enrichment is slow (~200ms/track, 50k+ tracks). Always run as a background job, never synchronously in a route.
- `adm-zip` is used for ZIP parsing (not `yauzl`, not `unzipper`).
- No `p-queue` — rate limiting uses manual `sleep()`.
- Frontend is intentionally a single `App.tsx` (no component files). Keep it that way unless explicitly asked to split.

## Active tables

| Table | Purpose |
|-------|---------|
| `streaming_history` | Raw plays from Spotify data export ZIP |
| `track_enrichment` | Last.fm tags, mood, BPM, key per Spotify URI |

Dead tables (DO NOT recreate): `tracks`, `sync_logs`, `analysis_cache`.

## API routes

- `GET /api/insights/analysis` — live Spotify top artists/tracks
- `GET /api/insights/history` — historical stats from DB
- `GET /api/insights/mood` — mood/BPM/key from enrichment
- `GET /api/insights/evolution` — mood + tags per year
- `GET /api/insights/patterns` — heatmap, sessions, discovery, loyalty
- `POST /api/import/history` — parse ZIP, insert to DB
- `POST /api/import/enrich` — start background Last.fm+MusicBrainz enrichment
- `GET /api/import/enrichment-status` — enrichment progress

## Removed / dead code (don't restore)

- `src/config/spotify-client.ts` — deleted, auth is inline in `auth.routes.ts`
- `node-cron` / `@types/node-cron` — uninstalled, no background scheduling
- `env.example` — deleted, use `.env.example`
- `MoodCluster`, `SyncLog`, `AudioFeatures`, `EnrichedTrack` interfaces — removed from types

## Sensitive data

- `.env` — gitignored, contains real Spotify + Last.fm API keys
- `my_spotify_data.zip` — gitignored, contains personal listening history
- `data/` — gitignored, contains SQLite database
- `.claude/settings.local.json` — gitignored, local Claude Code permissions

## Env vars (all optional except Spotify keys)

```
SPOTIFY_CLIENT_ID       required
SPOTIFY_CLIENT_SECRET   required
LASTFM_API_KEY          optional, needed for enrichment
IMPORT_ZIP_PATH         default: ./my_spotify_data.zip
PORT                    default: 3000
DB_PATH                 default: ./data/spotify.db
```
