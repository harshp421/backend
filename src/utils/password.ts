// bcryptjs (pure JS) instead of native bcrypt — native modules don't reliably
// build/run in Vercel's serverless runtime. API-compatible: hash/compare.
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
