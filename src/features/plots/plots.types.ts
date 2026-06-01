import { z } from 'zod';
import { SpeciesSchema } from '../../config/carbon.js';

// ---- Requests ----------------------------------------------------------

export const SubmitPlotBodySchema = z.object({
  species: SpeciesSchema,
  tree_count: z.number().int().positive(),
  planting_date: z.coerce.date(),
});
export type SubmitPlotBody = z.infer<typeof SubmitPlotBodySchema>;

export const VerifyPlotBodySchema = z.object({
  tier: z.enum(['A', 'B', 'C']),
});
export type VerifyPlotBody = z.infer<typeof VerifyPlotBodySchema>;

export const PlotIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type PlotIdParams = z.infer<typeof PlotIdParamsSchema>;

// ---- DB row shape (matches plots table) --------------------------------

export const PlotStatusSchema = z.enum(['submitted', 'verified', 'rejected']);
export type PlotStatus = z.infer<typeof PlotStatusSchema>;

export const PlotRowSchema = z.object({
  id: z.string().uuid(),
  farmer_id: z.string().uuid(),
  species: z.string(),
  tree_count: z.number().int(),
  planting_date: z.coerce.date(),
  estimate_tonnes: z.coerce.number(),
  status: PlotStatusSchema,
  created_at: z.coerce.date(),
});
export type PlotRow = z.infer<typeof PlotRowSchema>;

// Farmer-facing view: a plot plus the lifecycle of the credit it produced (if
// verified) and what it has earned (if its credit sold). All credit/payout
// fields are null until the plot is verified / its credit is bought.
export const FarmerPlotRowSchema = PlotRowSchema.extend({
  credit_id: z.string().uuid().nullable(),
  credit_status: z.enum(['issued', 'listed', 'sold', 'retired', 'reversed']).nullable(),
  tonnes_issued: z.number().int().nullable(),
  price_per_tonne: z.coerce.number().nullable(),
  certificate_id: z.string().nullable(),
  /** The farmer's 70% payout for this plot — set once the credit is sold. */
  earned: z.coerce.number().nullable(),
});
export type FarmerPlotRow = z.infer<typeof FarmerPlotRowSchema>;
