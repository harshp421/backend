// Vercel serverless entry point.
//
// Vercel runs functions, not a long-lived server, so there is NO app.listen here
// (that lives in src/server.ts for local dev). An Express app is itself a
// (req, res) handler, so exporting it as default is a valid Vercel function.
//
// We import the COMPILED app from ../dist (produced by `npm run build`, which the
// vercel.json buildCommand runs before functions are bundled). Importing plain
// JS sidesteps any TS/ESM `.js`-specifier resolution quirks in the bundler.
import { createApp } from '../dist/app.js';

export default createApp();
