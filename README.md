# Spotify Analyzer

Full-stack personal music analytics dashboard. Imports your complete Spotify listening history, enriches tracks via Last.fm and MusicBrainz, and surfaces deep insights about your taste, mood, and listening behavior.

## Features

- **Extended history** — import full Spotify data export (2022–present), not just recent 50 tracks
- **Mood analysis** — tags from Last.fm mapped to mood buckets (Energetic, Chill, Melancholic, Happy, Dark, Romantic)
- **Tonal preferences** — musical key and BPM distribution via MusicBrainz
- **Taste evolution** — mood and genre stacks per year, see how taste changed
- **Behavioral patterns** — listening heatmap (day × hour), session analysis, discovery rate, artist loyalty
- **Platform breakdown** — where you listen (android/desktop/web)
- **Skip rate** — artists you skip most
- **Tag cloud** — top Last.fm tags weighted by play count
- **Interactive dashboard** — React + Recharts, dark theme

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 20 + TypeScript + Express |
| Frontend | React 19 + Vite + Recharts |
| Database | SQLite |
| Spotify API | `@spotify/web-api-ts-sdk` |
| Enrichment | Last.fm API + MusicBrainz API |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Kariamos/spotify-analyzer.git
cd spotify-analyzer

# 2. Configure
cp .env.example .env
# Edit .env: fill SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

# 3. Backend
npm install
npm run dev

# 4. Frontend (separate terminal)
cd client
npm install
npm run dev

# 5. Open http://localhost:5173 → Login with Spotify
```

## Environment Variables

```bash
# Required
SPOTIFY_CLIENT_ID=          # from Spotify Developer Dashboard
SPOTIFY_CLIENT_SECRET=      # from Spotify Developer Dashboard

# Optional — enrichment
LASTFM_API_KEY=             # free at https://www.last.fm/api/account/create

# Optional — defaults shown
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback
PORT=3000
DB_PATH=./data/spotify.db
IMPORT_ZIP_PATH=./my_spotify_data.zip
```

## Importing Your Full Listening History

Spotify's API returns only the last 50 tracks. To import years of history:

1. Request your data at **Spotify → Account → Privacy → Download your data** (takes ~5 days)
2. Place the downloaded `my_spotify_data.zip` in the project root
3. In the dashboard, click **⚙ Gestione dati → 📥 Importa storico**

## Track Enrichment (Mood / BPM / Keys)

Spotify's audio-features endpoint is blocked for non-commercial apps (403). Enrichment uses:

- **Last.fm** — mood tags, genre tags, listener counts (free API key required)
- **MusicBrainz** — BPM and musical key (sampled, not always available)

After importing history, click **✨ Arricchisci tracce**. Enrichment runs in the background (~200ms/track). Progress shown in the dashboard banner.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/auth/login` | Start Spotify OAuth |
| GET | `/api/auth/callback` | OAuth callback |
| GET | `/api/auth/status` | Auth status |
| GET | `/api/insights/analysis` | Live Spotify data (top artists/tracks) |
| GET | `/api/insights/history` | Full import stats (streaks, content split, platforms) |
| GET | `/api/insights/mood` | Mood/BPM/key distribution |
| GET | `/api/insights/evolution` | Mood + tag evolution per year |
| GET | `/api/insights/patterns` | Heatmap, discovery rate, sessions, loyalty |
| POST | `/api/import/history` | Trigger ZIP import |
| POST | `/api/import/enrich` | Start background enrichment |
| GET | `/api/import/enrichment-status` | Enrichment progress |

## Project Structure

```
src/
├── config/
│   ├── database.ts       # SQLite init and schema
│   ├── env.ts            # Env var loading
│   └── spotify-client.ts # (removed — auth inline in routes)
├── services/
│   ├── spotify.service.ts    # Spotify API calls
│   ├── analyzer.service.ts   # Analysis engine
│   ├── import.service.ts     # ZIP parsing and DB insert
│   └── enrichment.service.ts # Last.fm + MusicBrainz
├── routes/
│   ├── auth.routes.ts    # OAuth flow
│   ├── insights.routes.ts # Analysis + history endpoints
│   └── import.routes.ts  # Import + enrichment triggers
└── index.ts              # Express entry point

client/src/
└── App.tsx               # Full React dashboard (single-file)
```

## Database Schema

Two active tables:

**`streaming_history`** — raw play records from ZIP import  
Fields: `ts`, `ms_played`, `platform`, `track_name`, `artist_name`, `album_name`, `spotify_track_uri`, `episode_name`, `episode_show_name`, `reason_start`, `reason_end`, `shuffle`, `skipped`, `offline`, `conn_country`, `content_type`

**`track_enrichment`** — Last.fm + MusicBrainz data keyed by Spotify URI  
Fields: `spotify_uri`, `lastfm_tags`, `mood`, `lastfm_listeners`, `mbid`, `bpm`, `musical_key`, `enriched_at`

## License

MIT
