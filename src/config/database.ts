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
      CREATE TABLE IF NOT EXISTS streaming_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TEXT NOT NULL,
        ms_played INTEGER NOT NULL,
        platform TEXT,
        track_name TEXT,
        artist_name TEXT,
        album_name TEXT,
        spotify_track_uri TEXT,
        episode_name TEXT,
        episode_show_name TEXT,
        reason_start TEXT,
        reason_end TEXT,
        shuffle INTEGER,
        skipped INTEGER,
        offline INTEGER,
        conn_country TEXT,
        content_type TEXT DEFAULT 'track',
        UNIQUE(ts, spotify_track_uri)
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_sh_ts ON streaming_history(ts)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sh_uri ON streaming_history(spotify_track_uri)`);

    db.run(`
      CREATE TABLE IF NOT EXISTS track_enrichment (
        spotify_uri TEXT PRIMARY KEY,
        lastfm_tags TEXT,
        mood TEXT,
        lastfm_listeners INTEGER,
        mbid TEXT,
        bpm INTEGER,
        musical_key TEXT,
        enriched_at TEXT
      )
    `);
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
