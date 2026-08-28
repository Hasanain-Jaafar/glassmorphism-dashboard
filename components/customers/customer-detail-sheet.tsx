"use client";

import { format } from "date-fns";
import {
  CalendarClock,
  FilePenLine,
  FileText,
  Mail,
  MapPin,
  Phone,
  Receipt,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { salespeople } from "@/lib/mock-data";
import {
  avgDealValue,
  lastActivityDate,
  type Customer,
  type CustomerActivityType,
} from "@/lib/customers-data";
import {
  activityTypeIcons,
  activityTypeLabels,
  activityTypeStyles,
  customerStatusLabels,
  customerStatusStyles,
} from "@/components/customers/customer-styles";
import { formatUSD } from "@/lib/format";

const historyTypes: CustomerActivityType[] = [
  "appointment",
  "quotation",
  "deal",
  "invoice",
  "payment",
];

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  onEdit,
  onQuickAction,
}: {
  customer: Customer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onQuickAction: (action: "appointment" | "quotation" | "invoices") => void;
}) {
  if (!customer) return null;

  const salesperson = salespeople.find(
    (p) => p.id === customer.assignedSalespersonId
  );
  const lastActivity = lastActivityDate(customer);
  const sortedActivity = [...customer.activity].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-glass-border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate text-base">
                {customer.company}
              </SheetTitle>
              <SheetDescription className="truncate">
                {customer.contactPerson}
              </SheetDescription>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                customerStatusStyles[customer.status]
              )}
            >
              {customerStatusLabels[customer.status]}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Contact Information
            </p>
            <div className="space-y-1.5 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 shrink-0 text-text-tertiary" />
                <span className="truncate">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0 text-text-tertiary" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0 text-text-tertiary" />
                <span className="truncate">{customer.address}</span>
              </div>
            </div>
          </div>

          {salesperson && (
            <div className="flex items-center gap-3 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {salesperson.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {salesperson.name}
                </p>
                <p className="text-xs text-text-tertiary">
                  Assigned Salesperson
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total Sales" value={formatUSD(customer.totalSales)} />
            <Stat label="Total Deals" value={String(customer.totalDeals)} />
            <Stat
              label="Avg. Deal Value"
              value={formatUSD(avgDealValue(customer))}
            />
            <Stat
              label="Outstanding"
              value={formatUSD(customer.outstandingAmount)}
              tone={customer.outstandingAmount > 0 ? "warning" : undefined}
            />
            <Stat
              label="Last Activity"
              value={lastActivity ? format(new Date(lastActivity), "MMM d, yyyy") : "—"}
              className="col-span-2"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Sales History
            </p>
            <div className="divide-y divide-glass-border/60 overflow-hidden rounded-xl border border-glass-border/60">
              {historyTypes.map((type) => {
                const entries = customer.activity.filter((a) => a.type === type);
                const Icon = activityTypeIcons[type];
                const amount = entries.reduce((sum, e) => sum + (e.amount ?? 0), 0);
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-3 bg-foreground/[0.02] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg",
                          activityTypeStyles[type]
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <span className="text-sm text-text-secondary">
                        {activityTypeLabels[type]}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-medium text-foreground">
                        {entries.length}
                      </span>
                      {amount > 0 && (
                        <span className="ml-1.5 text-xs text-text-tertiary">
                          {formatUSD(amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Activity Timeline
            </p>
            {sortedActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-tertiary">
                No activity logged yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {sortedActivity.map((entry) => {
                  const Icon = activityTypeIcons[entry.type];
                  return (
                    <li key={entry.id} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                          activityTypeStyles[entry.type]
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-secondary">
                          {entry.label}
                        </p>
                        <p className="mt-0.5 text-xs text-text-tertiary">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                          {entry.amount ? ` · ${formatUSD(entry.amount)}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-glass-border pt-5">
            <p className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <FilePenLine className="size-3.5" />
                Edit Customer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuickAction("appointment")}
              >
                <CalendarClock className="size-3.5" />
                Create Appointment
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuickAction("quotation")}
              >
                <FileText className="size-3.5" />
                Create Quotation
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQuickAction("invoices")}
              >
                <Receipt className="size-3.5" />
                View Invoices
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone?: "warning";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-3",
        className
      )}
    >
      <p className="text-xs text-text-tertiary">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          tone === "warning" ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
