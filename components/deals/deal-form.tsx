"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { Deal, DealStatus } from "@/lib/supabase/deals";
import type { Quotation } from "@/lib/supabase/quotations";
import type { Invoice } from "@/lib/supabase/invoices";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import { cn } from "@/lib/utils";
import { dealStatusLabels, dealStatusStyles } from "@/components/deals/deal-styles";
import { formatUSD } from "@/lib/format";

const dealSchema = z.object({
  quotationId: z.string().min(1, "Select an accepted quotation"),
  status: z.enum(["open", "won", "lost"]),
  amount: z.coerce.number().min(0, "Must be 0 or more"),
});

type FormInput = z.input<typeof dealSchema>;
type FormOutput = z.output<typeof dealSchema>;

export type DealFormValues = {
  quotationId: string;
  status: DealStatus;
  amount: number;
};

function defaultsFor(deal: Deal | undefined): FormInput {
  return {
    quotationId: deal?.quotationId ?? "",
    status: deal?.status ?? "open",
    amount: deal?.amount ?? 0,
  };
}

export function DealForm({
  deal,
  customers,
  salespeople,
  quotations,
  invoices,
  onSubmit,
}: {
  deal?: Deal;
  customers: Customer[];
  salespeople: TeamMember[];
  /** Should already be filtered to status === "accepted" by the caller. */
  quotations: Quotation[];
  /** Used only to detect whether this deal already has an invoice, locking its status. */
  invoices: Invoice[];
  onSubmit: (values: DealFormValues) => void | Promise<void>;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(dealSchema),
    values: defaultsFor(deal),
  });

  const watchedQuotationId = watch("quotationId");
  const watchedAmount = watch("amount");
  const customersById = new Map(customers.map((c) => [c.id, c]));
  const salespeopleById = new Map(salespeople.map((p) => [p.id, p]));
  const selectedQuotation = quotations.find((q) => q.id === watchedQuotationId);
  const selectedCustomer = selectedQuotation
    ? customersById.get(selectedQuotation.customerId)
    : undefined;
  const selectedRep = selectedQuotation
    ? salespeopleById.get(selectedQuotation.salesRepId)
    : undefined;
  const hasLinkedInvoice = deal ? invoices.some((i) => i.dealId === deal.id) : false;

  async function submit(values: FormOutput) {
    await onSubmit(values);
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Controller
        control={control}
        name="quotationId"
        render={({ field }) =>
          hasLinkedInvoice ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Quotation</Label>
              <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
                {selectedCustomer?.company ?? "Unknown customer"} ·{" "}
                {selectedQuotation ? formatUSD(selectedQuotation.total) : "—"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Quotation</Label>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (!value) return;
                  field.onChange(value);
                  const quotation = quotations.find((q) => q.id === value);
                  if (quotation) setValue("amount", quotation.total);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      const quotation = quotations.find((q) => q.id === value);
                      if (!quotation) return "Select an accepted quotation";
                      const customer = customersById.get(quotation.customerId);
                      return `${customer?.company ?? "Unknown customer"} · ${formatUSD(quotation.total)}`;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {quotations.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-text-tertiary">
                      No available quotations — accept one first, or check for
                      accepted quotations that already have a deal.
                    </p>
                  ) : (
                    quotations.map((quotation) => (
                      <SelectItem key={quotation.id} value={quotation.id}>
                        {(customersById.get(quotation.customerId)?.company ??
                          "Unknown customer") +
                          " · " +
                          formatUSD(quotation.total)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.quotationId && (
                <p className="text-xs text-danger">{errors.quotationId.message}</p>
              )}
            </div>
          )
        }
      />

      <div className="space-y-1.5">
        <Label>Customer</Label>
        <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
          {selectedCustomer?.company ?? "—"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Sales Rep</Label>
        <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
          {selectedRep?.name ?? "—"}
        </p>
      </div>

      {hasLinkedInvoice ? (
        <div className="space-y-1.5">
          <Label>Amount</Label>
          <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
            {formatUSD(Number(watchedAmount))}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="d-amount">Amount</Label>
          <Input id="d-amount" type="number" min={0} {...register("amount")} />
          {errors.amount && (
            <p className="text-xs text-danger">{errors.amount.message}</p>
          )}
        </div>
      )}

      <Controller
        control={control}
        name="status"
        render={({ field }) =>
          hasLinkedInvoice ? (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <span
                className={cn(
                  "flex h-8 w-fit items-center rounded-full px-2.5 text-xs font-medium",
                  dealStatusStyles[field.value as DealStatus]
                )}
              >
                {dealStatusLabels[field.value as DealStatus]}
              </span>
              <p className="text-xs text-text-tertiary">
                Locked — this deal already has an invoice.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={field.value}
                onValueChange={(value) =>
                  value && field.onChange(value as DealStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => dealStatusLabels[value as DealStatus] ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(dealStatusLabels) as DealStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {dealStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        }
      />

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          {hasLinkedInvoice ? "Close" : "Cancel"}
        </DialogClose>
        {!hasLinkedInvoice && (
          <Button type="submit" disabled={isSubmitting}>
            {deal ? "Save Changes" : "Create Deal"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
