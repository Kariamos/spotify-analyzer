import { getDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import type { EnrichmentStatus } from '../types/spotify.types.js';

const MOOD_MAP: Record<string, string> = {
  energetic: 'Energetic', energy: 'Energetic', 'up-tempo': 'Energetic', upbeat: 'Energetic', dance: 'Energetic',
  chill: 'Chill', relax: 'Chill', relaxing: 'Chill', ambient: 'Chill', mellow: 'Chill', lofi: 'Chill', 'lo-fi': 'Chill',
  melancholy: 'Melancholic', sad: 'Melancholic', emotional: 'Melancholic', melancholic: 'Melancholic', heartbreak: 'Melancholic',
  happy: 'Happy', 'feel-good': 'Happy', 'feel good': 'Happy', joy: 'Happy', joyful: 'Happy', fun: 'Happy',
  dark: 'Dark', aggressive: 'Dark', intense: 'Dark', heavy: 'Dark', angry: 'Dark', metal: 'Dark',
  romantic: 'Romantic', love: 'Romantic', sensual: 'Romantic',
};

function mapMood(tags: string[]): string {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (MOOD_MAP[lower]) return MOOD_MAP[lower];
    for (const [key, mood] of Object.entries(MOOD_MAP)) {
      if (lower.includes(key)) return mood;
    }
  }
  return 'Neutral';
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let enrichmentRunning = false;

async function fetchLastfm(artist: string, track: string): Promise<{ tags: string[]; listeners: number | null }> {
  const apiKey = env.lastfm.apiKey;
  if (!apiKey) return { tags: [], listeners: null };

  const url = `http://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json&autocorrect=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { tags: [], listeners: null };
    const json = await res.json() as any;
    const trackInfo = json?.track;
    if (!trackInfo) return { tags: [], listeners: null };
    const tags: string[] = (trackInfo.toptags?.tag || []).map((t: any) => t.name as string).slice(0, 10);
    const listeners = trackInfo.listeners ? parseInt(trackInfo.listeners, 10) : null;
    return { tags, listeners };
  } catch {
    return { tags: [], listeners: null };
  }
}

async function fetchMusicBrainz(artist: string, track: string): Promise<{ mbid: string | null; bpm: number | null; key: string | null }> {
  const query = `recording:"${track.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`;
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SpotifyAnalyzer/1.0 (personal-project)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { mbid: null, bpm: null, key: null };
    const json = await res.json() as any;
    const recordings = json?.recordings;
    if (!recordings?.length) return { mbid: null, bpm: null, key: null };
    const rec = recordings[0];
    const mbid = rec.id || null;

    // bpm and key are not always in search results, only in full recording detail
    if (!mbid) return { mbid: null, bpm: null, key: null };

    await sleep(1100);
    const detailUrl = `https://musicbrainz.org/ws/2/recording/${mbid}?fmt=json`;
    const detailRes = await fetch(detailUrl, {
      headers: { 'User-Agent': 'SpotifyAnalyzer/1.0 (personal-project)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!detailRes.ok) return { mbid, bpm: null, key: null };
    const detail = await detailRes.json() as any;
    const bpm = detail['bpm'] ? parseInt(detail['bpm'], 10) : null;
    return { mbid, bpm, key: null };
  } catch {
    return { mbid: null, bpm: null, key: null };
  }
}

export async function runEnrichment(): Promise<void> {
  if (enrichmentRunning) return;
  if (!env.lastfm.apiKey) {
    console.warn('[enrichment] LASTFM_API_KEY not set — skipping enrichment');
    return;
  }

  enrichmentRunning = true;
  const db = getDatabase();

  try {
    const unenriched: Array<{ uri: string; artist: string; track: string }> = await new Promise((resolve, reject) => {
      db.all(`
        SELECT DISTINCT sh.spotify_track_uri as uri, sh.artist_name as artist, sh.track_name as track
        FROM streaming_history sh
        WHERE sh.spotify_track_uri IS NOT NULL
          AND sh.artist_name IS NOT NULL
          AND sh.track_name IS NOT NULL
          AND sh.content_type = 'track'
          AND sh.spotify_track_uri NOT IN (SELECT spotify_uri FROM track_enrichment)
        LIMIT 10000
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    });

    console.log(`[enrichment] ${unenriched.length} tracks to enrich`);

    for (let i = 0; i < unenriched.length; i++) {
      const { uri, artist, track } = unenriched[i];

      const lastfm = await fetchLastfm(artist, track);
      await sleep(220);

      const mood = lastfm.tags.length > 0 ? mapMood(lastfm.tags) : 'Neutral';

      // MusicBrainz: only call for ~20% sample to stay within rate limits
      let mbData = { mbid: null as string | null, bpm: null as number | null, key: null as string | null };
      if (i % 5 === 0) {
        mbData = await fetchMusicBrainz(artist, track);
        await sleep(1100);
      }

      await new Promise<void>((resolve, reject) => {
        db.run(`
          INSERT OR REPLACE INTO track_enrichment
            (spotify_uri, lastfm_tags, mood, lastfm_listeners, mbid, bpm, musical_key, enriched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          uri,
          JSON.stringify(lastfm.tags),
          mood,
          lastfm.listeners,
          mbData.mbid,
          mbData.bpm,
          mbData.key,
          new Date().toISOString(),
        ], (err) => { if (err) reject(err); else resolve(); });
      });

      if (i > 0 && i % 100 === 0) {
        console.log(`[enrichment] ${i}/${unenriched.length} enriched`);
      }
    }

    console.log('[enrichment] Completed');
  } finally {
    enrichmentRunning = false;
  }
}

export async function getEnrichmentStatus(): Promise<EnrichmentStatus> {
  const db = getDatabase();

  const [total, enriched] = await Promise.all([
    new Promise<number>((resolve, reject) => {
      db.get(`
        SELECT COUNT(DISTINCT spotify_track_uri) as cnt
        FROM streaming_history
        WHERE spotify_track_uri IS NOT NULL AND content_type = 'track'
      `, (err, row: any) => { if (err) reject(err); else resolve(row?.cnt ?? 0); });
    }),
    new Promise<number>((resolve, reject) => {
      db.get(`SELECT COUNT(*) as cnt FROM track_enrichment`, (err, row: any) => {
        if (err) reject(err); else resolve(row?.cnt ?? 0);
      });
    }),
  ]);

  return { total, enriched, pending: total - enriched, running: enrichmentRunning };
}
