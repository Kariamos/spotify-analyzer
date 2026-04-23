import Database from 'better-sqlite3';
import path from 'path';
import { env } from './env';

let db: Database.Database;

export function initDatabase(): Database.Database {
  const dbPath = env.database.path;
  const dir = path.dirname(dbPath);

  // Create directory if doesn't exist
  try {
    require('fs').mkdirSync(dir, { recursive: true });
  } catch {}

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      played_at DATETIME NOT NULL,
      release_date TEXT,
      duration_ms INTEGER,

      -- Audio features
      energy REAL,
      danceability REAL,
      valence REAL,
      acousticness REAL,
      instrumentalness REAL,
      speechiness REAL,
      liveness REAL,
      loudness REAL,
      tempo REAL,
      key INTEGER,
      mode INTEGER,
      time_signature INTEGER,

      analyzed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tracks_played_at ON tracks(played_at);
    CREATE INDEX IF NOT EXISTS idx_tracks_analyzed ON tracks(analyzed);

    CREATE TABLE IF NOT EXISTS analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period TEXT NOT NULL,
      data TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_cache_period ON analysis_cache(period);
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON analysis_cache(expires_at);

    CREATE TABLE IF NOT EXISTS sync_logs (
      sync_id TEXT PRIMARY KEY,
      started_at DATETIME NOT NULL,
      completed_at DATETIME,
      tracks_processed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status);
  `);
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
  }
}
