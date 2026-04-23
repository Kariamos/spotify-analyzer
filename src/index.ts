import express from 'express';
import cors from 'cors';
import { validateEnv, env } from './config/env.js';
import { initDatabase, closeDatabase } from './config/database.js';
import { authRouter } from './routes/auth.routes.js';
import { insightsRouter } from './routes/insights.routes.js';

async function main() {
  validateEnv();

  await initDatabase();

  const app = express();
  app.use(express.json());
  app.use(cors({
    origin: ['http://127.0.0.1:5173', 'http://localhost:5173'],
    credentials: true,
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/insights', insightsRouter);

  const port = env.app.port;
  app.listen(port, '127.0.0.1', () => {
    console.log(`🎵 Spotify Analyzer on http://127.0.0.1:${port}`);
    console.log(`🔐 Login: http://127.0.0.1:${port}/api/auth/login`);
  });

  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Startup error:', err);
  process.exit(1);
});
