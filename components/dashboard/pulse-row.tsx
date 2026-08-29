"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { CustomerPulse } from "@/components/customers/customer-pulse";
import { CoachingPulse } from "@/components/coaching/coaching-pulse";
import { cn } from "@/lib/utils";

export function PulseRow() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <CustomerPulse />
      <CoachingPulse />
    </div>
  );
}
