import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as controller from './wallet.controller.js';

export const walletRouter = Router();
walletRouter.get(
  '/',
  requireAuth,
  requireRole('farmer'),
  asyncHandler(controller.getFarmerWallet),
);

export const revenueRouter = Router();
revenueRouter.get(
  '/',
  requireAuth,
  requireRole('platform'),
  asyncHandler(controller.getPlatformRevenue),
);
