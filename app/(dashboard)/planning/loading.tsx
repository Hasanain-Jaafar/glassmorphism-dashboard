import { Skeleton } from "@/components/ui/skeleton";

export default function PlanningLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <Skeleton className="h-[75vh] min-h-[520px] w-full rounded-3xl" />
    </div>
  );
}
