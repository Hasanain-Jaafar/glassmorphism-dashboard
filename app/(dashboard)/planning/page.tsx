import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import { PlanningBoard } from "@/components/planning/planning-board";

export const metadata: Metadata = {
  title: "Planning",
};

export default function PlanningPage() {
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
