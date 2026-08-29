"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { CustomerPulse } from "@/components/customers/customer-pulse";
import { CoachingPulse } from "@/components/coaching/coaching-pulse";
import { cn } from "@/lib/utils";

export function PulseRow() {
  const { isAdmin } = useAuth();

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 lg:gap-6",
        isAdmin && "lg:grid-cols-2"
      )}
    >
      <CustomerPulse />
      {isAdmin && <CoachingPulse />}
    </div>
  );
}
