import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  CreditIdParamsSchema,
  CertificateIdParamsSchema,
  CreditRowSchema,
  MarketCreditRowSchema,
  LedgerRowSchema,
  CertificateRowSchema,
} from './credits.types.js';

export function registerCreditsDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/market',
    tags: ['Credits'],
    summary: 'All credits currently listed for sale, with plot provenance',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Listed credits joined with plot + farmer',
        content: { 'application/json': { schema: z.array(MarketCreditRowSchema) } },
      },
      401: { description: 'Unauthorized' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/credits/mine',
    tags: ['Credits'],
    summary: "Credits currently owned by the authenticated org",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Credits where owner_id = current user',
        content: { 'application/json': { schema: z.array(CreditRowSchema) } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: org' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/credits/{id}/buy',
    tags: ['Credits'],
    summary:
      'Org buys a listed credit. Atomic: lock → flip to sold → insert payout (70/30 split) → write sold ledger event',
    security: [{ bearerAuth: [] }],
    request: { params: CreditIdParamsSchema },
    responses: {
      200: {
        description: 'Updated credit (status = sold, owner_id = buyer)',
        content: { 'application/json': { schema: CreditRowSchema } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: org' },
      404: { description: 'Credit not found' },
      409: { description: 'Credit not in listed status (already sold/retired)' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/credits/{id}/retire',
    tags: ['Credits'],
    summary:
      'Owner retires a sold credit. Atomic: lock → owner check → generate certificate → flip to retired → write retired ledger event. Retired credits are FINAL.',
    security: [{ bearerAuth: [] }],
    request: { params: CreditIdParamsSchema },
    responses: {
      200: {
        description: 'Updated credit (status = retired, certificate_id set)',
        content: { 'application/json': { schema: CreditRowSchema } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Not the credit owner, or wrong role' },
      404: { description: 'Credit not found' },
      409: { description: 'Credit not in sold status' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/ledger',
    tags: ['Credits'],
    summary: 'Full credit ledger view — every credit + current state + farmer',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'All credits, newest first, joined with plot + farmer',
        content: { 'application/json': { schema: z.array(LedgerRowSchema) } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: platform' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/certificates/{id}',
    tags: ['Credits'],
    summary: 'Public-style certificate detail for a retired credit',
    security: [{ bearerAuth: [] }],
    request: { params: CertificateIdParamsSchema },
    responses: {
      200: {
        description: 'Certificate detail (credit + plot + farmer + owner + retired_at)',
        content: { 'application/json': { schema: CertificateRowSchema } },
      },
      400: { description: 'Malformed certificate id' },
      401: { description: 'Unauthorized' },
      404: { description: 'Certificate not found (or credit not yet retired)' },
    },
  });
}
