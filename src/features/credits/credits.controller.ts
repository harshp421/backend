import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/AppError.js';
import * as service from './credits.service.js';
import type { CreditIdParams, CertificateIdParams } from './credits.types.js';

export async function listMarket(_req: Request, res: Response): Promise<void> {
  const credits = await service.listMarket();
  res.json(credits);
}

export async function listMyCredits(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const credits = await service.listMyCredits(req.user.sub);
  res.json(credits);
}

export async function listLedger(_req: Request, res: Response): Promise<void> {
  const ledger = await service.listLedger();
  res.json(ledger);
}

export async function buyCredit(
  req: Request<CreditIdParams>,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const credit = await service.buyCredit(req.params.id, req.user.sub);
  res.status(200).json(credit);
}

export async function retireCredit(
  req: Request<CreditIdParams>,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const credit = await service.retireCredit(req.params.id, req.user.sub);
  res.status(200).json(credit);
}

export async function getCertificate(
  req: Request<CertificateIdParams>,
  res: Response,
): Promise<void> {
  const cert = await service.getCertificate(req.params.id);
  res.json(cert);
}
