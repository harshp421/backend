import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../errors/AppError.js';
import * as service from './plots.service.js';
import type {
  SubmitPlotBody,
  VerifyPlotBody,
  PlotIdParams,
} from './plots.types.js';

export async function submitPlot(
  req: Request<Record<string, never>, unknown, SubmitPlotBody>,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const plot = await service.submitPlot(req.user.sub, req.body);
  res.status(201).json(plot);
}

export async function listMyPlots(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const plots = await service.listMyPlots(req.user.sub);
  res.json(plots);
}

export async function listPendingPlots(_req: Request, res: Response): Promise<void> {
  const plots = await service.listPendingPlots();
  res.json(plots);
}

export async function verifyPlot(
  req: Request<PlotIdParams, unknown, VerifyPlotBody>,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const credit = await service.verifyPlot(req.params.id, req.user.sub, req.body);
  res.status(201).json(credit);
}

export async function rejectPlot(
  req: Request<PlotIdParams>,
  res: Response,
): Promise<void> {
  if (!req.user) throw new UnauthorizedError();
  const plot = await service.rejectPlot(req.params.id);
  res.status(200).json(plot);
}
