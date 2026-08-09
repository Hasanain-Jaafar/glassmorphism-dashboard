import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6 ${className ?? ""}`}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton className="sm:col-span-2 lg:col-span-1" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
          <Skeleton className="mt-6 h-[240px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-3 w-16" />
          <Skeleton className="mt-1 h-8 w-32" />
          <Skeleton className="mt-6 h-2 w-full rounded-full" />
          <Skeleton className="mt-6 h-10 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-48" />
            <div className="mt-6 space-y-4">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-5 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
