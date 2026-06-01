import { z } from 'zod';

export const WalletSchema = z.object({
  farmer_amount_total: z.coerce.number(),
});
export type Wallet = z.infer<typeof WalletSchema>;

export const RevenueSchema = z.object({
  platform_amount_total: z.coerce.number(),
});
export type Revenue = z.infer<typeof RevenueSchema>;
