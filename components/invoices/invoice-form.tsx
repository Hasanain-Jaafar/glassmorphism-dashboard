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

const NONE = "none";

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales rep"),
  dealId: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  amount: z.coerce.number().min(0, "Must be 0 or more"),
  dueDate: z.string(),
});

type FormInput = z.input<typeof invoiceSchema>;
type FormOutput = z.output<typeof invoiceSchema>;

export type InvoiceFormValues = {
  customerId: string;
  salesRepId: string;
  dealId: string | null;
  status: InvoiceStatus;
  amount: number;
  dueDate: string | null;
};

function defaultsFor(
  invoice: Invoice | undefined,
  currentUserId: string,
  isAdmin: boolean,
  prefill?: { customerId?: string; dealId?: string; amount?: number }
): FormInput {
  return {
    customerId: invoice?.customerId ?? prefill?.customerId ?? "",
    salesRepId: invoice?.salesRepId ?? (isAdmin ? "" : currentUserId),
    dealId: invoice?.dealId ?? prefill?.dealId ?? NONE,
    status: invoice?.status ?? "draft",
    amount: invoice?.amount ?? prefill?.amount ?? 0,
    dueDate: invoice?.dueDate ?? "",
  };
}

export function InvoiceForm({
  invoice,
  customers,
  salespeople,
  deals,
  currentUserId,
  isAdmin,
  prefill,
  onSubmit,
}: {
  invoice?: Invoice;
  customers: Customer[];
  salespeople: TeamMember[];
  deals: Deal[];
  currentUserId: string;
  isAdmin: boolean;
  prefill?: { customerId?: string; dealId?: string; amount?: number };
  onSubmit: (values: InvoiceFormValues) => void | Promise<void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(invoiceSchema),
    values: defaultsFor(invoice, currentUserId, isAdmin, prefill),
  });

  async function submit(values: FormOutput) {
    await onSubmit({
      ...values,
      dealId: values.dealId === NONE ? null : values.dealId,
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
        name="customerId"
        render={({ field }) => (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Customer</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    customers.find((c) => c.id === value)?.company ??
                    "Select a customer"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-text-tertiary">
                    No customers yet
                  </p>
                ) : (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-xs text-danger">{errors.customerId.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        control={control}
        name="dealId"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label>Deal (optional)</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => (value === NONE ? "None" : "Linked deal")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {deals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {customers.find((c) => c.id === deal.customerId)?.company ??
                      "Deal"}{" "}
                    · {formatUSD(deal.amount)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

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
          <div className="space-y-1.5">
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

      {isAdmin && (
        <Controller
          control={control}
          name="salesRepId"
          render={({ field }) => (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Sales Rep</Label>
              <Select
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      salespeople.find((p) => p.id === value)?.name ??
                      "Select a sales rep"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {salespeople.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-text-tertiary">
                      No sales representatives yet
                    </p>
                  ) : (
                    salespeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.salesRepId && (
                <p className="text-xs text-danger">{errors.salesRepId.message}</p>
              )}
            </div>
          )}
        />
      )}

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
