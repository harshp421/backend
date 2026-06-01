import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/AppError.js';
import * as service from './wallet.service.js';

export async function getFarmerWallet(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const wallet = await service.getFarmerWallet(req.user.sub);
  res.json(wallet);
}

export async function getPlatformRevenue(_req: Request, res: Response): Promise<void> {
  const revenue = await service.getPlatformRevenue();
  res.json(revenue);
}
