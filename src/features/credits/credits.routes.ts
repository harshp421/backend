import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CreditIdParamsSchema, CertificateIdParamsSchema } from './credits.types.js';
import * as controller from './credits.controller.js';

// Mounted at /market, /credits, /ledger, /certificates in app.ts —
// these are conceptually one resource (the credit) viewed three ways,
// so they share a controller but split routers for clarity.

export const marketRouter = Router();
marketRouter.get('/', requireAuth, asyncHandler(controller.listMarket));

export const creditsRouter = Router();
creditsRouter.get(
  '/mine',
  requireAuth,
  requireRole('org'),
  asyncHandler(controller.listMyCredits),
);
creditsRouter.post(
  '/:id/buy',
  requireAuth,
  requireRole('org'),
  validate({ params: CreditIdParamsSchema }),
  asyncHandler(controller.buyCredit),
);
creditsRouter.post(
  '/:id/retire',
  requireAuth,
  requireRole('org'),
  validate({ params: CreditIdParamsSchema }),
  asyncHandler(controller.retireCredit),
);

export const ledgerRouter = Router();
ledgerRouter.get(
  '/',
  requireAuth,
  requireRole('platform'),
  asyncHandler(controller.listLedger),
);

export const certificatesRouter = Router();
certificatesRouter.get(
  '/:id',
  requireAuth,
  validate({ params: CertificateIdParamsSchema }),
  asyncHandler(controller.getCertificate),
);
