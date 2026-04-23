import sqlite3 from 'sqlite3';
import path from 'path';
import { env } from './env';

let db: sqlite3.Database;

export function initDatabase(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    const dbPath = env.database.path;
    const dir = path.dirname(dbPath);

    try {
      require('fs').mkdirSync(dir, { recursive: true });
    } catch {}

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');
        createTables();
        resolve(db);
      });
    });
  });
}

function createTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT,
        played_at DATETIME NOT NULL,
        release_date TEXT,
        duration_ms INTEGER,
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
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_tracks_played_at ON tracks(played_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tracks_analyzed ON tracks(analyzed)`);

    db.run(`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        data TEXT NOT NULL,
        cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_period ON analysis_cache(period)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cache_expires ON analysis_cache(expires_at)`);

    db.run(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        sync_id TEXT PRIMARY KEY,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        tracks_processed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_logs(status)`);
  });
}

export function getDatabase(): sqlite3.Database {
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
