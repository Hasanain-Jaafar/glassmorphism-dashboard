"use client";

import { Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import { PlanningBoard } from "@/components/planning/planning-board";
import { useAuth } from "@/components/providers/auth-provider";

export default function PlanningPage() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader title="Planning" />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass-panel flex flex-col items-center rounded-2xl p-10 text-center">
            <Lock className="size-6 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Admins only
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
              The planning board is a manager workspace and isn&apos;t
              visible to sales representatives.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Planning"
          description="A shared canvas for sketching ideas, flows, and rough plans"
        />
      </Reveal>

      <Reveal delay={0.05}>
        <PlanningBoard />
      </Reveal>
    </div>
  );
}
