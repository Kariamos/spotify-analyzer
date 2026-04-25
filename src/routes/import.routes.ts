import { Router } from 'express';
import { importHistory } from '../services/import.service.js';
import { runEnrichment, getEnrichmentStatus, reclassifyMoods } from '../services/enrichment.service.js';
import { env } from '../config/env.js';

export const importRouter = Router();

importRouter.post('/history', async (_req, res) => {
  try {
    const result = await importHistory(env.import.zipPath);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[import] Error:', err);
    res.status(500).json({ error: 'Import failed', detail: msg });
  }
});

importRouter.post('/enrich', (_req, res) => {
  if (!env.lastfm.apiKey) {
    res.status(400).json({
      error: 'LASTFM_API_KEY not configured',
      instructions: [
        '1. Go to https://www.last.fm/api/account/create',
        '2. Create a free Last.fm account and API application',
        '3. Copy your API key',
        '4. Add LASTFM_API_KEY=your_key_here to the .env file',
        '5. Restart the server and trigger enrichment again',
      ],
    });
    return;
  }
  runEnrichment().catch(err => console.error('[enrichment] Background error:', err));
  res.json({ message: 'Enrichment started in background' });
});

importRouter.post('/reclassify-mood', async (_req, res) => {
  try {
    const result = await reclassifyMoods();
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[reclassify] Error:', err);
    res.status(500).json({ error: 'Reclassify failed', detail: msg });
  }
});

importRouter.get('/enrichment-status', async (_req, res) => {
  try {
    const status = await getEnrichmentStatus();
    res.json(status);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Status check failed', detail: msg });
  }
});
