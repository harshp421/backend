import { z } from 'zod';

// Spec §5 — placeholders for the MVP. Real allometric calculation is Phase 2.
export const SPECIES_FACTORS = {
  acacia: 0.041,
  teak: 0.060,
  eucalyptus: 0.052,
  mango: 0.038,
  bamboo: 0.030,
} as const;

export const SpeciesSchema = z.enum(['acacia', 'teak', 'eucalyptus', 'mango', 'bamboo']);
export type Species = z.infer<typeof SpeciesSchema>;

export const BUFFER = 0.15;           // reserve held back at issuance
export const PRICE = 18;              // USD per tonne
export const FARMER_SHARE = 0.70;
export const PLATFORM_SHARE = 0.30;

const MAX_AGE = 12;                   // sequestration is capped at 12 years
const DAYS_PER_YEAR = 365.25;

/**
 * Trees must be at least this old before they can be registered for credits.
 * Carbon accrues continuously from planting; a brand-new plot has captured ~0,
 * so we gate submissions until they have meaningfully grown (12 months).
 */
export const MIN_PLOT_AGE_DAYS = 365;

/** Whole days elapsed since planting. Negative for future-dated plots. */
export function plotAgeDays(plantingDate: Date, now: Date = new Date()): number {
  return (now.getTime() - plantingDate.getTime()) / 86_400_000;
}

/**
 * Age in years used by the formula: real elapsed time (day-precise), clamped to
 * [0, 12]. A plot planted today is ~0 years old → ~0 tonnes; it accrues daily.
 */
export function ageYears(plantingDate: Date, now: Date = new Date()): number {
  const years = plotAgeDays(plantingDate, now) / DAYS_PER_YEAR;
  return Math.min(MAX_AGE, Math.max(0, years));
}

export function calculateGrossTonnes(
  species: Species,
  treeCount: number,
  plantingDate: Date,
): number {
  const factor = SPECIES_FACTORS[species];
  return treeCount * factor * ageYears(plantingDate);
}

export function applyBuffer(grossTonnes: number): number {
  return Math.round(grossTonnes * (1 - BUFFER));
}

export function splitAmount(total: number): { farmer: number; platform: number } {
  // Round farmer share to cents, give the rounding remainder to platform so they sum exactly.
  const farmer = Math.round(total * FARMER_SHARE * 100) / 100;
  const platform = Math.round((total - farmer) * 100) / 100;
  return { farmer, platform };
}
