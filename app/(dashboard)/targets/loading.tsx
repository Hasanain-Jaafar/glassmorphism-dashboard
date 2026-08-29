import { Skeleton } from "@/components/ui/skeleton";

function TargetCardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-[108px] shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function TargetsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <Skeleton className="h-11 w-56 rounded-xl" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <TargetCardSkeleton />
        <TargetCardSkeleton />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
