import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { WalletSchema, RevenueSchema } from './wallet.types.js';

export function registerWalletDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'get',
    path: '/wallet',
    tags: ['Wallet'],
    summary: "Sum of farmer_amount across this farmer's payouts",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Cumulative farmer earnings (USD)',
        content: { 'application/json': { schema: WalletSchema } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: farmer' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/revenue',
    tags: ['Wallet'],
    summary: 'Sum of platform_amount across all payouts',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Cumulative platform revenue (USD)',
        content: { 'application/json': { schema: RevenueSchema } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: platform' },
    },
  });
}
