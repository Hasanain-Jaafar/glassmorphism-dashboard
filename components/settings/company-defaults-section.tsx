"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_COMPANY_NAME,
  fetchCompanyName,
  saveCompanyName,
} from "@/lib/supabase/company-settings";

/**
 * Fiscal Year Start and an Avg. Sales / Rep Calculation picker used to live
 * here too, but neither was ever wired to anything real — every date
 * calculation in the app (lib/company-performance.ts, lib/target-period.ts)
 * hardcodes a Jan–Dec calendar year and the monthly-sales/active-reps
 * formula, so both controls could only ever mislead whoever touched them.
 * Removed rather than faked. Company Name is real and drives the sidebar
 * wordmark (components/dashboard/sidebar.tsx). Currency isn't shown here at
 * all — it's fixed app-wide (CLAUDE.md §37) with no control over it, so it
 * isn't a "setting" and doesn't belong on a settings form.
 */
export function CompanyDefaultsSection() {
  const [name, setName] = useState(DEFAULT_COMPANY_NAME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompanyName()
      .then((value) => {
        setName(value);
        setLoading(false);
      })
      .catch((error: Error) => {
        toast.error(error.message ?? "Couldn't load company settings");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Company name can't be empty");
      return;
    }
    setSaving(true);
    try {
      await saveCompanyName(trimmed);
      setName(trimmed);
      toast.success("Company defaults saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save company settings"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        Company Defaults
      </h3>
      <p className="mt-0.5 text-xs text-text-tertiary">
        Business rules used across dashboards and reports.
      </p>

      {loading ? (
        <div className="mt-6 max-w-sm">
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        <div className="mt-6 max-w-sm space-y-1.5">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
          />
          <p className="text-xs text-text-tertiary">
            Shown in the sidebar for everyone.
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving…" : "Save Defaults"}
        </Button>
      </div>
    </div>
  );
}
