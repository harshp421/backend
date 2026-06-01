// Seed the platform (admin) account.
//
// Admins are NOT self-registered — there is no admin sign-up in the platform UI.
// This script upserts a single `platform` user from the ADMIN_* env vars so the
// admin console always has a way in. Idempotent: re-running it is a no-op.
//
//   npm run seed
//
// Credentials come from env (see .env / config/env.ts), defaulting to:
//   email:    admin@canopy.example
//   password: admin12345

import { pool } from './pool.js';
import { hashPassword } from '../utils/password.js';
import { env } from '../config/env.js';

async function seed(): Promise<void> {
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ($1, $2, 'platform', $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [env.ADMIN_EMAIL, passwordHash, env.ADMIN_NAME],
  );

  if (rows.length > 0) {
    console.log(`✓ Seeded platform admin: ${env.ADMIN_EMAIL}`);
    console.log(`  Sign in at the platform panel with this email + ADMIN_PASSWORD.`);
  } else {
    console.log(`• Admin already exists: ${env.ADMIN_EMAIL} — no change.`);
    console.log(`  (Password is not reset by re-seeding. Delete the row to re-seed.)`);
  }
}

seed()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await pool.end();
    process.exit(1);
  });
