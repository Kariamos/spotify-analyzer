import express from 'express';
import { validateEnv, env } from './config/env';
import { initDatabase, closeDatabase } from './config/database';
import { initSpotifyClient } from './config/spotify-client';

async function main() {
  try {
    // Validate configuration
    validateEnv();
    console.log('✅ Environment validated');

    // Initialize database
    initDatabase();
    console.log('✅ Database initialized');

    // Initialize Spotify client
    initSpotifyClient();
    console.log('✅ Spotify client initialized');

    // Create Express app
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date() });
    });

    // Placeholder routes
    app.get('/api/auth/login', (req, res) => {
      res.json({ message: 'OAuth login route - TODO' });
    });

    app.get('/api/insights/:period', (req, res) => {
      res.json({ message: 'Insights route - TODO', period: req.params.period });
    });

    // Start server
    const port = env.app.port;
    app.listen(port, () => {
      console.log(`🎵 Spotify Analyzer running on port ${port}`);
      console.log(`📝 Environment: ${env.app.env}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...');
      closeDatabase();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

main();
