import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/callback',
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  database: {
    path: process.env.DB_PATH || './data/spotify.db',
  },
  lastfm: {
    apiKey: process.env.LASTFM_API_KEY || '',
  },
  import: {
    zipPath: process.env.IMPORT_ZIP_PATH || './my_spotify_data.zip',
    enrichmentEnabled: process.env.ENRICHMENT_ENABLED !== 'false',
  },
};

export function validateEnv() {
  const required = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  const id = process.env.SPOTIFY_CLIENT_ID ?? '';
  console.log(`[env] SPOTIFY_CLIENT_ID loaded: ${id.substring(0, 4)}...${id.substring(id.length - 4)} (len=${id.length})`);
}
