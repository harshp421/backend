import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Generic over the Request type so controllers typed with route params / bodies
// (e.g. Request<{ id: string }, …>) are accepted without widening to plain Request.
type AsyncFn<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

// Express 4 does not forward async errors automatically. Wrap every async controller.
export const asyncHandler =
  <Req extends Request = Request>(fn: AsyncFn<Req>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
