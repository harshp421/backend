import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  SubmitPlotBodySchema,
  VerifyPlotBodySchema,
  PlotIdParamsSchema,
  PlotRowSchema,
} from './plots.types.js';
import { CreditRowSchema } from '../credits/credits.types.js';

export function registerPlotsDocs(registry: OpenAPIRegistry): void {
  registry.registerPath({
    method: 'post',
    path: '/plots',
    tags: ['Plots'],
    summary: 'Farmer submits a plot; server runs the carbon calc (spec §5)',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { 'application/json': { schema: SubmitPlotBodySchema } },
      },
    },
    responses: {
      201: {
        description: 'Plot recorded with computed estimate_tonnes (gross, no buffer)',
        content: { 'application/json': { schema: PlotRowSchema } },
      },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: farmer' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/plots/mine',
    tags: ['Plots'],
    summary: "List the current farmer's plots",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "All plots owned by the authenticated farmer",
        content: { 'application/json': { schema: z.array(PlotRowSchema) } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: farmer' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/plots/pending',
    tags: ['Plots'],
    summary: 'Platform queue: all plots awaiting verification',
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: 'Plots with status = submitted, oldest first',
        content: { 'application/json': { schema: z.array(PlotRowSchema) } },
      },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: platform' },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/plots/{id}/verify',
    tags: ['Plots'],
    summary:
      'Platform verifies a plot, issues a credit (status listed), writes issued + listed ledger events — all atomically',
    security: [{ bearerAuth: [] }],
    request: {
      params: PlotIdParamsSchema,
      body: {
        content: { 'application/json': { schema: VerifyPlotBodySchema } },
      },
    },
    responses: {
      201: {
        description: 'Newly issued credit (status = listed)',
        content: { 'application/json': { schema: CreditRowSchema } },
      },
      400: { description: 'Validation error' },
      401: { description: 'Unauthorized' },
      403: { description: 'Requires role: platform' },
      404: { description: 'Plot not found' },
      409: { description: 'Plot not in submitted status, or estimate too low to issue' },
    },
  });
}
