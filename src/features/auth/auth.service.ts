import { queryOne, queryMaybeOne } from '../../db/query.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { ConflictError, UnauthorizedError } from '../../errors/AppError.js';
import {
  UserRowSchema,
  type RegisterBody,
  type LoginBody,
  type AuthResponse,
} from './auth.types.js';

export async function registerUser(input: RegisterBody): Promise<AuthResponse> {
  const existing = await queryMaybeOne(
    UserRowSchema,
    'SELECT * FROM users WHERE email = $1',
    [input.email],
  );
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await hashPassword(input.password);
  const user = await queryOne(
    UserRowSchema,
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email, passwordHash, input.role, input.name],
  );

  const { password_hash: _omit, ...publicUser } = user;
  return {
    user: publicUser,
    token: signToken({ sub: user.id, role: user.role }),
  };
}

export async function loginUser(input: LoginBody): Promise<AuthResponse> {
  const user = await queryMaybeOne(
    UserRowSchema,
    'SELECT * FROM users WHERE email = $1',
    [input.email],
  );
  // Same error for "no user" and "wrong password" — no enumeration leak.
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const ok = await verifyPassword(input.password, user.password_hash);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  const { password_hash: _omit, ...publicUser } = user;
  return {
    user: publicUser,
    token: signToken({ sub: user.id, role: user.role }),
  };
}
