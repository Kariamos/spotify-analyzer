import { Router } from 'express';
import { getRecentlyPlayed, getTopArtists, getTopTracks } from '../services/spotify.service.js';
import { analyze } from '../services/analyzer.service.js';
import { userSpotify } from './auth.routes.js';
import { getDatabase } from '../config/database.js';
import type { HistoryResult, MoodResult, EvolutionResult, PatternsResult, MoodByHourResult } from '../types/spotify.types.js';

export const insightsRouter = Router();

function dbAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows as T[]); });
  });
}

function dbGet<T>(sql: string, params: unknown[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (err, row) => { if (err) reject(err); else resolve(row as T); });
  });
}

insightsRouter.get('/history', async (_req, res) => {
  try {
    const db = getDatabase();

    const [monthRows, contentRow, platformRows, totalRow, trackCountRow, skippedRows] = await Promise.all([
      dbAll<{ month: string; plays: number; minutes: number }>(`
        SELECT substr(ts, 1, 7) as month,
               COUNT(*) as plays,
               ROUND(SUM(ms_played) / 60000.0, 1) as minutes
        FROM streaming_history
        GROUP BY month ORDER BY month
      `),
      dbGet<{ track: number; podcast: number; audiobook: number }>(`
        SELECT
          SUM(CASE WHEN content_type='track' THEN 1 ELSE 0 END) as track,
          SUM(CASE WHEN content_type='podcast' THEN 1 ELSE 0 END) as podcast,
          SUM(CASE WHEN content_type='audiobook' THEN 1 ELSE 0 END) as audiobook
        FROM streaming_history
      `),
      dbAll<{ platform: string; cnt: number }>(`
        SELECT COALESCE(platform, 'unknown') as platform, COUNT(*) as cnt
        FROM streaming_history GROUP BY platform ORDER BY cnt DESC
      `),
      dbGet<{ total_minutes: number }>(`SELECT ROUND(SUM(ms_played)/60000.0,1) as total_minutes FROM streaming_history`),
      dbGet<{ cnt: number }>(`SELECT COUNT(DISTINCT spotify_track_uri) as cnt FROM streaming_history WHERE spotify_track_uri IS NOT NULL`),
      dbAll<{ artist: string; total: number; skipped: number }>(`
        SELECT artist_name as artist,
               COUNT(*) as total,
               SUM(skipped) as skipped
        FROM streaming_history
        WHERE artist_name IS NOT NULL AND content_type = 'track'
        GROUP BY artist_name
        HAVING total >= 10
        ORDER BY (CAST(skipped AS REAL)/total) DESC
        LIMIT 10
      `),
    ]);

    // Compute listening streaks from daily play counts
    const dayRows = await dbAll<{ day: string }>(`
      SELECT DISTINCT substr(ts, 1, 10) as day FROM streaming_history ORDER BY day
    `);
    const days = dayRows.map(r => r.day);
    let longestStreak = 0, currentStreak = 0, streak = 1;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { streak++; } else { longestStreak = Math.max(longestStreak, streak); streak = 1; }
    }
    longestStreak = Math.max(longestStreak, streak);
    const lastDay = days[days.length - 1];
    const diffFromToday = (new Date(today).getTime() - new Date(lastDay || today).getTime()) / 86400000;
    currentStreak = diffFromToday <= 1 ? streak : 0;

    const platformBreakdown: Record<string, number> = {};
    for (const row of platformRows) platformBreakdown[row.platform] = row.cnt;

    const result: HistoryResult = {
      playsByMonth: monthRows,
      contentSplit: contentRow || { track: 0, podcast: 0, audiobook: 0 },
      platformBreakdown,
      totalMinutes: (totalRow as any)?.total_minutes ?? 0,
      totalTracks: (trackCountRow as any)?.cnt ?? 0,
      topSkippedArtists: skippedRows.map(r => ({
        artist: r.artist,
        skipRate: Math.round((r.skipped / r.total) * 100),
        total: r.total,
      })),
      longestStreak,
      currentStreak,
    };

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'History query failed', detail: msg });
  }
});

