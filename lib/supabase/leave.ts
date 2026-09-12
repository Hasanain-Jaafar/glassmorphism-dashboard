import { createClient } from "@/lib/supabase/client";
import { countWorkingDaysInclusive } from "@/lib/working-days";

export type LeaveType = "vacation" | "sick" | "unpaid" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  unpaid: "Unpaid",
  other: "Other",
};

/** Shown as the entitlement editor's starting value for a rep with no saved row yet — matches the column default in migration 39. */
export const DEFAULT_VACATION_DAYS = 20;

export type LeaveRequest = {
  id: string;
  salespersonId: string;
  leaveType: LeaveType;
  /** "yyyy-MM-dd" */
  startDate: string;
  /** "yyyy-MM-dd" */
  endDate: string;
  /** Working days in the range, per the Sat-Thu work week (lib/working-days.ts). */
  days: number;
  reason: string | null;
  status: LeaveStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

const leaveRequestColumns =
  "id, salesperson_id, leave_type, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_note, created_at";

function mapLeaveRequest(row: {
  id: string;
  salesperson_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}): LeaveRequest {
  return {
    id: row.id,
    salespersonId: row.salesperson_id,
    leaveType: row.leave_type as LeaveType,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    reason: row.reason,
    status: row.status as LeaveStatus,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  };
}

/**
 * Every leave request visible to the signed-in user. RLS does the scoping:
 * an admin gets every request, a sales rep gets their own (any status) plus
 * every *approved* request company-wide — that's what the shared "who's
 * out" team calendar renders for a rep who isn't an admin.
 */
export async function fetchLeaveRequests(year?: number): Promise<LeaveRequest[]> {
  const supabase = createClient();
  let query = supabase
    .from("leave_requests")
    .select(leaveRequestColumns)
    .order("start_date", { ascending: false });
  if (year !== undefined) {
    query = query.gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapLeaveRequest);
}

export async function createLeaveRequest(input: {
  salespersonId: string;
  leaveType: LeaveType;
  /** "yyyy-MM-dd" */
  startDate: string;
  /** "yyyy-MM-dd" */
  endDate: string;
  reason?: string;
  /** Admin logging leave on a rep's behalf submits it already decided; a rep's own request always lands as "pending" (also enforced by leave_requests_insert's RLS check). */
  status?: LeaveStatus;
}): Promise<void> {
  const supabase = createClient();
  const days = countWorkingDaysInclusive(
    new Date(`${input.startDate}T00:00:00`),
    new Date(`${input.endDate}T00:00:00`)
  );
  const status = input.status ?? "pending";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("leave_requests").insert({
    salesperson_id: input.salespersonId,
    leave_type: input.leaveType,
    start_date: input.startDate,
    end_date: input.endDate,
    days,
    reason: input.reason || null,
    status,
    reviewed_by: status === "pending" ? null : user?.id ?? null,
    reviewed_at: status === "pending" ? null : new Date().toISOString(),
  });
  if (error) throw error;
}

/** Admin-only per RLS — approves or rejects a pending request. */
export async function reviewLeaveRequest(
  id: string,
  status: "approved" | "rejected",
  reviewNote?: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** A rep cancelling their own still-pending request, or an admin deleting any request — RLS enforces both. */
export async function cancelLeaveRequest(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leave_requests").delete().eq("id", id);
  if (error) throw error;
}

/** salesperson_id -> annual vacation day allowance for one year. A rep with no saved row isn't in the map — callers fall back to DEFAULT_VACATION_DAYS. */
export async function fetchLeaveEntitlements(year: number): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leave_entitlements")
    .select("salesperson_id, vacation_days")
    .eq("year", year);
  if (error) throw error;

  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    result[row.salesperson_id] = Number(row.vacation_days);
  }
  return result;
}

/** Admin-only per RLS. */
export async function saveLeaveEntitlement(
  salespersonId: string,
  year: number,
  vacationDays: number
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("leave_entitlements")
    .upsert(
      { salesperson_id: salespersonId, year, vacation_days: vacationDays },
      { onConflict: "salesperson_id,year" }
    );
  if (error) throw error;
}

export type LeaveUsage = Record<LeaveType, number>;

/** Approved days used, by leave type, for one salesperson within a year — the basis for a balance card's "used" / "remaining". */
export function summarizeLeaveUsage(
  requests: LeaveRequest[],
  salespersonId: string,
  year: number
): LeaveUsage {
  const usage: LeaveUsage = { vacation: 0, sick: 0, unpaid: 0, other: 0 };
  for (const r of requests) {
    if (r.salespersonId !== salespersonId) continue;
    if (r.status !== "approved") continue;
    if (new Date(`${r.startDate}T00:00:00`).getFullYear() !== year) continue;
    usage[r.leaveType] += r.days;
  }
  return usage;
}

/**
 * Live updates for leave_requests (migration 41 enables the Realtime
 * publication) — fires `onChange` on any insert/update/delete visible to
 * this session's RLS, e.g. a rep's request flipping to approved/rejected,
 * or an admin seeing a brand-new submission. Callers just refetch on
 * change rather than reconciling payloads, since a full leave-requests
 * fetch is cheap and every derived stat is recomputed from it anyway.
 */
export function subscribeToLeaveRequests(onChange: () => void): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel("leave-requests-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "leave_requests" },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Every other *approved* request this same person had in the same calendar
 * month as `request` (excluding `request` itself) — decision-support for a
 * reviewer: "they already took 3 days of sick leave, Mar 4-6" changes
 * whether a new request should be approved. Returns the full requests (not
 * just a day total) so a reviewer sees the actual dates, not just an amount.
 */
export function otherLeaveThisMonth(
  requests: LeaveRequest[],
  request: LeaveRequest
): LeaveRequest[] {
  const anchor = new Date(`${request.startDate}T00:00:00`);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  return requests.filter((r) => {
    if (r.id === request.id) return false;
    if (r.salespersonId !== request.salespersonId) return false;
    if (r.status !== "approved") return false;
    const d = new Date(`${r.startDate}T00:00:00`);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** Every approved request whose range touches `date` — what the team calendar and "out today" count render. */
export function leaveOnDate(requests: LeaveRequest[], date: Date): LeaveRequest[] {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return requests.filter(
    (r) => r.status === "approved" && r.startDate <= iso && r.endDate >= iso
  );
}
