# Spotify Analyzer

Spotify listening analysis with mood, key patterns, and taste evolution. Track your musical journey with detailed insights.

## Features

- **Mood Analysis**: Categorize tracks by energy and valence (happiness)
- **Tonal Preferences**: Identify your favorite keys and musical modes
- **Temporal Patterns**: See when you listen to what and how your taste evolves
- **Decade Preferences**: Discover your favorite eras of music
- **Interactive Dashboard**: React-based visualization of insights
- **Automatic Sync**: Background job to keep data fresh

## Tech Stack

- **Backend**: Node.js + TypeScript + Express.js
- **Database**: SQLite with WAL mode for concurrent access
- **API**: Official Spotify Web API SDK
- **Deployment**: Docker + Proxmox LXC
- **Scheduling**: node-cron for background jobs

## Quick Start (Local)

```bash
# Clone repo
git clone https://github.com/Kariamos/spotify-analyzer.git
cd spotify-analyzer

# Setup env
cp .env.example .env
# Fill in SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET from Spotify Dev Portal

# Install and run
npm install
npm run dev
# Visit http://localhost:3000
```

## Environment Variables

See `.env.example` for all available options:

- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`: Spotify OAuth credentials
- `SPOTIFY_REDIRECT_URI`: Callback URL (default: http://localhost:3000/api/auth/callback)
- `DB_PATH`: SQLite database location
- `CACHE_TTL_MINUTES`: How long to cache analysis results
- `SYNC_INTERVAL_HOURS`: How often to fetch new tracks

## Deployment on Proxmox

```bash
chmod +x deploy.sh
./deploy.sh production
```

Creates LXC container with:
- Node 20 Alpine
- SQLite database on `/data/` (persistent volume)
- Tailscale for secure tunnel
- Health checks enabled

## Project Structure

```
src/
├── config/          # Environment, database, Spotify client setup
├── types/           # TypeScript interfaces
├── services/        # Business logic (analysis, sync)
├── routes/          # Express API endpoints
└── index.ts         # Entry point
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/auth/login` - Start OAuth flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/insights/:period` - Get analysis (30/90/180/365 days)
- `GET /api/tracks` - List stored tracks
- `POST /api/sync` - Trigger manual sync

## Contributing

Pull requests welcome. Ensure `npm run type-check` passes.

## License

MIT