insightsRouter.get('/mood', async (_req, res) => {
  try {
    const [moodRows, bpmRows, keyRows, tagRows] = await Promise.all([
      dbAll<{ mood: string; plays: number }>(`
        SELECT te.mood, COUNT(*) as plays
        FROM streaming_history sh
        JOIN track_enrichment te ON sh.spotify_track_uri = te.spotify_uri
        WHERE te.mood IS NOT NULL
        GROUP BY te.mood ORDER BY plays DESC
      `),
      dbAll<{ bucket: string; count: number }>(`
        SELECT
          CASE
            WHEN bpm < 80 THEN '< 80 BPM'
            WHEN bpm < 100 THEN '80–100 BPM'
            WHEN bpm < 120 THEN '100–120 BPM'
            WHEN bpm < 140 THEN '120–140 BPM'
            ELSE '140+ BPM'
          END as bucket,
          COUNT(*) as count
        FROM track_enrichment
        WHERE bpm IS NOT NULL AND bpm > 0
        GROUP BY bucket ORDER BY MIN(bpm)
      `),
      dbAll<{ key: string; count: number }>(`
        SELECT musical_key as key, COUNT(*) as count
        FROM track_enrichment
        WHERE musical_key IS NOT NULL
        GROUP BY musical_key ORDER BY count DESC LIMIT 12
      `),
      dbAll<{ tag: string; weight: number }>(`
        SELECT json_each.value as tag, COUNT(*) as weight
        FROM track_enrichment, json_each(lastfm_tags)
        WHERE lastfm_tags IS NOT NULL AND lastfm_tags != '[]'
        GROUP BY tag ORDER BY weight DESC LIMIT 30
      `),
    ]);

    const totalMoodPlays = moodRows.reduce((s, r) => s + r.plays, 0);
    const result: MoodResult = {
      moodDistribution: moodRows.map(r => ({
        mood: r.mood,
        plays: r.plays,
        percent: totalMoodPlays > 0 ? Math.round((r.plays / totalMoodPlays) * 100) : 0,
      })),
      bpmDistribution: bpmRows,
      keyDistribution: keyRows,
      topTags: tagRows,
    };

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Mood query failed', detail: msg });
  }
});

insightsRouter.get('/evolution', async (_req, res) => {
  try {
    const [moodRows, tagRows] = await Promise.all([
      dbAll<{ year: string; mood: string; plays: number }>(`
        SELECT substr(sh.ts, 1, 4) as year, te.mood, COUNT(*) as plays
        FROM streaming_history sh
        JOIN track_enrichment te ON sh.spotify_track_uri = te.spotify_uri
        WHERE te.mood IS NOT NULL AND sh.content_type = 'track'
        GROUP BY year, te.mood
        ORDER BY year, plays DESC
      `),
      dbAll<{ year: string; tag: string; plays: number }>(`
        SELECT substr(sh.ts, 1, 4) as year, json_each.value as tag, COUNT(*) as plays
        FROM streaming_history sh
        JOIN track_enrichment te ON sh.spotify_track_uri = te.spotify_uri,
             json_each(te.lastfm_tags)
        WHERE te.lastfm_tags IS NOT NULL AND te.lastfm_tags != '[]' AND sh.content_type = 'track'
        GROUP BY year, tag
        ORDER BY year, plays DESC
      `),
    ]);

    const years = [...new Set(moodRows.map(r => r.year))].sort();

    const moodEvolution = years.map(year => {
      const moods: Record<string, number> = {};
      for (const row of moodRows.filter(r => r.year === year)) {
        moods[row.mood] = row.plays;
      }
      return { year, moods };
    });

    const tagEvolution = years.map(year => {
      const tags = tagRows.filter(r => r.year === year).slice(0, 5);
      return { year, topTags: tags.map(r => ({ tag: r.tag, plays: r.plays })) };
    });

    const result: EvolutionResult = { moodEvolution, tagEvolution };
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Evolution query failed', detail: msg });
  }
});

