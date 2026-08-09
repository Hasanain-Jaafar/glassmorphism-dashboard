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

function IndividualTargetCardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <IndividualTargetCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
