import AdmZip from 'adm-zip';
import path from 'path';
import { getDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import type { StreamingRecord, ImportResult } from '../types/spotify.types.js';

interface RawSpotifyRecord {
  ts: string;
  ms_played: number;
  platform?: string;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  spotify_track_uri?: string | null;
  episode_name?: string | null;
  episode_show_name?: string | null;
  audiobook_title?: string | null;
  audiobook_uri?: string | null;
  reason_start?: string;
  reason_end?: string;
  shuffle?: boolean;
  skipped?: boolean;
  offline?: boolean;
  conn_country?: string;
  incognito_mode?: boolean;
}

function classifyContent(record: RawSpotifyRecord): StreamingRecord['content_type'] {
  if (record.spotify_track_uri && record.master_metadata_track_name) return 'track';
  if (record.episode_name) return 'podcast';
  if (record.audiobook_title) return 'audiobook';
  return 'track';
}

export async function importHistory(zipPath?: string): Promise<ImportResult> {
  const resolvedPath = path.resolve(zipPath || env.import.zipPath);
  const zip = new AdmZip(resolvedPath);
  const entries = zip.getEntries();

  const audioEntries = entries.filter(e =>
    e.entryName.includes('Streaming_History_Audio_') && e.entryName.endsWith('.json')
  );

  if (audioEntries.length === 0) {
    throw new Error('No Streaming_History_Audio_*.json files found in zip');
  }

  console.log(`[import] Found ${audioEntries.length} audio history files`);

  const db = getDatabase();
  let imported = 0;
  let skipped = 0;
  let total = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO streaming_history
      (ts, ms_played, platform, track_name, artist_name, album_name,
       spotify_track_uri, episode_name, episode_show_name,
       reason_start, reason_end, shuffle, skipped, offline, conn_country, content_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entry of audioEntries) {
    console.log(`[import] Processing ${entry.entryName} (${Math.round(entry.getData().length / 1024)} KB)`);
    const raw = zip.readAsText(entry);
    let records: RawSpotifyRecord[];
    try {
      records = JSON.parse(raw);
    } catch {
      console.warn(`[import] Failed to parse ${entry.entryName}, skipping`);
      continue;
    }

    total += records.length;

    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        for (const rec of records) {
          if (!rec.ts || rec.ms_played < 10000) {
            skipped++;
            continue;
          }

          const contentType = classifyContent(rec);

          insertStmt.run(
            rec.ts,
            rec.ms_played,
            rec.platform || null,
            rec.master_metadata_track_name || null,
            rec.master_metadata_album_artist_name || null,
            rec.master_metadata_album_album_name || null,
            rec.spotify_track_uri || null,
            rec.episode_name || null,
            rec.episode_show_name || null,
            rec.reason_start || null,
            rec.reason_end || null,
            rec.shuffle ? 1 : 0,
            rec.skipped ? 1 : 0,
            rec.offline ? 1 : 0,
            rec.conn_country || null,
            contentType,
            function (this: { changes: number }) {
              if (this.changes > 0) imported++;
              else skipped++;
            }
          );
        }
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  insertStmt.finalize();
  console.log(`[import] Done: ${imported} imported, ${skipped} skipped out of ${total} total`);
  return { imported, skipped, total };
}
