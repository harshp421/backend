import { queryOne, queryRows, withTransaction } from '../../db/query.js';
import { BadRequestError, ConflictError } from '../../errors/AppError.js';
import {
  calculateGrossTonnes,
  applyBuffer,
  plotAgeDays,
  MIN_PLOT_AGE_DAYS,
  PRICE,
} from '../../config/carbon.js';
import {
  PlotRowSchema,
  FarmerPlotRowSchema,
  type SubmitPlotBody,
  type PlotRow,
  type FarmerPlotRow,
  type VerifyPlotBody,
} from './plots.types.js';
import { CreditRowSchema, type CreditRow } from '../credits/credits.types.js';

export async function submitPlot(
  farmerId: string,
  input: SubmitPlotBody,
): Promise<PlotRow> {
  // Maturity gate: trees must be at least 12 months old. This also rejects
  // future-dated plots (negative age). Carbon accrues from planting, so a
  // brand-new plot has captured nothing worth crediting yet.
  const ageDays = plotAgeDays(input.planting_date);
  if (ageDays < MIN_PLOT_AGE_DAYS) {
    const months = Math.max(0, Math.floor(ageDays / 30));
    throw new BadRequestError(
      `Trees must be at least 12 months old to register for credits. ` +
        `This plot is about ${months} month${months === 1 ? '' : 's'} old.`,
    );
  }

  const gross = calculateGrossTonnes(input.species, input.tree_count, input.planting_date);
  return queryOne(
    PlotRowSchema,
    `INSERT INTO plots (farmer_id, species, tree_count, planting_date, estimate_tonnes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [farmerId, input.species, input.tree_count, input.planting_date, gross],
  );
}

export function listMyPlots(farmerId: string): Promise<FarmerPlotRow[]> {
  // Join each plot to the credit it produced (a plot yields 0 or 1 credit) and
  // to that credit's payout, so the farmer can see which plot's credit sold and
  // how much it earned. Credit/payout fields are null until verified / sold.
  return queryRows(
    FarmerPlotRowSchema,
    `SELECT
       p.*,
       c.id              AS credit_id,
       c.status          AS credit_status,
       c.tonnes_issued   AS tonnes_issued,
       c.price_per_tonne AS price_per_tonne,
       c.certificate_id  AS certificate_id,
       po.farmer_amount  AS earned
     FROM plots p
     LEFT JOIN credits c  ON c.plot_id = p.id
     LEFT JOIN payouts po ON po.credit_id = c.id
     WHERE p.farmer_id = $1
     ORDER BY p.created_at DESC`,
    [farmerId],
  );
}

export function listPendingPlots(): Promise<PlotRow[]> {
  return queryRows(
    PlotRowSchema,
    `SELECT * FROM plots WHERE status = 'submitted' ORDER BY created_at ASC`,
  );
}

/**
 * Reject a submitted plot. Like verify, only a 'submitted' plot can be acted on
 * (integrity rule #1 — no backward/illegal transitions). Rejecting issues no
 * credit and writes no ledger event; it simply closes the plot as rejected.
 * Row-locked so it can't race a concurrent verify of the same plot.
 */
export async function rejectPlot(plotId: string): Promise<PlotRow> {
  return withTransaction(async (client) => {
    const plot = await queryOne(
      PlotRowSchema,
      'SELECT * FROM plots WHERE id = $1 FOR UPDATE',
      [plotId],
      client,
    );

    if (plot.status !== 'submitted') {
      throw new ConflictError(`Cannot reject plot in status '${plot.status}'`);
    }

    return queryOne(
      PlotRowSchema,
      `UPDATE plots SET status = 'rejected' WHERE id = $1 RETURNING *`,
      [plotId],
      client,
    );
  });
}

/**
 * Verify a plot and issue + list its credit, atomically.
 *
 * Per integrity rule #4: every state change writes to ledger_events.
 * Per integrity rule #1: only 'submitted' plots can be verified.
 *
 * The whole flow runs in one transaction with row-level locking, so concurrent
 * verifications of the same plot can't double-issue credits.
 */
export async function verifyPlot(
  plotId: string,
  platformUserId: string,
  input: VerifyPlotBody,
): Promise<CreditRow> {
  return withTransaction(async (client) => {
    const plot = await queryOne(
      PlotRowSchema,
      'SELECT * FROM plots WHERE id = $1 FOR UPDATE',
      [plotId],
      client,
    );

    if (plot.status !== 'submitted') {
      throw new ConflictError(`Cannot verify plot in status '${plot.status}'`);
    }

    await client.query(
      `UPDATE plots SET status = 'verified' WHERE id = $1`,
      [plotId],
    );

    const tonnesIssued = applyBuffer(plot.estimate_tonnes);
    if (tonnesIssued <= 0) {
      throw new ConflictError('Plot estimate is too low to issue any credits');
    }

    const credit = await queryOne(
      CreditRowSchema,
      `INSERT INTO credits (plot_id, tonnes_issued, tier, price_per_tonne, status)
       VALUES ($1, $2, $3, $4, 'listed')
       RETURNING *`,
      [plotId, tonnesIssued, input.tier, PRICE],
      client,
    );

    // Two ledger events: the credit was issued, then listed. Both are real state
    // changes in the lifecycle even though they happen in one transaction.
    await client.query(
      `INSERT INTO ledger_events (credit_id, event, actor_id, detail)
       VALUES ($1, 'issued', $2, $3::jsonb)`,
      [
        credit.id,
        platformUserId,
        JSON.stringify({ plot_id: plotId, tonnes_issued: tonnesIssued, tier: input.tier }),
      ],
    );
    await client.query(
      `INSERT INTO ledger_events (credit_id, event, actor_id, detail)
       VALUES ($1, 'listed', $2, $3::jsonb)`,
      [credit.id, platformUserId, JSON.stringify({ price_per_tonne: PRICE })],
    );

    return credit;
  });
}
