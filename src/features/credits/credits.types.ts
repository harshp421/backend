import { z } from 'zod';

export const CreditStatusSchema = z.enum([
  'issued',
  'listed',
  'sold',
  'retired',
  'reversed',
]);
export type CreditStatus = z.infer<typeof CreditStatusSchema>;

export const TierSchema = z.enum(['A', 'B', 'C']);
export type Tier = z.infer<typeof TierSchema>;

export const CreditIdParamsSchema = z.object({
  id: z.string().uuid(),
});
export type CreditIdParams = z.infer<typeof CreditIdParamsSchema>;

export const CertificateIdParamsSchema = z.object({
  id: z.string().regex(/^CERT-\d{8}-[A-Z0-9]{8}$/),
});
export type CertificateIdParams = z.infer<typeof CertificateIdParamsSchema>;

// ---- DB row shape (matches credits table) ------------------------------

export const CreditRowSchema = z.object({
  id: z.string().uuid(),
  plot_id: z.string().uuid(),
  tonnes_issued: z.number().int(),
  tier: TierSchema,
  price_per_tonne: z.coerce.number(),
  status: CreditStatusSchema,
  owner_id: z.string().uuid().nullable(),
  certificate_id: z.string().nullable(),
  created_at: z.coerce.date(),
});
export type CreditRow = z.infer<typeof CreditRowSchema>;

// ---- Joined views for market / ledger / certificate --------------------

export const MarketCreditRowSchema = CreditRowSchema.extend({
  plot_species: z.string(),
  plot_tree_count: z.number().int(),
  plot_planting_date: z.coerce.date(),
  farmer_name: z.string(),
});
export type MarketCreditRow = z.infer<typeof MarketCreditRowSchema>;

export const LedgerRowSchema = CreditRowSchema.extend({
  plot_species: z.string(),
  farmer_id: z.string().uuid(),
  farmer_name: z.string(),
});
export type LedgerRow = z.infer<typeof LedgerRowSchema>;

export const CertificateRowSchema = CreditRowSchema.extend({
  plot_species: z.string(),
  plot_tree_count: z.number().int(),
  plot_planting_date: z.coerce.date(),
  farmer_name: z.string(),
  owner_name: z.string().nullable(),
  retired_at: z.coerce.date().nullable(),
});
export type CertificateRow = z.infer<typeof CertificateRowSchema>;
