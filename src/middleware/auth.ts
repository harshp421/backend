import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken, type TokenPayload } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }
  try {
    req.user = verifyToken(header.slice('Bearer '.length).trim());
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export function requireRole(...roles: TokenPayload['role'][]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(', ')}`));
    }
    next();
  };
}
