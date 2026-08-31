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
import type { Invoice, InvoiceStatus } from "@/lib/supabase/invoices";
import type { Deal } from "@/lib/supabase/deals";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import { invoiceStatusLabels } from "@/components/invoices/invoice-styles";
import { formatUSD } from "@/lib/format";

const invoiceSchema = z.object({
  dealId: z.string().min(1, "Select a won deal"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  amount: z.coerce.number().min(0, "Must be 0 or more"),
  dueDate: z.string(),
});

type FormInput = z.input<typeof invoiceSchema>;
type FormOutput = z.output<typeof invoiceSchema>;

export type InvoiceFormValues = {
  dealId: string;
  status: InvoiceStatus;
  amount: number;
  dueDate: string | null;
};

function defaultsFor(invoice: Invoice | undefined): FormInput {
  return {
    dealId: invoice?.dealId ?? "",
    status: invoice?.status ?? "draft",
    amount: invoice?.amount ?? 0,
    dueDate: invoice?.dueDate ?? "",
  };
}

export function InvoiceForm({
  invoice,
  customers,
  salespeople,
  deals,
  onSubmit,
}: {
  invoice?: Invoice;
  customers: Customer[];
  salespeople: TeamMember[];
  /** Should already be filtered to status === "won" by the caller. */
  deals: Deal[];
  onSubmit: (values: InvoiceFormValues) => void | Promise<void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(invoiceSchema),
    values: defaultsFor(invoice),
  });

  const watchedDealId = watch("dealId");
  const customersById = new Map(customers.map((c) => [c.id, c]));
  const salespeopleById = new Map(salespeople.map((p) => [p.id, p]));
  const selectedDeal = deals.find((d) => d.id === watchedDealId);
  const selectedCustomer = selectedDeal
    ? customersById.get(selectedDeal.customerId)
    : undefined;
  const selectedRep = selectedDeal
    ? salespeopleById.get(selectedDeal.salesRepId)
    : undefined;

  async function submit(values: FormOutput) {
    await onSubmit({
      ...values,
      dueDate: values.dueDate === "" ? null : values.dueDate,
    });
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Controller
        control={control}
        name="dealId"
        render={({ field }) => (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Deal</Label>
            <Select
              value={field.value}
              onValueChange={(value) => {
                if (!value) return;
                field.onChange(value);
                const deal = deals.find((d) => d.id === value);
                if (deal) setValue("amount", deal.amount);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    const deal = deals.find((d) => d.id === value);
                    if (!deal) return "Select a won deal";
                    const customer = customersById.get(deal.customerId);
                    return `${customer?.company ?? "Unknown customer"} · ${formatUSD(deal.amount)}`;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {deals.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-text-tertiary">
                    No won deals yet.
                  </p>
                ) : (
                  deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {(customersById.get(deal.customerId)?.company ??
                        "Unknown customer") +
                        " · " +
                        formatUSD(deal.amount)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.dealId && (
              <p className="text-xs text-danger">{errors.dealId.message}</p>
            )}
          </div>
        )}
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

      <div className="space-y-1.5">
        <Label htmlFor="i-amount">Amount</Label>
        <Input id="i-amount" type="number" min={0} {...register("amount")} />
        {errors.amount && (
          <p className="text-xs text-danger">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="i-due">Due Date (optional)</Label>
        <Input id="i-due" type="date" {...register("dueDate")} />
      </div>

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Status</Label>
            <Select
              value={field.value}
              onValueChange={(value) =>
                value && field.onChange(value as InvoiceStatus)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    invoiceStatusLabels[value as InvoiceStatus] ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(invoiceStatusLabels) as InvoiceStatus[]).map(
                  (status) => (
                    <SelectItem key={status} value={status}>
                      {invoiceStatusLabels[status]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {invoice ? "Save Changes" : "Create Invoice"}
        </Button>
      </DialogFooter>
    </form>
  );
}
