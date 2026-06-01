import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  SubmitPlotBodySchema,
  VerifyPlotBodySchema,
  PlotIdParamsSchema,
} from './plots.types.js';
import * as controller from './plots.controller.js';

export const plotsRouter = Router();

// Farmer endpoints
plotsRouter.post(
  '/',
  requireAuth,
  requireRole('farmer'),
  validate({ body: SubmitPlotBodySchema }),
  asyncHandler(controller.submitPlot),
);

plotsRouter.get(
  '/mine',
  requireAuth,
  requireRole('farmer'),
  asyncHandler(controller.listMyPlots),
);

// Platform endpoints
plotsRouter.get(
  '/pending',
  requireAuth,
  requireRole('platform'),
  asyncHandler(controller.listPendingPlots),
);

plotsRouter.post(
  '/:id/verify',
  requireAuth,
  requireRole('platform'),
  validate({ params: PlotIdParamsSchema, body: VerifyPlotBodySchema }),
  asyncHandler(controller.verifyPlot),
);

plotsRouter.post(
  '/:id/reject',
  requireAuth,
  requireRole('platform'),
  validate({ params: PlotIdParamsSchema }),
  asyncHandler(controller.rejectPlot),
);
