"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/supabase/team";
import type { LeaveUsage } from "@/lib/supabase/leave";

/**
 * Admin-only roster of every rep's annual vacation allowance vs. what
 * they've actually used — the one place the entitlement itself gets edited
 * (inline, save-on-blur, same lightweight pattern as a spreadsheet cell).
 * Sick/unpaid/other have no allowance to edit, just a used-day count, since
 * nothing caps them in v1.
 */
export function LeaveBalancesTable({
  members,
  entitlements,
  usageByMember,
  onSaveEntitlement,
}: {
  members: TeamMember[];
  entitlements: Record<string, number>;
  usageByMember: Record<string, LeaveUsage>;
  onSaveEntitlement: (salespersonId: string, vacationDays: number) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function commit(salespersonId: string, raw: string) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      setDrafts((d) => ({ ...d, [salespersonId]: "" }));
      return;
    }
    setSavingId(salespersonId);
    try {
      await onSaveEntitlement(salespersonId, value);
      setDrafts((d) => ({ ...d, [salespersonId]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that entitlement");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="glass-panel overflow-hidden rounded-2xl shadow-sm">
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h3 className="text-sm font-semibold text-foreground sm:text-base">
          Leave Balances
        </h3>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Annual vacation allowance vs. days used this year — click a number to edit
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-glass-border">
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-text-tertiary uppercase first:pl-5">
                Team Member
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
                Vacation Allowance
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
                Used
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
                Remaining
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase">
                Sick
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wide text-text-tertiary uppercase last:pr-5">
                Unpaid / Other
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const entitled = entitlements[member.id] ?? 20;
              const usage = usageByMember[member.id] ?? {
                vacation: 0,
                sick: 0,
                unpaid: 0,
                other: 0,
              };
              const remaining = Math.max(entitled - usage.vacation, 0);
              const draft = drafts[member.id];

              return (
                <tr
                  key={member.id}
                  className="border-b border-glass-border/60 transition-colors last:border-0 hover:bg-foreground/[0.03]"
                >
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {member.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatarUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          member.initials
                        )}
                      </div>
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Input
                      type="number"
                      min={0}
                      className={cn(
                        "mx-auto h-7 w-16 text-center tabular-nums",
                        savingId === member.id && "opacity-50"
                      )}
                      value={draft ?? entitled}
                      disabled={savingId === member.id}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [member.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        if (Number(e.target.value) !== entitled) commit(member.id, e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-text-secondary">
                    {usage.vacation}d
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums font-medium text-foreground">
                    {remaining}d
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums text-text-secondary">
                    {usage.sick}d
                  </td>
                  <td className="px-4 py-3 pr-5 text-center tabular-nums text-text-secondary">
                    {usage.unpaid}d / {usage.other}d
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
