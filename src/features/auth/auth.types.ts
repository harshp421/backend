import { z } from 'zod';

export const RoleSchema = z.enum(['farmer', 'platform', 'org']);
export type Role = z.infer<typeof RoleSchema>;

// ---- Requests ----------------------------------------------------------

export const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: RoleSchema,
  name: z.string().min(1).max(120),
});
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

// ---- DB row shape (matches users table) --------------------------------

export const UserRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(),
  role: RoleSchema,
  name: z.string(),
  created_at: z.coerce.date(),
});
export type UserRow = z.infer<typeof UserRowSchema>;

// ---- Public-facing shape -----------------------------------------------

export const PublicUserSchema = UserRowSchema.omit({ password_hash: true });
export type PublicUser = z.infer<typeof PublicUserSchema>;

export const AuthResponseSchema = z.object({
  user: PublicUserSchema,
  token: z.string(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
