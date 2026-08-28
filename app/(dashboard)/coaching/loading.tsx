import { Skeleton } from "@/components/ui/skeleton";

export default function CoachingLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <div className="rounded-2xl border border-glass-border bg-glass p-4 shadow-sm backdrop-blur-2xl">
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="mt-3 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="mt-4 h-16 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6">
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6">
            <Skeleton className="h-4 w-24" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-glass-border bg-glass p-5 shadow-sm backdrop-blur-2xl sm:p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-56" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
