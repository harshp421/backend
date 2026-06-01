import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { RegisterBodySchema, LoginBodySchema } from './auth.types.js';
import * as controller from './auth.controller.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validate({ body: RegisterBodySchema }),
  asyncHandler(controller.register),
);

authRouter.post(
  '/login',
  validate({ body: LoginBodySchema }),
  asyncHandler(controller.login),
);
