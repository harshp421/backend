import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';

export const TokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(['farmer', 'platform', 'org']),
});
export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

export function signToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  // Re-parse: trust nothing that wasn't validated.
  return TokenPayloadSchema.parse(decoded);
}
