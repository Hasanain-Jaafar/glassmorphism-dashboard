import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function GlassBlock({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6 ${className ?? ""}`}
    >
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="mt-3 h-7 w-24" />
      <Skeleton className="mt-2.5 h-3 w-16" />
    </div>
  );
}

export default function SalesPersonsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6 lg:gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <GlassBlock>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-3 w-16" />
          <Skeleton className="mt-1 h-8 w-32" />
          <Skeleton className="mt-6 h-2 w-full rounded-full" />
          <Skeleton className="mt-6 h-10 w-full" />
        </GlassBlock>
        <GlassBlock className="lg:col-span-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-3 w-56" />
          <Skeleton className="mt-6 h-[240px] w-full rounded-xl" />
        </GlassBlock>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {[0, 1].map((i) => (
          <GlassBlock key={i}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-40" />
            <div className="mt-6 space-y-4">
              {[0, 1, 2].map((j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
          </GlassBlock>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-1.5 h-3 w-40" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
