export type TargetStatus = "on_track" | "at_risk" | "behind";

/**
 * Flat achievement-% thresholds, matching the "Below target" threshold
 * already used by needsAttention() in lib/sales-analytics.ts.
 */
export function getTargetStatus(achievementPct: number): TargetStatus {
  if (achievementPct >= 90) return "on_track";
  if (achievementPct >= 70) return "at_risk";
  return "behind";
}

export const targetStatusLabels: Record<TargetStatus, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
};

export const targetStatusStyles: Record<TargetStatus, string> = {
  on_track: "bg-success/10 text-success",
  at_risk: "bg-warning/10 text-warning",
  behind: "bg-danger/10 text-danger",
};

export const targetStatusDot: Record<TargetStatus, string> = {
  on_track: "bg-success",
  at_risk: "bg-warning",
  behind: "bg-danger",
};
