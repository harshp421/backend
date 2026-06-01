import { env } from './config/env.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[canopy] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string): void {
  console.log(`[canopy] ${signal} received, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
