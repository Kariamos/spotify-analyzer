import dotenv from 'dotenv';

dotenv.config();

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
  cache: {
    ttlMinutes: parseInt(process.env.CACHE_TTL_MINUTES || '360', 10),
  },
  sync: {
    intervalHours: parseInt(process.env.SYNC_INTERVAL_HOURS || '6', 10),
    enabled: process.env.SYNC_ENABLED !== 'false',
  },
};

export function validateEnv() {
  const required = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
