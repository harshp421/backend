import express, { type Request, type Response } from 'express';
import { errorHandler, notFoundHandler } from './errors/errorHandler.js';
import { pool } from './db/pool.js';
import { mountDocs } from './docs/openapi.js';
import { authRouter } from './features/auth/auth.routes.js';
import { plotsRouter } from './features/plots/plots.routes.js';
import {
  marketRouter,
  creditsRouter,
  ledgerRouter,
  certificatesRouter,
} from './features/credits/credits.routes.js';
import {
  walletRouter,
  revenueRouter,
} from './features/wallet/wallet.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  // ---- Operational routes -------------------------------------------------

  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Canopy API',
      version: '0.1.0',
      docs: '/docs',
      health: '/health',
    });
  });

  app.get('/health', async (_req: Request, res: Response) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  // ---- API docs -----------------------------------------------------------
  // Mount before feature routers so /docs and /docs.json don't collide with anything.
  mountDocs(app);

  // ---- Feature routers ----------------------------------------------------

  app.use('/auth', authRouter);
  app.use('/plots', plotsRouter);
  app.use('/market', marketRouter);
  app.use('/credits', creditsRouter);
  app.use('/ledger', ledgerRouter);
  app.use('/certificates', certificatesRouter);
  app.use('/wallet', walletRouter);
  app.use('/revenue', revenueRouter);

  // ---- 404 + error handler — must be LAST --------------------------------

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
