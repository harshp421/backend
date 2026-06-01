# Deploying the Canopy backend to Vercel

The backend is an Express app adapted to run as a **Vercel serverless function**.

## How it's wired

- `api/index.ts` — the serverless entry. Exports the Express app (no `app.listen`).
  Imports the compiled app from `dist/` (built by the `buildCommand`).
- `vercel.json` — `buildCommand: npm run build` (tsc → `dist/`), and a rewrite that
  sends **every** path to the function: `/(.*) → /api`. So `/auth/login`,
  `/plots`, etc. all hit Express with their original path.
- `src/server.ts` (`app.listen`) is still used for **local dev only** (`npm run dev`).
- `bcryptjs` (pure JS) is used instead of native `bcrypt`, which doesn't run in the
  serverless runtime.

## 1. Set Environment Variables (Vercel → Project → Settings → Environment Variables)

These are **required** — the function throws on boot if they're missing (your local
`.env` is NOT deployed):

| Var | Value |
|---|---|
| `DATABASE_URL` | your Neon **pooled** connection string (`...-pooler...?sslmode=require`) |
| `JWT_SECRET` | a 32+ char random string (`openssl rand -base64 48`) |
| `NODE_ENV` | `production` |

Optional:

| Var | Default | Notes |
|---|---|---|
| `CORS_ORIGIN` | `*` | set to your frontend origin(s) to lock it down |
| `ADMIN_EMAIL` | `admin@canopy.example` | platform admin (for `npm run seed`) |
| `ADMIN_PASSWORD` | `admin12345` | change before seeding anything real |
| `ADMIN_NAME` | `Canopy Admin` | |

Redeploy after adding them (env changes don't apply to existing deployments).

## 2. Prepare the database (run once, from your machine)

Vercel can't run migrations. With your local `.env` pointing at Neon:

```bash
npm run migrate:up    # create the 5 tables + enums
npm run seed          # create the platform admin
```

## 3. Deploy

Push to the connected git branch (or `vercel --prod`). Vercel runs `npm run build`,
bundles `api/index.ts`, and serves it.

## 4. Verify

```bash
curl https://<your-app>.vercel.app/health     # {"status":"ok","db":"up"}
curl https://<your-app>.vercel.app/           # API banner
```

## 5. Point the frontends at it

In each frontend (farmer / platform) set `VITE_API_BASE` to the backend URL
(e.g. `https://<your-app>.vercel.app`) and redeploy. Keep `CORS_ORIGIN` permissive
(`*`) or set it to the frontends' origins.

## Notes / gotchas

- **Pooling:** use Neon's *pooler* URL — each serverless instance opens its own small
  pool (`max: 3` in prod).
- The pg `sslmode` deprecation warning in logs is harmless.
- No persistent server, no websockets — fine for this REST API.
