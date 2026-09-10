import { weeklyCountWave } from "@/lib/kpi-wave";

const WEEKS = 8;
/** A week-over-week drop this steep is worth flagging — it predicts a slow
 * month before it shows up in revenue, since bookings/sends lead paid deals
 * by a few weeks. */
const DECLINE_THRESHOLD_PCT = -20;

export type ActivityTrend = {
  /** Per-week counts, oldest -> newest, including the current in-progress week. */
  wave: number[];
  /** The most recently *completed* week (excludes the still-in-progress current week, which would otherwise always look like a decline). */
  lastWeek: number;
  /** The week before that. */
  priorWeek: number;
  /** % change from priorWeek to lastWeek. */
  deltaPct: number;
  declining: boolean;
};

/**
 * Buckets leading-activity dates (e.g. appointments booked + quotations
 * sent) into trailing weeks and flags a meaningful week-over-week drop —
 * this is the signal that should worry a manager before it turns into a
 * missed target, not after.
 */
export function computeActivityTrend(
  dates: (string | null | undefined)[]
): ActivityTrend {
  const wave = weeklyCountWave(dates, WEEKS);
  const lastWeek = wave[wave.length - 2] ?? 0;
  const priorWeek = wave[wave.length - 3] ?? 0;
  const deltaPct =
    priorWeek === 0
      ? lastWeek === 0
        ? 0
        : 100
      : Math.round(((lastWeek - priorWeek) / priorWeek) * 100);

  return {
    wave,
    lastWeek,
    priorWeek,
    deltaPct,
    declining: deltaPct <= DECLINE_THRESHOLD_PCT,
  };
}
