import { queryOne, queryRows, queryMaybeOne, withTransaction } from '../../db/query.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';
import { splitAmount } from '../../config/carbon.js';
import { generateCertificateId } from '../../utils/certificate.js';
import {
  CreditRowSchema,
  MarketCreditRowSchema,
  LedgerRowSchema,
  CertificateRowSchema,
  type CreditRow,
  type MarketCreditRow,
  type LedgerRow,
  type CertificateRow,
} from './credits.types.js';

export function listMarket(): Promise<MarketCreditRow[]> {
  return queryRows(
    MarketCreditRowSchema,
    `SELECT c.*,
            p.species       AS plot_species,
            p.tree_count    AS plot_tree_count,
            p.planting_date AS plot_planting_date,
            u.name          AS farmer_name
       FROM credits c
       JOIN plots   p ON p.id = c.plot_id
       JOIN users   u ON u.id = p.farmer_id
      WHERE c.status = 'listed'
      ORDER BY c.created_at DESC`,
  );
}

export function listMyCredits(ownerId: string): Promise<CreditRow[]> {
  return queryRows(
    CreditRowSchema,
    'SELECT * FROM credits WHERE owner_id = $1 ORDER BY created_at DESC',
    [ownerId],
  );
}

export function listLedger(): Promise<LedgerRow[]> {
  return queryRows(
    LedgerRowSchema,
    `SELECT c.*,
            p.species   AS plot_species,
            p.farmer_id AS farmer_id,
            u.name      AS farmer_name
       FROM credits c
       JOIN plots   p ON p.id = c.plot_id
       JOIN users   u ON u.id = p.farmer_id
      ORDER BY c.created_at DESC`,
  );
}

/**
 * Buy a listed credit. Atomically: lock the credit, verify status, flip to
 * 'sold', insert the 70/30 payout split, and write a 'sold' ledger event.
 *
 * Enforces integrity rules #1 (forward-only) and #3 (sold once). SELECT ...
 * FOR UPDATE prevents two concurrent buyers from racing.
 */
export async function buyCredit(creditId: string, buyerId: string): Promise<CreditRow> {
  return withTransaction(async (client) => {
    const credit = await queryOne(
      CreditRowSchema,
      'SELECT * FROM credits WHERE id = $1 FOR UPDATE',
      [creditId],
      client,
    );

    if (credit.status !== 'listed') {
      throw new ConflictError(`Cannot buy credit in status '${credit.status}'`);
    }

    // Need farmer_id to attribute the payout.
    const plot = await queryOne(
      // We only need farmer_id, but a minimal schema is fine here.
      // (Inline schema kept local since this is the only place we read just farmer_id.)
      LedgerRowSchema.pick({ farmer_id: true }),
      'SELECT farmer_id FROM plots WHERE id = $1',
      [credit.plot_id],
      client,
    );

    const total = credit.tonnes_issued * credit.price_per_tonne;
    const split = splitAmount(total);

    const updated = await queryOne(
      CreditRowSchema,
      `UPDATE credits
          SET status = 'sold', owner_id = $2
        WHERE id = $1
        RETURNING *`,
      [creditId, buyerId],
      client,
    );

    await client.query(
      `INSERT INTO payouts
         (credit_id, farmer_id, total_amount, farmer_amount, platform_amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [creditId, plot.farmer_id, total, split.farmer, split.platform],
    );

    await client.query(
      `INSERT INTO ledger_events (credit_id, event, actor_id, detail)
       VALUES ($1, 'sold', $2, $3::jsonb)`,
      [
        creditId,
        buyerId,
        JSON.stringify({
          buyer_id: buyerId,
          total_amount: total,
          farmer_amount: split.farmer,
          platform_amount: split.platform,
        }),
      ],
    );

    return updated;
  });
}

/**
 * Retire a sold credit. Atomically: lock, verify owner + status, generate
 * certificate, flip to 'retired', write 'retired' ledger event.
 *
 * Enforces integrity rule #2 (retired is final — any subsequent write will
 * fail the status check). Only the current owner can retire.
 */
export async function retireCredit(
  creditId: string,
  ownerId: string,
): Promise<CreditRow> {
  return withTransaction(async (client) => {
    const credit = await queryOne(
      CreditRowSchema,
      'SELECT * FROM credits WHERE id = $1 FOR UPDATE',
      [creditId],
      client,
    );

    if (credit.owner_id !== ownerId) {
      throw new ForbiddenError('Only the credit owner can retire it');
    }
    if (credit.status !== 'sold') {
      throw new ConflictError(`Cannot retire credit in status '${credit.status}'`);
    }

    const certificateId = generateCertificateId();

    const updated = await queryOne(
      CreditRowSchema,
      `UPDATE credits
          SET status = 'retired', certificate_id = $2
        WHERE id = $1
        RETURNING *`,
      [creditId, certificateId],
      client,
    );

    await client.query(
      `INSERT INTO ledger_events (credit_id, event, actor_id, detail)
       VALUES ($1, 'retired', $2, $3::jsonb)`,
      [creditId, ownerId, JSON.stringify({ certificate_id: certificateId })],
    );

    return updated;
  });
}

export async function getCertificate(certificateId: string): Promise<CertificateRow> {
  const row = await queryMaybeOne(
    CertificateRowSchema,
    `SELECT c.*,
            p.species       AS plot_species,
            p.tree_count    AS plot_tree_count,
            p.planting_date AS plot_planting_date,
            farmer.name     AS farmer_name,
            owner.name      AS owner_name,
            (SELECT created_at
               FROM ledger_events
              WHERE credit_id = c.id AND event = 'retired'
              ORDER BY created_at DESC LIMIT 1) AS retired_at
       FROM credits c
       JOIN plots   p      ON p.id  = c.plot_id
       JOIN users   farmer ON farmer.id = p.farmer_id
       LEFT JOIN users owner ON owner.id = c.owner_id
      WHERE c.certificate_id = $1
        AND c.status = 'retired'`,
    [certificateId],
  );
  if (!row) throw new NotFoundError('Certificate not found');
  return row;
}