insightsRouter.get('/patterns', async (_req, res) => {
  try {
    const [heatmapRows, discoveryRows, countryRows, allPlays] = await Promise.all([
      dbAll<{ day: number; hour: number; plays: number }>(`
        SELECT
          (strftime('%w', ts) + 6) % 7 as day,
          CAST(substr(ts, 12, 2) AS INTEGER) as hour,
          COUNT(*) as plays
        FROM streaming_history
        GROUP BY day, hour
      `),
      dbAll<{ month: string; artist: string }>(`
        SELECT substr(ts, 1, 7) as month, artist_name as artist
        FROM streaming_history
        WHERE artist_name IS NOT NULL AND content_type = 'track'
        ORDER BY ts ASC
      `),
      dbAll<{ country: string; plays: number }>(`
        SELECT COALESCE(conn_country, 'unknown') as country, COUNT(*) as plays
        FROM streaming_history
        WHERE conn_country IS NOT NULL AND conn_country != ''
        GROUP BY country ORDER BY plays DESC LIMIT 10
      `),
      dbAll<{ ts: string; ms_played: number; artist_name: string | null }>(`
        SELECT ts, ms_played, artist_name
        FROM streaming_history
        WHERE content_type = 'track'
        ORDER BY ts ASC
      `),
    ]);

    // Heatmap: fill missing day/hour combos with 0
    const heatmapMap = new Map<string, number>();
    for (const r of heatmapRows) heatmapMap.set(`${r.day}-${r.hour}`, r.plays);
    const heatmap: Array<{ day: number; hour: number; plays: number }> = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmap.push({ day: d, hour: h, plays: heatmapMap.get(`${d}-${h}`) ?? 0 });
      }
    }

    // Discovery rate: new artists first seen each month
    const seenArtists = new Set<string>();
    const discoveryMap = new Map<string, number>();
    for (const r of discoveryRows) {
      if (!seenArtists.has(r.artist)) {
        seenArtists.add(r.artist);
        discoveryMap.set(r.month, (discoveryMap.get(r.month) ?? 0) + 1);
      }
    }
    const discoveryRate = [...discoveryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, newArtists]) => ({ month, newArtists }));

    // Artist loyalty: artists heard across most years
    const artistYears = new Map<string, Set<string>>();
    const artistPlays = new Map<string, number>();
    for (const r of allPlays) {
      if (!r.artist_name) continue;
      const year = r.ts.slice(0, 4);
      if (!artistYears.has(r.artist_name)) artistYears.set(r.artist_name, new Set());
      artistYears.get(r.artist_name)!.add(year);
      artistPlays.set(r.artist_name, (artistPlays.get(r.artist_name) ?? 0) + 1);
    }
    const artistLoyalty = [...artistYears.entries()]
      .map(([artist, years]) => ({ artist, years: years.size, totalPlays: artistPlays.get(artist) ?? 0 }))
      .filter(a => a.years >= 2)
      .sort((a, b) => b.years - a.years || b.totalPlays - a.totalPlays)
      .slice(0, 10);

    // Session analysis: gap > 30min = new session
    const GAP_MS = 30 * 60 * 1000;
    let sessions: Array<{ tracks: number; durationMs: number }> = [];
    let sessionTracks = 0;
    let sessionMs = 0;
    let prevTs: Date | null = null;

    for (const r of allPlays) {
      const curr = new Date(r.ts);
      if (prevTs && (curr.getTime() - prevTs.getTime()) > GAP_MS) {
        sessions.push({ tracks: sessionTracks, durationMs: sessionMs });
        sessionTracks = 0;
        sessionMs = 0;
      }
      sessionTracks++;
      sessionMs += r.ms_played;
      prevTs = curr;
    }
    if (sessionTracks > 0) sessions.push({ tracks: sessionTracks, durationMs: sessionMs });

    const totalSessions = sessions.length;
    const avgSessionMinutes = totalSessions > 0
      ? Math.round(sessions.reduce((s, x) => s + x.durationMs, 0) / totalSessions / 60000)
      : 0;
    const longestSessionMinutes = sessions.length > 0
      ? Math.round(Math.max(...sessions.map(s => s.durationMs)) / 60000)
      : 0;
    const avgTracksPerSession = totalSessions > 0
      ? Math.round(sessions.reduce((s, x) => s + x.tracks, 0) / totalSessions)
      : 0;

    const result: PatternsResult = {
      heatmap,
      discoveryRate,
      topCountries: countryRows,
      sessionStats: { avgSessionMinutes, longestSessionMinutes, avgTracksPerSession, totalSessions },
      artistLoyalty,
    };
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Patterns query failed', detail: msg });
  }
});

insightsRouter.get('/mood-by-hour', async (_req, res) => {
  try {
    const rows = await dbAll<{ hour: number; mood: string; plays: number }>(`
      SELECT
        CAST(strftime('%H', sh.ts) AS INTEGER) AS hour,
        te.mood,
        COUNT(*) AS plays
      FROM streaming_history sh
      JOIN track_enrichment te ON sh.spotify_track_uri = te.spotify_uri
      WHERE te.mood IS NOT NULL
        AND sh.ms_played > 30000
      GROUP BY hour, te.mood
      ORDER BY hour, plays DESC
    `);

    const hourMap: Record<number, Record<string, number>> = {};
    for (const row of rows) {
      if (!hourMap[row.hour]) hourMap[row.hour] = { hour: row.hour };
      hourMap[row.hour][row.mood] = row.plays;
    }

    const result: MoodByHourResult = {
      data: Array.from({ length: 24 }, (_, h) => ({ hour: h, ...(hourMap[h] ?? {}) })),
      moods: [...new Set(rows.map(r => r.mood))],
    };
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Mood-by-hour query failed', detail: msg });
  }
});

insightsRouter.get('/analysis', async (_req, res) => {
  if (!userSpotify) {
    res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/login' });
    return;
  }

  try {
    const [recent, topArtistsShort, topArtistsMedium, topTracksShort] = await Promise.all([
      getRecentlyPlayed(userSpotify, 50),
      getTopArtists(userSpotify, 'short_term', 20),
      getTopArtists(userSpotify, 'medium_term', 20),
      getTopTracks(userSpotify, 'short_term', 20),
    ]);

    const result = analyze(recent, topArtistsShort, topArtistsMedium, topTracksShort);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error analyzing:', err);
    res.status(500).json({ error: 'Analysis failed', detail: msg });
  }
});
