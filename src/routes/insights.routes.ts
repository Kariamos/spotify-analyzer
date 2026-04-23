import { Router } from 'express';
import { getRecentlyPlayed } from '../services/spotify.service.js';
import { analyze } from '../services/analyzer.service.js';
import { userSpotify } from './auth.routes.js';

export const insightsRouter = Router();

insightsRouter.get('/recent', async (_req, res) => {
  if (!userSpotify) {
    res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/login' });
    return;
  }

  try {
    const tracks = await getRecentlyPlayed(userSpotify, 50);
    res.json({ tracks });
  } catch (err) {
    console.error('Error fetching tracks:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

insightsRouter.get('/analysis', async (_req, res) => {
  if (!userSpotify) {
    res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/login' });
    return;
  }

  try {
    const tracks = await getRecentlyPlayed(userSpotify, 50);
    const result = analyze(tracks);
    res.json(result);
  } catch (err) {
    console.error('Error analyzing tracks:', err);
    res.status(500).json({ error: 'Analysis failed' });
  }
});
