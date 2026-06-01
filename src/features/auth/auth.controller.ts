import type { Request, Response } from 'express';
import { registerUser, loginUser } from './auth.service.js';
import type { RegisterBody, LoginBody } from './auth.types.js';

export async function register(
  req: Request<Record<string, never>, unknown, RegisterBody>,
  res: Response,
): Promise<void> {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function login(
  req: Request<Record<string, never>, unknown, LoginBody>,
  res: Response,
): Promise<void> {
  const result = await loginUser(req.body);
  res.json(result);
}
