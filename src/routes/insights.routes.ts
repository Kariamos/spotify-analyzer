import { Router } from 'express';
import { getRecentlyPlayed, getTopArtists, getTopTracks } from '../services/spotify.service.js';
import { analyze } from '../services/analyzer.service.js';
import { userSpotify } from './auth.routes.js';

export const insightsRouter = Router();

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
