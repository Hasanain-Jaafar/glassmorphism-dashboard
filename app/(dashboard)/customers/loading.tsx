import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`glass-panel rounded-2xl p-5 shadow-sm sm:p-6 ${className ?? ""}`}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-full rounded-lg sm:max-w-xs" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>

      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
