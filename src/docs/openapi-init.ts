import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Monkey-patches z with .openapi() helpers. Must run once, before any registry
// path is registered. Import this module for side effect first in openapi.ts.
extendZodWithOpenApi(z);
