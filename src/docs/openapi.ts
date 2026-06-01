import './openapi-init.js';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import swaggerUi from 'swagger-ui-express';
import type { Express, Request, Response } from 'express';
import { registerAuthDocs } from '../features/auth/auth.openapi.js';
import { registerPlotsDocs } from '../features/plots/plots.openapi.js';
import { registerCreditsDocs } from '../features/credits/credits.openapi.js';
import { registerWalletDocs } from '../features/wallet/wallet.openapi.js';

const WelcomeSchema = z.object({
  name: z.string(),
  version: z.string(),
  docs: z.string(),
  health: z.string(),
});

const HealthSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
});

function registerOperationalDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/',
    tags: ['System'],
    summary: 'Welcome message and discovery links',
    responses: {
      200: {
        description: 'API metadata',
        content: { 'application/json': { schema: WelcomeSchema } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['System'],
    summary: 'Readiness probe — checks DB connectivity',
    responses: {
      200: {
        description: 'Healthy',
        content: { 'application/json': { schema: HealthSchema } },
      },
      503: {
        description: 'Degraded — DB unreachable',
        content: { 'application/json': { schema: HealthSchema } },
      },
    },
  });
}

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  registerOperationalDocs(registry);
  registerAuthDocs(registry);
  registerPlotsDocs(registry);
  registerCreditsDocs(registry);
  registerWalletDocs(registry);

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Canopy API',
      version: '0.1.0',
      description:
        'Carbon credit marketplace. Three roles: farmer (submits plots), platform (verifies, issues credits, owns the ledger), org (buys + retires credits). See spac/001_poc.md for the full spec.',
    },
    servers: [{ url: 'http://localhost:3000' }],
    tags: [
      { name: 'System', description: 'Welcome + health' },
      { name: 'Auth', description: 'Register + login' },
      { name: 'Plots', description: 'Farmer submissions + platform verification' },
      { name: 'Credits', description: 'Marketplace, buy, retire, certificates, ledger' },
      { name: 'Wallet', description: 'Farmer wallet + platform revenue' },
    ],
  });
}

export function mountDocs(app: Express): void {
  const document = buildOpenApiDocument();

  app.get('/docs.json', (_req: Request, res: Response) => {
    res.json(document);
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(document, {
    customSiteTitle: 'Canopy API — Docs',
  }));
}
