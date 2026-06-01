import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  // Seed credentials for the platform (admin) account. Admins are provisioned,
  // not self-registered — `npm run seed` upserts this user. Override in prod.
  ADMIN_EMAIL: z.string().email().default('admin@canopy.example'),
  ADMIN_PASSWORD: z.string().min(8).default('admin12345'),
  ADMIN_NAME: z.string().min(1).default('Canopy Admin'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof EnvSchema>;
