import { queryOne } from '../../db/query.js';
import {
  WalletSchema,
  RevenueSchema,
  type Wallet,
  type Revenue,
} from './wallet.types.js';

export function getFarmerWallet(farmerId: string): Promise<Wallet> {
  return queryOne(
    WalletSchema,
    `SELECT COALESCE(SUM(farmer_amount), 0) AS farmer_amount_total
       FROM payouts
      WHERE farmer_id = $1`,
    [farmerId],
  );
}

export function getPlatformRevenue(): Promise<Revenue> {
  return queryOne(
    RevenueSchema,
    `SELECT COALESCE(SUM(platform_amount), 0) AS platform_amount_total
       FROM payouts`,
  );
}
