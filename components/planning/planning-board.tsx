"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// tldraw touches window/document/IndexedDB at load time, so it can't be
// server-rendered.
const TldrawCanvas = dynamic(
  () => import("@/components/planning/tldraw-canvas").then((m) => m.TldrawCanvas),
  {
    ssr: false,
    loading: () => <Skeleton className="size-full" />,
  }
);

export function PlanningBoard() {
  return (
    <div className="relative h-[75vh] min-h-[520px] w-full overflow-hidden rounded-3xl border border-glass-border shadow-sm">
      <TldrawCanvas />
    </div>
  );
}
